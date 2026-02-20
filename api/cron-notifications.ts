import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "";
const ADMIN_EMAIL = "mytoulhouse@gmail.com";

const sendEmail = async (to: string, subject: string, html: string, dedupKey?: string) => {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_SECRET_KEY;

  if (!apiKey || !apiSecret) {
    console.error("Mailjet API Key or Secret is not defined.");
    // Dans une fonction serverless, il vaut mieux ne pas planter le process
    // mais simplement logguer l'erreur et retourner.
    return;
  }

  // Utilisation de Buffer pour l'encodage en Base64, standard en Node.js
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  const body = {
    Messages: [
      {
        From: {
          Email: process.env.MAILJET_FROM_EMAIL || ADMIN_EMAIL,
          Name: "My Toul'House",
        },
        To: [{ Email: to }],
        Subject: subject,
        HTMLPart: html,
        CustomID: dedupKey || subject.replace(/\s/g, '_'),
      },
    ],
  };

  try {
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Mailjet API Error:", JSON.stringify(errorBody, null, 2));
    }
    
    return response;

  } catch (error) {
    console.error("Failed to send email via fetch:", error);
    // Ne pas relancer l'erreur pour ne pas bloquer les autres envois
  }
};

async function sendEmailWithDedup(db: any, to: string, subject: string, html: string, dedupKey: string) {
  const emailLogs = db.collection("email_logs");
  const alreadySent = await emailLogs.findOne({ dedupKey });
  if (alreadySent) {
    return false; // Déjà envoyé
  }
  await sendEmail(to, subject, html, dedupKey);
  await emailLogs.insertOne({ to, subject, sentAt: new Date(), dedupKey });
  return true;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("zenclean");
    const missionsCol = db.collection("missions");
    const cleanersCol = db.collection("cleaners");
    const emailLogs = db.collection("email_logs");

    const allMissions = await missionsCol.find({}).toArray();
    const allCleaners = await cleanersCol.find({ email: { $exists: true, $ne: '' } }).toArray();

    const report = { newMissionAlerts: 0, reminders0d: 0, alerts7d: 0, overdueAlerts: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    for (const mission of allMissions) {
      const missionId = mission._id.toString();

      // 1. NOTIFICATION DE NOUVELLE MISSION
      if (!mission.cleanerId) {
        const dedupKeyNew = `new-mission-alert-${missionId}`;
        if (!(await emailLogs.findOne({ dedupKey: dedupKeyNew }))) {
          const eligibleAgents = allCleaners.filter(c => c.assignedProperties.includes(mission.propertyId));
          if (eligibleAgents.length > 0) {
            const subject = `[Nouvelle Mission Disponible] ${mission.propertyId.toUpperCase()}`;
            const html = `<p>Bonjour,</p><p>Une nouvelle mission est disponible pour la propriété <strong>${mission.propertyId.toUpperCase()}</strong> le <strong>${mission.date}</strong>.</p><p>Connectez-vous pour la consulter.</p>`;
            await Promise.all(eligibleAgents.map(agent => sendEmail(agent.email, subject, html)));
            await emailLogs.insertOne({ to: 'eligible-agents', subject, sentAt: new Date(), dedupKey: dedupKeyNew });
            report.newMissionAlerts++;
          }
        }
      }

      // 2. RAPPEL J-0
      if (mission.date === todayStr && mission.cleanerId && mission.status === 'assigned') {
        const cleaner = allCleaners.find(c => c._id.toString() === mission.cleanerId.toString());
        if (cleaner && cleaner.email) {
          const dedupKeyJ0 = `reminder-0d-${missionId}`;
          const subject = `[RAPPEL] Mission aujourd\'hui: ${mission.propertyId.toUpperCase()}`;
          const html = `<p>Bonjour ${cleaner.name},</p><p>Ceci est un rappel pour votre mission à <strong>${mission.propertyId.toUpperCase()}</strong> aujourd\'hui.</p><p>N\'oubliez pas de la marquer comme \'Traitée\' une fois terminée.</p>`;
          if (await sendEmailWithDedup(db, cleaner.email, subject, html, dedupKeyJ0)) {
            report.reminders0d++;
          }
        }
      }

      // 3. ALERTE J-7 SI NON ASSIGNÉE
      if (mission.date === in7DaysStr && !mission.cleanerId) {
        const dedupKeyJ7 = `unassigned-7d-${missionId}`;
        if (!(await emailLogs.findOne({ dedupKey: dedupKeyJ7 }))) {
          const eligibleAgents = allCleaners.filter(c => c.assignedProperties.includes(mission.propertyId));
          const subject = `[URGENT] Mission libre dans 7 jours : ${mission.propertyId.toUpperCase()}`;
          const html = `<p>Bonjour,</p><p>La mission du <strong>${mission.date}</strong> pour <strong>${mission.propertyId.toUpperCase()}</strong> est toujours libre.</p>`;
          if (eligibleAgents.length > 0) {
             await Promise.all(eligibleAgents.map(agent => sendEmail(agent.email, subject, html)));
          }
          await sendEmail(ADMIN_EMAIL, subject, html); // Notifier aussi l'admin
          await emailLogs.insertOne({ to: 'eligible-agents-and-admin', subject, sentAt: new Date(), dedupKey: dedupKeyJ7 });
          report.alerts7d++;
        }
      }

      // 4. ALERTE SI DÉPASSÉE
      const missionDate = new Date(mission.date);
      if (missionDate < today && mission.status !== 'completed') {
        const dedupKeyOverdue = `overdue-alert-${missionId}`;
        const subject = `[ALERTE RETARD] Mission non traitée : ${mission.propertyId.toUpperCase()}`;
        const html = `<p>La mission du <strong>${mission.date}</strong> pour <strong>${mission.propertyId.toUpperCase()}</strong> est en retard. Statut actuel : ${mission.status}.</p>`;
        if (await sendEmailWithDedup(db, ADMIN_EMAIL, subject, html, dedupKeyOverdue)) {
          report.overdueAlerts++;
        }
      }
    }
    
    const totalSent = report.newMissionAlerts + report.reminders0d + report.alerts7d + report.overdueAlerts;
    return res.status(200).json({ success: true, message: `Tâche de notification terminée. ${totalSent} lots d'alertes envoyés.`, report });

  } catch (error: any) {
    console.error("Erreur dans le cron de notifications:", error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    await client.close();
  }
}