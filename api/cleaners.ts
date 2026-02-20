
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: any, res: any) {
    try {
        const client = await clientPromise;
        const db = client.db("zenclean");
        const collection = db.collection("cleaners");

        switch (req.method) {
            case 'GET':
                const cleaners = await collection.find({}).toArray();
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.status(200).json(cleaners);
                break;

            case 'POST':
                const data = { ...req.body };
                const cleanerId = data.id;
                delete data._id; // Important pour éviter les erreurs d'immutabilité avec MongoDB

                if (!cleanerId) {
                    return res.status(400).json({ error: "L'identifiant de l'agent est requis." });
                }

                const result = await collection.updateOne(
                    { id: cleanerId },
                    { $set: data },
                    { upsert: true }
                );
                
                res.status(201).json({ success: true, data: result });
                break;

            case 'DELETE':
                const { id } = req.query;
                if (!id) {
                    return res.status(400).json({ error: "L'identifiant de l'agent est requis pour la suppression." });
                }
                await collection.deleteOne({ id });
                res.status(200).json({ success: true, message: `Agent ${id} supprimé.` });
                break;

            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
                break;
        }
    } catch (error: any) {
        console.error("API Error cleaners:", error);
        res.status(500).json({ error: error.message || "Une erreur est survenue sur le serveur." });
    }
}
