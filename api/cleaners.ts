
import { ObjectId } from 'mongodb';
import clientPromise from './lib/mongodb.js';

export default async function handler(req: any, res: any) {
    try {
        const client = await clientPromise;
        const db = client.db("zenclean");
        const cleanersCol = db.collection("cleaners");

        switch (req.method) {
            case 'GET':
                const cleaners = await cleanersCol.find({}).toArray();
                res.status(200).json(cleaners);
                break;

            case 'POST':
                const { _id, ...newCleaner } = req.body;
                const result = await cleanersCol.insertOne(newCleaner);
                res.status(201).json({ message: "Agent créé avec succès", insertedId: result.insertedId });
                break;

            case 'PUT':
                const { _id: update_id, id: updateId, ...updateData } = req.body;
                let filter;

                if (update_id) {
                    try {
                        filter = { _id: new ObjectId(update_id) };
                    } catch (e) {
                        return res.status(400).json({ message: "L''identifiant _id fourni n''est pas un ObjectId valide."});
                    }
                } else if (updateId) {
                    filter = { id: updateId };
                } else {
                    return res.status(400).json({ message: "Un identifiant (_id ou id) est requis pour la mise à jour." });
                }

                const updateResult = await cleanersCol.updateOne(filter, { $set: updateData });

                if (updateResult.matchedCount === 0) {
                    return res.status(404).json({ message: "Agent non trouvé pour la mise à jour." });
                }
                res.status(200).json({ message: "Agent mis à jour avec succès." });
                break;

            case 'DELETE':
                const { id: deleteId } = req.query;
                if (!deleteId) {
                    return res.status(400).json({ message: "L''identifiant de l''agent est requis pour la suppression." });
                }

                let deleteResult = { deletedCount: 0 };

                if (ObjectId.isValid(deleteId)) {
                    deleteResult = await cleanersCol.deleteOne({ _id: new ObjectId(deleteId) });
                }

                if (deleteResult.deletedCount === 0) {
                    deleteResult = await cleanersCol.deleteOne({ id: deleteId });
                }

                if (deleteResult.deletedCount === 0) {
                    return res.status(404).json({ message: "Agent non trouvé pour la suppression." });
                }

                res.status(200).json({ message: "Agent supprimé avec succès." });
                break;

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                res.status(405).json({ message: `Méthode ${req.method} non autorisée.` });
                break;
        }
    } catch (error: any) {
        console.error("API Error cleaners:", error);
        res.status(500).json({ error: error.message || "Une erreur interne est survenue." });
    }
}
