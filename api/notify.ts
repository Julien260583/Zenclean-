
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "";
let clientPromise: Promise<MongoClient>;

if (uri) {
  let globalWithMongo = globalThis as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  const { to, subject, html, dedupKey } = req.body;

  if (!clientPromise) return res.status(500).json({ error: "Connexion MongoDB échouée." });
  const client = await clientPromise;
  const db = client.db("zenclean");

  if (dedupKey) {
    const alreadySent = await db.collection("emails").findOne({ dedupKey });
    if (alreadySent) {
      return res.status(200).json({ success: true, message: "Doublon ignoré (déjà envoyé)." });
    }
  }

  const apiKeyPublic = process.env.MAILJET_KEY_API; 
  const apiKeySecret = process.env.MAILJET_SECRET_API;

  if (!apiKeyPublic || !apiKeySecret) {
    return res.status(500).json({ 
      error: "Configuration Mailjet manquante. Assurez-vous d'avoir ajouté MAILJET_KEY_API et MAILJET_SECRET_API dans Vercel." 
    });
  }

  const auth = btoa(`${apiKeyPublic}:${apiKeySecret}`);

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

    const result = await response.json();
    
    if (response.ok) {
      await db.collection("emails").insertOne({
        to,
        subject,
        html,
        dedupKey: dedupKey || `manual-${Date.now()}`,
        sentAt: new Date(),
        status: 'success',
        source: 'app'
      });
      return res.status(200).json({ success: true, data: result });
    } else {
      console.error("Erreur Mailjet API:", result);
      return res.status(response.status).json({ 
        error: "Mailjet a renvoyé une erreur.", 
        details: result.Messages?.[0]?.Errors?.[0]?.ErrorMessage || "Erreur inconnue" 
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Erreur réseau lors de l'envoi de l'email." });
  }
}
