import clientPromise from './lib/mongodb.js';
import { AnyBulkWriteOperation } from 'mongodb';
import { sendEmail } from './lib/email.js';

const ADMIN_EMAIL = "mytoulhouse@gmail.com";
const DEDUPLICATION_LOOKBACK_DAYS = 10;

const PROPERTIES_CONFIG = [
  { id: 'naturel',    calendarId: '319da3c78547e5913af3b1fed606645b9ead9b92795482061bd440d47fc23d65@group.calendar.google.com' },
  { id: 'morhange',   calendarId: '4792a509f033d8033b457efd42b98865b31a67d28dde23a1284f93096942385c@group.calendar.google.com' },
  { id: 'scandinave', calendarId: '4f94cd0632de6ac44b4927d9783d73faba95e7ab54b506d60f587b46eaf54119@group.calendar.google.com' },
  { id: 'spa',        calendarId: '7cd6b0882eec615ff72afba17915838e642c24c06ba1a96eee824da01b40cb0b@group.calendar.google.com' },
];

export default async function handler(req: any, res: any) {
  const isScheduledRun = req.query.schedule === 'true';
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // ── Shared connection pool (no new MongoClient) ──
    const client = await clientPromise;
    const db = client.db("zenclean");
    const missionsCol = db.collection("missions");
    const cleanersCol = db.collection("cleaners");
    const emailsCol   = db.collection("emails");

    // ── 1. Fetch all 4 iCal feeds in parallel with 8s timeout ──
    const calendarData = await Promise.all(
      PROPERTIES_CONFIG.map(async (prop) => {
        try {
          const url = `https://calendar.google.com/calendar/ical/${encodeURIComponent(prop.calendarId)}/public/basic.ics`;
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) return { prop, events: [] };
          const text = await res.text();
          return { prop, events: text.split('BEGIN:VEVENT').slice(1) };
        } catch {
          return { prop, events: [] };
        }
      })
    );

    // ── 2. Load DB data in parallel ──
    const [allCleaners, existingMissions] = await Promise.all([
      cleanersCol.find({ email: { $exists: true, $ne: '' } }).toArray(),
      missionsCol.find({}).toArray(),
    ]);

    const existingMap = new Map(existingMissions.map(m => [m.id, m]));
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
        currentUids.add(uid);

        if (date < todayStr) continue;

        const missionId = `cal-${uid}`;
        const existing  = existingMap.get(missionId);

        if (!existing) {
          const m = { id: missionId, calendarEventId: uid, propertyId: prop.id, date, status: 'pending', notes: '', isManual: false };
          bulkOps.push({ insertOne: { document: m } });
          newMissionsForNotif.push(m);
        } else if (existing.date !== date) {
          bulkOps.push({ updateOne: { filter: { id: missionId }, update: { $set: { date } } } });
        }
      }
    }

    // Delete missions whose calendar event is gone
    const toDelete = existingMissions
      .filter(m => m.calendarEventId && m.date >= todayStr && !currentUids.has(m.calendarEventId))
      .map(m => m.id);
    if (toDelete.length > 0) bulkOps.push({ deleteMany: { filter: { id: { $in: toDelete } } } });
    if (bulkOps.length > 0) await missionsCol.bulkWrite(bulkOps);

    // ── 3. Email notifications (scheduled run only) ──
    if (isScheduledRun) {
      const lookback = new Date();
      lookback.setDate(lookback.getDate() - DEDUPLICATION_LOOKBACK_DAYS);
      const sentKeys = new Set<string>(
        (await emailsCol.find({ sentAt: { $gte: lookback } }).project({ dedupKey: 1 }).toArray()).map(e => e.dedupKey)
      );

      const emailJobs: any[] = [];

      // New missions
      for (const m of newMissionsForNotif) {
        if (m.date < todayStr) continue;
        for (const agent of allCleaners.filter(c => c.assignedProperties?.includes(m.propertyId))) {
          const key = `new-mission-${m.id}-${agent.id}`;
          if (!sentKeys.has(key)) {
            emailJobs.push({ to: agent.email, subject: `[NOUVEAU] Mission : ${m.propertyId.toUpperCase()} (${m.date})`, html: `<p>Bonjour ${agent.name}, une mission est disponible pour ${m.propertyId.toUpperCase()} le ${m.date}.</p>`, propertyId: m.propertyId, key });
            sentKeys.add(key);
          }
        }
      }

      // Reminders & alerts
      const in7 = new Date(); in7.setDate(in7.getDate() + 7);
      const in7Str = in7.toISOString().split('T')[0];
      const upcoming = await missionsCol.find({ status: { $in: ['pending', 'assigned'] }, date: { $gte: todayStr } }).toArray();

      for (const m of upcoming) {
        if (m.date === todayStr && m.status === 'assigned' && m.cleanerId) {
          const cleaner = allCleaners.find(c => c.id === m.cleanerId);
          if (cleaner?.email) {
            const key = `reminder-j0-${m.id}-${todayStr}`;
            if (!sentKeys.has(key)) {
              emailJobs.push({ to: cleaner.email, subject: `[RAPPEL] Mission aujourd'hui : ${m.propertyId.toUpperCase()}`, html: `<p>Bonjour ${cleaner.name}, rappel de votre mission aujourd'hui.</p>`, propertyId: m.propertyId, key });
              sentKeys.add(key);
            }
          }
        }
        if (m.date === in7Str && m.status === 'pending') {
          for (const agent of allCleaners.filter(c => c.assignedProperties?.includes(m.propertyId))) {
            const key = `alert-j7-${m.id}-${agent.id}`;
            if (!sentKeys.has(key)) {
              emailJobs.push({ to: agent.email, subject: `[URGENT J-7] Mission libre : ${m.propertyId.toUpperCase()}`, html: `<p>La mission du ${m.date} n'est toujours pas assignée.</p>`, propertyId: m.propertyId, key });
              sentKeys.add(key);
            }
          }
        }
      }

      // Overdue missions
      for (const m of await missionsCol.find({ status: { $ne: 'completed' }, date: { $lt: todayStr } }).toArray()) {
        const key = `overdue-alert-${m.id}`;
        if (!sentKeys.has(key)) {
          emailJobs.push({ to: ADMIN_EMAIL, subject: `[ALERTE RETARD] Mission non traitée : ${m.propertyId.toUpperCase()}`, html: `<p>Mission du <strong>${m.date}</strong> pour <strong>${m.propertyId.toUpperCase()}</strong> en retard. Statut : ${m.status}.</p>`, propertyId: m.propertyId, key });
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
        await emailsCol.insertMany(sent.map(j => ({ to: j.to, subject: j.subject, propertyId: j.propertyId, dedupKey: j.key, sentAt: new Date() })));
      }
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Cron error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
