
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: any, res: any) {
    try {
        const client = await clientPromise;
        const db = client.db("zenclean");
        const missionsCol = db.collection("missions");

        switch (req.method) {
            case 'GET':
                const missions = await missionsCol.find({}).sort({ date: 1 }).toArray();
                res.status(200).json(missions);
                break;

            case 'POST':
                const newMission = req.body;
                if (!newMission.propertyId || !newMission.date) {
                    return res.status(400).json({ error: 'Les champs `propertyId` et `date` sont requis.' });
                }
                newMission.status = newMission.status || 'pending';
                const result = await missionsCol.insertOne(newMission);
                res.status(201).json({ ...newMission, _id: result.insertedId });
                break;

            case 'PUT':
                const missionUpdate = req.body;
                const { _id, id, ...dataToUpdate } = missionUpdate;

                let query;
                if (_id) {
                    query = { _id: new ObjectId(_id) };
                } else if (id) {
                    query = { id: id };
                } else {
                    return res.status(400).json({ error: 'Un identifiant (_id ou id) est requis pour la mise à jour.' });
                }

                await missionsCol.updateOne(query, { $set: dataToUpdate });
                res.status(200).json({ success: true, message: `Mission mise à jour.` });
                break;

            case 'DELETE':
                const { id: deleteId } = req.query;
                if (!deleteId) {
                    return res.status(400).json({ error: 'L'identifiant de la mission est manquant.' });
                }

                const deleteQuery = ObjectId.isValid(deleteId as string) ? { _id: new ObjectId(deleteId as string) } : { id: deleteId };
                const missionToDelete = await missionsCol.findOne(deleteQuery);

                if (!missionToDelete) {
                    return res.status(404).json({ error: 'Mission non trouvée.' });
                }

                if (missionToDelete.calendarEventId) {
                    return res.status(403).json({ error: 'Impossible de supprimer une mission synchronisée via l\'API. Veuillez la retirer du calendrier Google.' });
                }

                const deleteResult = await missionsCol.deleteOne(deleteQuery);
                if (deleteResult.deletedCount === 0) {
                    return res.status(404).json({ error: "La mission n'a pas pu être supprimée." });
                }

                res.status(200).json({ success: true, message: 'Mission supprimée avec succès.' });
                break;

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                res.status(405).json({ message: `Méthode ${req.method} non autorisée.` });
                break;
        }
    } catch (error: any) {
        console.error("API Error missions:", error);
        res.status(500).json({ error: error.message || "Une erreur interne est survenue." });
    }
}
