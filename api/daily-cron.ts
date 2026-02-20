
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "";
const ADMIN_EMAIL = "mytoulhouse@gmail.com";
const MAILJET_API_KEY = process.env.MAILJET_KEY_API;
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_API;

const PROPERTIES_CONFIG = [
  { id: 'naturel', calendarId: '319da3c78547e5913af3b1fed606645b9ead9b92795482061bd440d47fc23d65@group.calendar.google.com' },
  { id: 'morhange', calendarId: '4792a509f033d8033b457efd42b98865b31a67d28dde23a1284f93096942385c@group.calendar.google.com' },
  { id: 'scandinave', calendarId: '4f94cd0632de6ac44b4927d9783d73faba95e7ab54b506d60f587b46eaf54119@group.calendar.google.com' },
  { id: 'spa', calendarId: '7cd6b0882eec615ff72afba17915838e642c24c06ba1a96eee824da01b40cb0b@group.calendar.google.com' }
];

async function sendEmailWithDedup(to: string, subject: string, html: string, dedupKey: string, db: any) {
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) return;
  
  const alreadySent = await db.collection("emails").findOne({ dedupKey });
  if (alreadySent) {
    console.log(`Email ignoré (déjà envoyé) : ${dedupKey}`);
    return null;
  }

  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  
  try {
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: "mytoulhouse@gmail.com", Name: "My Toul'House" },
          To: [{ Email: to }],
          Subject: subject,
          HTMLPart: html
        }]
      })
    });

    if (response.ok) {
      await db.collection("emails").insertOne({
        to,
        subject,
        html,
        dedupKey,
        sentAt: new Date(),
        status: 'success',
        source: 'sync-engine'
      });
    }
    return response;
  } catch (e) {
    console.error("Erreur envoi email dedup:", e);
  }
}

export default async function handler(req: any, res: any) {
  const client = new MongoClient(uri);
  const isScheduledRun = req.query.schedule === 'true';

  try {
    await client.connect();
    const db = client.db("zenclean");
    const missionsCol = db.collection("missions");
    const cleanersCol = db.collection("cleaners");
    const cleaners = await cleanersCol.find({}).toArray();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const twoMonthsAgoStr = twoMonthsAgo.toISOString().split('T')[0];
    
    const purgeResult = await missionsCol.deleteMany({
      status: 'completed',
      date: { $lt: twoMonthsAgoStr }
    });

    let syncedAdded = 0, syncedUpdated = 0, syncedRemoved = 0;
    let report = { reminders: 0, alerts7d: 0, newMissionsNotified: 0, purgedCount: purgeResult.deletedCount, overdueAlerts: 0 };

    const currentCalendarUids: string[] = [];

    for (const prop of PROPERTIES_CONFIG) {
      const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(prop.calendarId)}/public/basic.ics`;
      const response = await fetch(icalUrl);
      if (!response.ok) continue;
      const icalData = await response.text();
      const events = icalData.split('BEGIN:VEVENT');
      events.shift();

      for (const eventStr of events) {
        const dtEndMatch = eventStr.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);
        const uidMatch = eventStr.match(/UID:(.*)/);
        
        if (dtEndMatch && dtEndMatch[1]) {
          const rawDate = dtEndMatch[1];
          const formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
          const uid = uidMatch ? uidMatch[1].trim() : `cal-${prop.id}-${rawDate}`;
          const missionId = `cal-${uid}`;
          
          currentCalendarUids.push(uid);

          if (formattedDate >= todayStr) {
            const existing = await missionsCol.findOne({ id: missionId });
            
            if (!existing) {
              const newMission = {
                id: missionId, calendarEventId: uid, propertyId: prop.id, date: formattedDate,
                status: 'pending', notes: ""
              };
              await missionsCol.insertOne(newMission);
              syncedAdded++;

              const eligibleAgents = cleaners.filter(c => c.assignedProperties.includes(prop.id as any));
              for (const agent of eligibleAgents) {
                if (agent.email) {
                  const dedupKey = `new-mission-${missionId}-${agent.id}`;
                  await sendEmailWithDedup(agent.email, `[NOUVEAU] Mission : ${prop.id.toUpperCase()} (${formattedDate})`, `<p>Bonjour ${agent.name}, une mission est disponible pour ${prop.id.toUpperCase()} le ${formattedDate}.</p>`, dedupKey, db);
                }
              }
              report.newMissionsNotified++;
            } else if (existing.date !== formattedDate) {
              await missionsCol.updateOne({ id: missionId }, { $set: { date: formattedDate } });
              syncedUpdated++;
            }
          }
        }
      }
    }

    const futureMissionsFromCal = await missionsCol.find({ calendarEventId: { $exists: true }, date: { $gte: todayStr } }).toArray();
    for (const m of futureMissionsFromCal) {
      if (m.calendarEventId && !currentCalendarUids.includes(m.calendarEventId)) {
        await missionsCol.deleteOne({ id: m.id });
        syncedRemoved++;
      }
    }

    if (isScheduledRun) {
      const allMissions = await missionsCol.find({ status: { $in: ['pending', 'assigned'] } }).toArray();
      for (const m of allMissions) {
        // Rappel J-0
        if (m.date === todayStr && m.status === 'assigned' && m.cleanerId) {
          const cleaner = cleaners.find(c => c.id === m.cleanerId);
          if (cleaner?.email) {
            const dedupKey = `reminder-j0-${m.id}-${todayStr}`;
            await sendEmailWithDedup(cleaner.email, `[RAPPEL] Mission aujourd\'hui : ${m.propertyId.toUpperCase()}`, `<p>Bonjour ${cleaner.name}, rappel de votre mission aujourd\'hui.</p>`, dedupKey, db);
            report.reminders++;
          }
        }
        // Alerte J-7
        if (m.date === in7DaysStr && m.status === 'pending') {
          const eligible = cleaners.filter(c => c.assignedProperties.includes(m.propertyId));
          for (const a of eligible) {
            if (a.email) {
              const dedupKey = `alert-j7-${m.id}-${a.id}`;
              await sendEmailWithDedup(a.email, `[URGENT J-7] Mission toujours libre : ${m.propertyId.toUpperCase()}`, `<p>La mission du ${m.date} n\'est toujours pas assignée.</p>`, dedupKey, db);
            }
          }
          report.alerts7d++;
        }
        // Alerte de mission en retard
        const missionDate = new Date(m.date);
        if (missionDate < today && m.status !== 'completed') {
            const dedupKey = `overdue-alert-${m.id}`;
            const subject = `[ALERTE RETARD] Mission non traitée : ${m.propertyId.toUpperCase()}`;
            const html = `<p>La mission du <strong>${m.date}</strong> pour <strong>${m.propertyId.toUpperCase()}</strong> est en retard. Statut actuel : ${m.status}.</p>`;
            if (await sendEmailWithDedup(ADMIN_EMAIL, subject, html, dedupKey, db)) {
                report.overdueAlerts++;
            }
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      sync: { added: syncedAdded, updated: syncedUpdated, removed: syncedRemoved },
      notifications: report,
      purge: { deletedCount: report.purgedCount, threshold: twoMonthsAgoStr }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    await client.close();
  }
}
