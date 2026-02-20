

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "";
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error("Veuillez ajouter MONGODB_URI à vos variables d'environnement.");
}

// Fix: Use globalThis instead of global for environment compatibility
let globalWithMongo = globalThis as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri);
  globalWithMongo._mongoClientPromise = client.connect();
}
clientPromise = globalWithMongo._mongoClientPromise;

export default async function handler(req: any, res: any) {
  try {
    const client = await clientPromise;
    const db = client.db("zenclean");

    // On tente de récupérer un document de test
    const data = await db.collection("test").find({}).limit(1).toArray();

    res.status(200).json({ 
      connected: true, 
      database: "zenclean",
      message: "Connexion MongoDB établie avec succès.",
      data 
    });
  } catch (e: any) {
    console.error("Erreur de test DB:", e);
    res.status(500).json({ 
      connected: false, 
      error: e.message,
      hint: "Vérifiez que MONGODB_URI est correct dans Vercel."
    });
  }
}