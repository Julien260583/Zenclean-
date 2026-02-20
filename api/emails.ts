
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "";
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error("MONGODB_URI manquante");
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
  const collection = db.collection("emails");

  if (req.method === 'GET') {
    const emails = await collection.find({}).sort({ sentAt: -1 }).toArray();
    return res.status(200).json(emails);
  }

  res.status(405).json({ message: "Méthode non autorisée" });
}
