
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || "";

export default async function handler(req: any, res: any) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db("zenclean");
    const missionsCol = db.collection("missions");

    if (req.method === 'GET') {
      const missions = await missionsCol.find({}).sort({ date: 1 }).toArray();
      return res.status(200).json(missions);
    }
    
    if (req.method === 'POST') {
      const newMission = req.body;
      // Assurer que les champs essentiels sont là, et donner un statut par défaut
      if (!newMission.propertyId || !newMission.date) {
        return res.status(400).json({ error: 'Missing propertyId or date' });
      }
      newMission.status = newMission.status || 'pending';
      
      const result = await missionsCol.insertOne(newMission);
      return res.status(201).json({ ...newMission, _id: result.insertedId });
    }

    if (req.method === 'PUT') {
      const missionUpdate = req.body;
      const { _id, ...dataToUpdate } = missionUpdate;

      if (!_id) {
        // Fallback to 'id' if '_id' is not present, for backward compatibility
        const { id, ...restData } = dataToUpdate;
        if(!id) return res.status(400).json({ error: 'No ID specified for update' });

        await missionsCol.updateOne({ id: id }, { $set: restData });
        return res.status(200).json({ message: `Mission ${id} updated` });
      }

      await missionsCol.updateOne({ _id: new ObjectId(_id) }, { $set: dataToUpdate });
      return res.status(200).json({ message: `Mission ${_id} updated` });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    await client.close();
  }
}
