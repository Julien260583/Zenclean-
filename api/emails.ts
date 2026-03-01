import clientPromise from './lib/mongodb.js';
import { sendEmail } from './lib/email.js';

const ADMIN_EMAIL = "mytoulhouse@gmail.com";

export default async function handler(req: any, res: any) {
  const client = await clientPromise;
  const db     = client.db("zenclean");
  const col    = db.collection("emails");

  if (req.method === 'GET') {
    const emails = await col.find({}).sort({ sentAt: -1 }).limit(50).toArray();
    return res.status(200).json(emails);
  }

  if (req.method === 'POST') {
    const { action } = req.query;

    if (action === 'test') {
      try {
        const subject = "Email de Test - ZenClean App";
        const html    = "<p>Configuration Mailjet vérifiée avec succès depuis ZenClean.</p>";
        const r       = await sendEmail(ADMIN_EMAIL, subject, html);
        if (r?.ok) {
          await col.insertOne({ to: ADMIN_EMAIL, subject, propertyId: 'test', dedupKey: `test-${Date.now()}`, sentAt: new Date() });
          return res.status(200).json({ success: true });
        }
        return res.status(500).json({ success: false, error: "Échec Mailjet" });
      } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
      }
    }

    if (action === 'migrate-notified') {
      // Migration one-shot : insère une dedupKey pour chaque mission existante
      // afin que le cron ne les considère plus comme nouvelles à notifier.
      try {
        const missionsCol   = db.collection("missions");
        const cleanersCol   = db.collection("cleaners");
        const allMissions   = await missionsCol.find({}).toArray();
        const allCleaners   = await cleanersCol.find({}).toArray();

        let inserted = 0;
        for (const m of allMissions) {
          for (const agent of allCleaners.filter((c: any) => c.assignedProperties?.includes(m.propertyId))) {
            const dedupKey = `new-mission-${m.id}-${agent.id}`;
            const exists = await col.findOne({ dedupKey });
            if (!exists) {
              await col.insertOne({ to: agent.email, subject: '[MIGRATION]', propertyId: m.propertyId, dedupKey, sentAt: new Date() });
              inserted++;
            }
          }
        }
        return res.status(200).json({ success: true, message: `${inserted} entrées de déduplication insérées.` });
      } catch (e: any) {
        return res.status(500).json({ error: e.message });
      }
    }


    if (action === 'cleanup') {
      try {
        // Emails : purge à 30 jours (dedupKeys récentes préservées)
        const emailCutoff = new Date(); emailCutoff.setDate(emailCutoff.getDate() - 30);
        // Missions : purge à 3 mois — uniquement les missions passées, jamais les futures
        const missionCutoff = new Date(); missionCutoff.setMonth(missionCutoff.getMonth() - 3);
        const missionCutoffStr = missionCutoff.toISOString().split('T')[0];
        const missionsCol = db.collection("missions");
        const [emailRes, noteRes, missionRes] = await Promise.all([
          col.deleteMany({ sentAt: { $lt: emailCutoff } }),
          missionsCol.updateMany(
            { date: { $lt: missionCutoffStr }, notes: { $exists: true, $ne: "" } },
            { $set: { notes: "" } }
          ),
          missionsCol.deleteMany({ date: { $lt: missionCutoffStr } }),
        ]);
        return res.status(200).json({ success: true, message: `${emailRes.deletedCount} emails, ${missionRes.deletedCount} missions et ${noteRes.modifiedCount} notes purgés.` });
      } catch (e: any) {
        return res.status(500).json({ error: e.message });
      }
    }

    return res.status(400).json({ message: "Action invalide" });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
}