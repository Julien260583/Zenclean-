
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("zenclean");
    const missionsCol = db.collection("missions");

    const filter = { notes: "Généré automatiquement (Check-out Google Calendar)" };
    const update = { $set: { notes: "" } };

    const result = await missionsCol.updateMany(filter, update);

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} missions mises à jour.`,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    await client.close();
  }
}
