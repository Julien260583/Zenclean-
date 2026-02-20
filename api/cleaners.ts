
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
                const newCleaner = req.body;
                const result = await cleanersCol.insertOne(newCleaner);
                res.status(201).json({ message: "Agent créé avec succès", insertedId: result.insertedId });
                break;

            case 'PUT':
                const { id: updateId, ...updateData } = req.body;
                if (!updateId) {
                    return res.status(400).json({ message: "L'identifiant de l'agent est requis pour la mise à jour." });
                }
                const updateResult = await cleanersCol.updateOne(
                    { _id: new ObjectId(updateId) },
                    { $set: updateData }
                );
                if (updateResult.matchedCount === 0) {
                    return res.status(404).json({ message: "Agent non trouvé." });
                }
                res.status(200).json({ message: "Agent mis à jour avec succès." });
                break;

            case 'DELETE':
                const { id: deleteId } = req.query;
                if (!deleteId) {
                    return res.status(400).json({ message: "L'identifiant de l'agent est requis pour la suppression." });
                }

                // Tentative de conversion en ObjectId. Si ça échoue, c'est probablement l'ancien format d'ID.
                let filter;
                try {
                    filter = { _id: new ObjectId(deleteId) };
                } catch (e) {
                    filter = { id: deleteId }; // Fallback pour les anciens IDs qui ne sont pas des ObjectId
                }

                const deleteResult = await cleanersCol.deleteOne(filter);

                if (deleteResult.deletedCount === 0) {
                    // Peut-être que l'ID était un ObjectId mais a été passé comme une chaîne simple
                    const retryFilter = { id: deleteId };
                    const retryDeleteResult = await cleanersCol.deleteOne(retryFilter);
                    if (retryDeleteResult.deletedCount === 0) {
                        return res.status(404).json({ message: "Agent non trouvé pour la suppression." });
                    }
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
