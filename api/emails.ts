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

    if (action === 'cleanup') {
      try {
        const cutoff    = new Date(); cutoff.setDate(cutoff.getDate() - 30);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const [emailRes, noteRes] = await Promise.all([
          col.deleteMany({ sentAt: { $lt: cutoff } }),
          db.collection("missions").updateMany({ date: { $lt: cutoffStr }, notes: { $exists: true, $ne: "" } }, { $set: { notes: "" } }),
        ]);
        return res.status(200).json({ success: true, message: `${emailRes.deletedCount} emails et ${noteRes.modifiedCount} notes purgés.` });
      } catch (e: any) {
        return res.status(500).json({ error: e.message });
      }
    }

    return res.status(400).json({ message: "Action invalide" });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
}
