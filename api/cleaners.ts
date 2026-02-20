
import { ObjectId } from 'mongodb';
import clientPromise from './lib/mongodb.js';

export default async function handler(req: any, res: any) {
    try {
        const client = await clientPromise;
        const db = client.db("zenclean");
        const cleanersCol = db.collection("cleaners");

        switch (req.method) {
            case 'GET':
                // Récupérer tous les agents
                const cleaners = await cleanersCol.find({}).toArray();
                res.status(200).json(cleaners);
                break;

            case 'POST':
                // Créer un nouvel agent
                const newCleaner = req.body;
                // Assurez-vous d'ajouter une validation ou un nettoyage des données ici si nécessaire
                const result = await cleanersCol.insertOne(newCleaner);
                res.status(201).json({ message: "Agent créé avec succès", insertedId: result.insertedId });
                break;

            case 'PUT':
                // Mettre à jour un agent existant
                const { id, ...updateData } = req.body;
                if (!id) {
                    return res.status(400).json({ message: "L'identifiant de l'agent est requis pour la mise à jour." });
                }
                const updateResult = await cleanersCol.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateData }
                );
                if (updateResult.matchedCount === 0) {
                    return res.status(404).json({ message: "Agent non trouvé." });
                }
                res.status(200).json({ message: "Agent mis à jour avec succès." });
                break;

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT']);
                res.status(405).json({ message: `Méthode ${req.method} non autorisée.` });
                break;
        }
    } catch (error: any) {
        console.error("API Error cleaners:", error);
        res.status(500).json({ error: error.message || "Une erreur interne est survenue." });
    }
}
