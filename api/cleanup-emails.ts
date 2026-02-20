
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
  if (!clientPromise) return res.status(500).json({ error: "DB non connectée" });

  try {
    const client = await clientPromise;
    const db = client.db("zenclean");
    
    // Date limite : il y a 30 jours
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const result = await db.collection("emails").deleteMany({
      sentAt: { $lt: oneMonthAgo }
    });

    return res.status(200).json({ 
      success: true, 
      deletedCount: result.deletedCount,
      thresholdDate: oneMonthAgo 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
