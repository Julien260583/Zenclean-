
import { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';
import { sendEmail } from './lib/email.js';

const uri = process.env.MONGODB_URI || "";
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error("MONGODB_URI manquante");
}

let globalWithMongo = global as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri);
  globalWithMongo._mongoClientPromise = client.connect();
}
clientPromise = globalWithMongo._mongoClientPromise;

const ADMIN_EMAIL = "mytoulhouse@gmail.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = await clientPromise;
  const db = client.db("zenclean");
  const collection = db.collection("emails");

  if (req.method === 'GET') {
    const emails = await collection.find({}).sort({ sentAt: -1 }).toArray();
    return res.status(200).json(emails);
  }

  if (req.method === 'POST') {
    const { action } = req.query;

    if (action === 'test') {
      try {
        const subject = "Email de Test - ZenClean App";
        const html = "<p>Ceci est un email de test envoyé depuis l'''application ZenClean pour vérifier la configuration de Mailjet.</p><p>Si vous recevez cet email, tout fonctionne correctement.</p>";
        
        const mailjetResponse = await sendEmail(ADMIN_EMAIL, subject, html);

        if (mailjetResponse && mailjetResponse.ok) {
            return res.status(200).json({ success: true, message: "Email de test envoyé avec succès à " + ADMIN_EMAIL });
        } else {
            const errorText = mailjetResponse ? await mailjetResponse.text() : "Réponse indéfinie de la fonction sendEmail.";
            console.error("Mailjet API Error:", errorText);
            return res.status(500).json({ success: false, error: "Échec de l'''envoi de l'''email de test.", details: errorText });
        }

      } catch (error: any) {
          console.error("API Error (test-email):", error);
          return res.status(500).json({ success: false, error: error.message });
      }
    } else if (action === 'cleanup') {
        try {
            // Date limite : e-mails envoyés il y a plus de 30 jours
            const oneMonthAgo = new Date();
            oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

            const result = await db.collection("emails").deleteMany({
                sentAt: { $lt: oneMonthAgo }
            });

            return res.status(200).json({
                success: true,
                deletedCount: result.deletedCount,
                thresholdDate: oneMonthAgo.toISOString()
            });
        } catch (error: any) {
            console.error("API Error cleanup-emails:", error);
            return res.status(500).json({ error: error.message || "Une erreur est survenue lors du nettoyage des e-mails." });
        }
    } else {
        return res.status(400).json({ message: "Action non spécifiée ou invalide" });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
}
