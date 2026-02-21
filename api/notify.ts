
import { MongoClient } from 'mongodb';
import clientPromise from './lib/mongodb.js';

// Cette fonction utilise maintenant fetch pour appeler directement l'API Mailjet.
const sendEmail = async (to: string, subject: string, html: string, dedupKey?: string) => {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_SECRET_KEY;

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
      const errorBody = await response.text();
      console.error(`Erreur Mailjet: ${response.status}`, errorBody);
    }
    return response;
  } catch (error) {
    console.error("Exception lors de l'envoi d'email:", error);
    throw error;
  }
};

// Le reste de la logique de notification peut rester ici...
// ... par exemple, la logique pour déterminer à qui envoyer l'email, etc.

export default async (req: any, res: any) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    // ... (votre logique pour déclencher les notifications)

    res.status(200).json({ message: 'Notification traitée' });
};
