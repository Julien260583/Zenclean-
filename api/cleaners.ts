
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "";
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error("Veuillez ajouter MONGODB_URI à vos variables d'environnement.");
}

let globalWithMongo = globalThis as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri);
  globalWithMongo._mongoClientPromise = client.connect();
}
clientPromise = globalWithMongo._mongoClientPromise;

export default async function handler(req: any, res: any) {
  const client = await clientPromise;
  const db = client.db("zenclean");
  const collection = db.collection("cleaners");

  if (req.method === 'GET') {
    const cleaners = await collection.find({}).toArray();
    return res.status(200).json(cleaners);
  }

  if (req.method === 'POST') {
    const data = { ...req.body };
    const cleanerId = data.id;

    // Suppression stricte du champ _id pour éviter l'erreur d'immutabilité
    delete data._id;

    if (!cleanerId) {
      return res.status(400).json({ error: "L'identifiant de l'agent est requis." });
    }

    await collection.updateOne(
      { id: cleanerId }, 
      { $set: data }, 
      { upsert: true }
    );
    return res.status(201).json({ success: true });
  }

  if (req.method === 'DELETE') {
      const { id } = req.query;
      await collection.deleteOne({ id });
      return res.status(200).json({ success: true });
  }

  res.status(405).json({ message: "Méthode non autorisée" });
}
