
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "";
const ADMIN_EMAIL = "mytoulhouse@gmail.com";
const MAILJET_API_KEY = process.env.MAILJET_KEY_API;
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_API;

async function sendEmail(to: string, subject: string, html: string) {
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) return;
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  return fetch('https://api.mailjet.com/v3.1/send', {
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
}

export default async function handler(req: any, res: any) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("zenclean");
    const missions = await db.collection("missions").find({}).toArray();
    const cleaners = await db.collection("cleaners").find({}).toArray();
    const emailLogs = await db.collection("emails");

    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];

    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    let report = { reminders: 0, alerts7d: 0, overdue: 0 };

    for (const m of missions) {
      // 1. Rappel le jour J à l'agent assigné
      if (m.date === todayStr && m.status === 'assigned' && m.cleanerId) {
        const cleaner = cleaners.find(c => c.id === m.cleanerId);
        const logKey = `reminder-${m.id}-${todayStr}`;
        const alreadySent = await emailLogs.findOne({ subject: { $regex: logKey } });
        
        if (cleaner && cleaner.email && !alreadySent) {
          await sendEmail(cleaner.email, `[RAPPEL J-0] ${logKey}`, `
            <h3>Bonjour ${cleaner.name},</h3>
            <p>C'est le jour de votre mission pour le bien <strong>${m.propertyId.toUpperCase()}</strong>.</p>
            <p>N'oubliez pas de valider la mission sur l'application une fois terminée.</p>
          `);
          await emailLogs.insertOne({ to: cleaner.email, subject: logKey, sentAt: new Date() });
          report.reminders++;
        }
      }

      // 2. Alerte 7 jours avant si non assignée
      if (m.date === in7DaysStr && m.status === 'pending' && !m.cleanerId) {
        const logKey = `unassigned-7d-${m.id}`;
        const alreadySent = await emailLogs.findOne({ subject: { $regex: logKey } });

        if (!alreadySent) {
          const eligibleAgents = cleaners.filter(c => c.assignedProperties.includes(m.propertyId));
          for (const agent of eligibleAgents) {
            if (agent.email) {
              await sendEmail(agent.email, `[URGENT] Mission libre dans 7 jours : ${m.propertyId.toUpperCase()}`, `
                <p>La mission du <strong>${m.date}</strong> pour <strong>${m.propertyId}</strong> n'est toujours pas assignée.</p>
                <p>Connectez-vous pour la prendre !</p>
              `);
            }
          }
          await emailLogs.insertOne({ to: "multiple-agents", subject: logKey, sentAt: new Date() });
          report.alerts7d++;
        }
      }

      // 3. Alerte si dépassée et non traitée
      const missionDate = new Date(m.date);
      if (missionDate < today && m.status !== 'completed') {
        const logKey = `overdue-alert-${m.id}`;
        const alreadySent = await emailLogs.findOne({ subject: { $regex: logKey } });

        if (!alreadySent) {
          await sendEmail(ADMIN_EMAIL, `[ALERTE RETARD] Mission non traitée : ${m.propertyId.toUpperCase()}`, `
            <p>La mission du <strong>${m.date}</strong> pour <strong>${m.propertyId}</strong> est en retard.</p>
            <p>Statut actuel : ${m.status}</p>
          `);
          await emailLogs.insertOne({ to: ADMIN_EMAIL, subject: logKey, sentAt: new Date() });
          report.overdue++;
        }
      }
    }

    return res.status(200).json({ success: true, report });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    await client.close();
  }
}
