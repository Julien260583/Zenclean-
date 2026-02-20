
import { MongoClient } from 'mongodb';
import clientPromise from '../lib/mongodb';

// Cette fonction utilise maintenant fetch pour appeler directement l'API Mailjet.
const sendEmail = async (to: string, subject: string, html: string, dedupKey?: string) => {
  const apiKey = process.env.MAILJET_KEY_API;
  const apiSecret = process.env.MAILJET_SECRET_API;

  if (!apiKey || !apiSecret) {
    console.error("Erreur: Les identifiants Mailjet ne sont pas définis.");
    throw new Error("Erreur de configuration du serveur : identifiants Mailjet manquants.");
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  const body = {
    Messages: [
      {
        From: {
          Email: process.env.MAILJET_FROM_EMAIL,
          Name: "My Toul'House",
        },
        To: [{ Email: to }],
        Subject: subject,
        HTMLPart: html,
        CustomID: dedupKey || subject.replace(/\s/g, '_'),
      },
    ],
  };

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
    console.error("Erreur de l'API Mailjet:", JSON.stringify(errorBody, null, 2));
    throw new Error(`Échec de l\'envoi de l\'e-mail. Statut: ${response.status}`);
  }

  return response.json();
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { to, subject, html, dedupKey } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, error: 'Champs requis manquants: to, subject, html' });
  }

  try {
    const client = await clientPromise;
    const db = client.db("zenclean");
    const emailLogs = db.collection("email_logs");

    if (dedupKey) {
      const alreadySent = await emailLogs.findOne({ dedupKey });
      if (alreadySent) {
        return res.status(200).json({ success: true, message: "E-mail déjà envoyé (dédoublonné)." });
      }
    }

    await sendEmail(to, subject, html, dedupKey);

    if (dedupKey) {
        await emailLogs.insertOne({ to, subject, sentAt: new Date(), dedupKey });
    }

    return res.status(200).json({ success: true, message: "E-mail envoyé avec succès." });

  } catch (error: any) {
    console.error("Erreur dans le handler /api/notify:", error);
    return res.status(500).json({ success: false, error: error.message || 'Une erreur interne du serveur est survenue.' });
  }
}
