import clientPromise from './lib/mongodb.js';
import { AnyBulkWriteOperation } from 'mongodb';
import { sendEmail } from './lib/email.js';

const ADMIN_EMAIL = "mytoulouse@gmail.com";

const formatDate = (d: string) => d ? d.split('-').reverse().join('/') : '';

const PROPERTIES_CONFIG = [
  { id: 'naturel',    calendarId: '319da3c78547e5913af3b1fed606645b9ead9b92795482061bd440d47fc23d65@group.calendar.google.com' },
  { id: 'morhange',   calendarId: '4792a509f033d8033b457efd42b98865b31a67d28dde23a1284f93096942385c@group.calendar.google.com' },
  { id: 'scandinave', calendarId: '4f94cd0632de6ac44b4927d9783d73faba95e7ab54b506d60f587b46eaf54119@group.calendar.google.com' },
  { id: 'spa',        calendarId: '7cd6b0882eec615ff72afba17915838e642c24c06ba1a96eee824da01b40cb0b@group.calendar.google.com' },
];

export default async function handler(req: any, res: any) {
  const isScheduledRun = req.query.schedule === 'true';
  const now = new Date();
  const todayStr = new Date(now.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' })).toISOString().split('T')[0];

  try {
    // ── Shared connection pool (no new MongoClient) ──
    const client = await clientPromise;
    const db = client.db("zenclean");
    const missionsCol = db.collection("missions");
    const cleanersCol = db.collection("cleaners");
    const emailsCol   = db.collection("emails");

    // ── 1. Fetch all 4 iCal feeds in parallel with 12s timeout ──
    const calendarData = await Promise.all(
      PROPERTIES_CONFIG.map(async (prop) => {
        try {
          const url = `https://calendar.google.com/calendar/ical/${encodeURIComponent(prop.calendarId)}/public/basic.ics`;
          const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
          if (!res.ok) {
            console.warn(`[iCal] ${prop.id} : réponse HTTP ${res.status} — synchro ignorée`);
            return { prop, events: [], error: `HTTP ${res.status}` };
          }
          const text = await res.text();
          // Unfolding iCal : les longues lignes sont repliées avec \r\n + espace/tab
          // Sans ça, les UIDs longs sont tronqués et ne matchent plus les missions en base
          const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
          const events = unfolded.split('BEGIN:VEVENT').slice(1);
          console.log(`[iCal] ${prop.id} : ${events.length} événements récupérés`);
          return { prop, events, error: null };
        } catch (e: any) {
          console.warn(`[iCal] ${prop.id} : erreur fetch (${e.message}) — synchro ignorée`);
          return { prop, events: [], error: e.message };
        }
      })
    );

    // ── Sécurité : si le total des événements iCal est anormalement bas (< 2 pour
    // toutes les propriétés confondues), on abandonne la synchro pour éviter
    // de supprimer des missions à cause d'une réponse Google dégradée ──
    const totalEvents = calendarData.reduce((sum, c) => sum + c.events.length, 0);
    const propertiesOk = calendarData.filter(c => c.events.length > 0).length;
    console.log(`[iCal] Total : ${totalEvents} événements sur ${propertiesOk}/${PROPERTIES_CONFIG.length} propriétés`);
    if (totalEvents < 2 && propertiesOk === 0) {
      console.error('[iCal] Aucun événement récupéré sur aucune propriété — synchro annulée par sécurité');
      return res.status(200).json({ success: true, skipped: true, reason: 'no_ical_data' });
    }

    // ── 2. Load DB data in parallel — uniquement les champs nécessaires ──
    const [allCleaners, existingMissions] = await Promise.all([
      cleanersCol.find({ email: { $exists: true, $ne: '' } }).toArray(),
      missionsCol.find({}, { projection: { id: 1, calendarEventId: 1, date: 1, status: 1, cleanerId: 1, notified: 1, propertyId: 1 } }).toArray(),
    ]);

    const existingMap = new Map(existingMissions.map(m => [m.id, m]));
    // Index secondaire : retrouver une mission existante par propertyId+date
    // Utile si l'UID iCal change légèrement d'une exécution à l'autre (encoding, retour à la ligne…)
    // pour éviter la suppression+recréation qui génère des mails Annulation+Nouveau.
    const existingBySlot = new Map(existingMissions.filter(m => m.calendarEventId).map(m => [`${m.propertyId}|${m.date}`, m]));
    const bulkOps: AnyBulkWriteOperation[] = [];
    const newMissionsForNotif: any[] = [];
    const currentUids = new Set<string>();

    for (const { prop, events } of calendarData) {
      for (const eventStr of events) {
        const dtEndMatch = eventStr.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);
        const uidMatch   = eventStr.match(/UID:(.*)/);
        if (!dtEndMatch || !uidMatch) continue;

        const raw  = dtEndMatch[1];
        const date = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
        const uid  = uidMatch[1].trim();
        currentUids.add(uid); // toujours enregistrer l'UID, même pour les événements passés

        if (date < todayStr) continue;

        const missionId = `cal-${uid}`;
        const existing  = existingMap.get(missionId);

        if (!existing) {
          // Vérifier si une mission iCal existe déjà pour ce créneau (propertyId+date)
          // avec un UID différent — dans ce cas on met à jour l'UID plutôt que de supprimer+recréer
          const slotKey = `${prop.id}|${date}`;
          const existingByDate = existingBySlot.get(slotKey);
          if (existingByDate && existingByDate.calendarEventId !== uid) {
            // L'UID a changé mais c'est la même réservation : on migre l'UID en base
            // pour éviter la suppression lors de la phase de nettoyage + l'email Annulation/Nouveau
            currentUids.add(existingByDate.calendarEventId); // protéger l'ancienne mission de la suppression
            bulkOps.push({ updateOne: { filter: { id: existingByDate.id }, update: { $set: { calendarEventId: uid, id: missionId } } } });
            // Mettre à jour la map pour la phase de suppression
            existingMap.set(missionId, { ...existingByDate, calendarEventId: uid, id: missionId });
          } else {
            const m = { id: missionId, calendarEventId: uid, propertyId: prop.id, date, status: 'pending', notes: '', isManual: false };
            bulkOps.push({ insertOne: { document: m } });
            newMissionsForNotif.push(m);
          }
        } else if (existing.date !== date) {
          // Ne jamais écraser cleanerId/status lors d'un changement de date
          bulkOps.push({ updateOne: { filter: { id: missionId }, update: { $set: { date } } } });
        }
      }
    }

    // ── 3. Suppression des missions annulées (réservation disparue du calendrier) ──
    // Protection : on ne supprime des missions que pour les propriétés dont l'iCal
    // a effectivement retourné des données. Si l'iCal d'une propriété est vide ou en erreur,
    // on ne touche pas à ses missions pour éviter les faux positifs.
    const propertiesWithData = new Set(
      calendarData.filter(c => c.events.length > 0).map(c => c.prop.id)
    );

    const cancelledMissions = existingMissions.filter(m =>
      m.calendarEventId &&
      m.date >= todayStr &&
      !currentUids.has(m.calendarEventId) &&
      m.status !== 'completed' &&
      propertiesWithData.has(m.propertyId)   // ← uniquement si l'iCal de cette propriété a répondu
    );

    if (cancelledMissions.length > 0) {
      const cancellationKeys = cancelledMissions
        .filter(m => m.cleanerId)
        .map(m => `mission-cancelled-slot-${m.propertyId}-${m.date}-${m.cleanerId}`);

      const sentCancelKeys = new Set<string>(
        cancellationKeys.length > 0
          ? (await emailsCol.find({ dedupKey: { $in: cancellationKeys } }, { projection: { dedupKey: 1 } }).toArray()).map(e => e.dedupKey).filter(Boolean)
          : []
      );

      const cancellationJobs: any[] = [];
      for (const m of cancelledMissions) {
        if (m.cleanerId) {
          const agent = allCleaners.find(c => c.id === m.cleanerId);
          if (agent?.email) {
            const key = `mission-cancelled-slot-${m.propertyId}-${m.date}-${agent.id}`;
            if (!sentCancelKeys.has(key)) {
              cancellationJobs.push({
                to: agent.email,
                subject: `[ANNULATION] Réservation annulée : ${(m.propertyId || '').toUpperCase()} - ${formatDate(m.date)}`,
                html: `<p>Bonjour ${agent.name},</p>
                  <p>La réservation suivante a été <strong>annulée par le client</strong>. Votre mission est donc supprimée :</p>
                  <ul>
                    <li><strong>Propriété :</strong> ${(m.propertyId || '').toUpperCase()}</li>
                    <li><strong>Date prévue :</strong> ${formatDate(m.date)}</li>
                  </ul>
                  <p>Merci de ne plus vous déplacer pour cette intervention.</p>`,
                propertyId: m.propertyId,
                key
              });
            }
          }
        }
      }

      if (cancellationJobs.length > 0) {
        const results = await Promise.all(cancellationJobs.map(async (job) => {
          try {
            const r = await sendEmail(job.to, job.subject, job.html);
            return { ...job, ok: r?.ok };
          } catch { return { ...job, ok: false }; }
        }));
        const sent = results.filter(r => r.ok);
        if (sent.length > 0) {
          await Promise.all(sent.map(j =>
            emailsCol.updateOne(
              { dedupKey: j.key },
              { $setOnInsert: { to: j.to, subject: j.subject, propertyId: j.propertyId, dedupKey: j.key, sentAt: new Date() } },
              { upsert: true }
            )
          ));
        }
      }

      const toDelete = cancelledMissions.map(m => m.id);
      bulkOps.push({ deleteMany: { filter: { id: { $in: toDelete } } } });
    }

    if (bulkOps.length > 0) await missionsCol.bulkWrite(bulkOps);

    // ── 4. Email notifications (scheduled run only) ──
    if (isScheduledRun) {
      // ── Un seul find pour toutes les missions nécessaires aux notifications ──
      // On recharge depuis la base pour avoir l'état après le bulkWrite ci-dessus
      const allMissionsForNotif = await missionsCol.find(
        {}, { projection: { id: 1, propertyId: 1, date: 1, status: 1, cleanerId: 1 } }
      ).toArray();

      const in7 = new Date(todayStr + 'T12:00:00'); // heure Paris pour éviter décalage DST
      in7.setDate(in7.getDate() + 7);
      const in7Str = `${in7.getFullYear()}-${String(in7.getMonth()+1).padStart(2,'0')}-${String(in7.getDate()).padStart(2,'0')}`;

      const upcomingMissions  = allMissionsForNotif.filter(m => m.date >= todayStr);
      const overdueMissions   = allMissionsForNotif.filter(m => m.date < todayStr && m.status !== 'completed');

      // ── Clé de dédup stable basée sur propertyId+date (indépendante de l'id interne
      //    de la mission qui peut changer si la mission est recréée suite à un changement d'UID iCal)
      const newMissionIds = new Set(newMissionsForNotif.map((m: any) => m.id));
      const trulyNewMissions = upcomingMissions.filter(m => newMissionIds.has(m.id));

      // Charge uniquement les dedupKeys pertinentes (missions à venir)
      const relevantKeys = upcomingMissions.flatMap(m =>
        allCleaners
          .filter(c => c.assignedProperties?.includes(m.propertyId))
          .map(c => `new-mission-slot-${m.propertyId}-${m.date}-${c.id}`)
      );

      const sentKeys = new Set<string>(
        relevantKeys.length > 0
          ? (await emailsCol.find({ dedupKey: { $in: relevantKeys } }, { projection: { dedupKey: 1 } }).toArray()).map(e => e.dedupKey).filter(Boolean)
          : []
      );

      const emailJobs: any[] = [];

      // Nouvelles missions : on n'envoie QUE pour les missions réellement créées lors
      // de cette exécution (trulyNewMissions), avec une clé stable propertyId+date+agentId.
      // Cela évite les doublons si la mission est supprimée/recréée avec un ID différent.
      for (const m of trulyNewMissions) {
        for (const agent of allCleaners.filter(c => c.assignedProperties?.includes(m.propertyId))) {
          const key = `new-mission-slot-${m.propertyId}-${m.date}-${agent.id}`;
          if (!sentKeys.has(key)) {
            emailJobs.push({ to: agent.email, subject: `[NOUVEAU] Mission : ${m.propertyId.toUpperCase()} (${formatDate(m.date)})`, html: `<p>Bonjour ${agent.name}, une mission est disponible pour ${m.propertyId.toUpperCase()} le ${formatDate(m.date)}.</p>`, propertyId: m.propertyId, key });
            sentKeys.add(key);
          }
        }
      }

      // Rappels & alertes (utilise upcomingMissions déjà en mémoire)
      // Les clés utilisent propertyId+date (et non m.id) pour rester stables même
      // si la mission est recréée avec un nouvel identifiant interne.
      for (const m of upcomingMissions) {
        if (m.date === todayStr && m.status === 'assigned' && m.cleanerId) {
          const cleaner = allCleaners.find(c => c.id === m.cleanerId);
          if (cleaner?.email) {
            const key = `reminder-j0-${m.propertyId}-${todayStr}-${m.cleanerId}`;
            if (!sentKeys.has(key)) {
              emailJobs.push({ to: cleaner.email, subject: `[RAPPEL] Mission aujourd'hui : ${m.propertyId.toUpperCase()}`, html: `<p>Bonjour ${cleaner.name}, rappel de votre mission aujourd'hui.</p>`, propertyId: m.propertyId, key });
              sentKeys.add(key);
            }
          }
        }
        if (m.date === in7Str && m.status === 'pending') {
          for (const agent of allCleaners.filter(c => c.assignedProperties?.includes(m.propertyId))) {
            const key = `alert-j7-${m.propertyId}-${in7Str}-${agent.id}`;
            if (!sentKeys.has(key)) {
              emailJobs.push({ to: agent.email, subject: `[URGENT J-7] Mission libre : ${m.propertyId.toUpperCase()}`, html: `<p>La mission du ${formatDate(m.date)} n'est toujours pas assignée.</p>`, propertyId: m.propertyId, key });
              sentKeys.add(key);
            }
          }
        }
      }

      // Missions en retard (utilise overdueMissions déjà en mémoire)
      for (const m of overdueMissions) {
        const key = `overdue-alert-${m.propertyId}-${m.date}`;
        if (!sentKeys.has(key)) {
          emailJobs.push({ to: ADMIN_EMAIL, subject: `[ALERTE RETARD] Mission non traitée : ${m.propertyId.toUpperCase()}`, html: `<p>Mission du <strong>${formatDate(m.date)}</strong> pour <strong>${m.propertyId.toUpperCase()}</strong> en retard. Statut : ${m.status}.</p>`, propertyId: m.propertyId, key });
          sentKeys.add(key);
        }
      }

      // Send all emails in parallel, log successes
      const results = await Promise.all(emailJobs.map(async (job) => {
        try {
          const r = await sendEmail(job.to, job.subject, job.html);
          return { ...job, ok: r?.ok };
        } catch { return { ...job, ok: false }; }
      }));

      const sent = results.filter(r => r.ok);
      if (sent.length > 0) {
        // Insertion avec upsert sur dedupKey pour garantir l'unicité même en cas de race condition
        await Promise.all(sent.map(j =>
          emailsCol.updateOne(
            { dedupKey: j.key },
            { $setOnInsert: { to: j.to, subject: j.subject, propertyId: j.propertyId, dedupKey: j.key, sentAt: new Date() } },
            { upsert: true }
          )
        ));
      }
    }

    return res.status(200).json({ 
      success: true,
      ical: calendarData.map(c => ({ prop: c.prop.id, events: c.events.length, error: c.error || null }))
    });
  } catch (err: any) {
    console.error("Cron error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}