
import clientPromise from './lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { sendEmail } from './lib/email';

const ADMIN_EMAIL = "mytoulhouse@gmail.com";

export default async function handler(req: any, res: any) {
    try {
        const client = await clientPromise;
        const db = client.db("zenclean");
        const missionsCol = db.collection("missions");
        const cleanersCol = db.collection("cleaners");
        const emailsCol = db.collection("emails"); // Ajout de la collection emails

        switch (req.method) {
            case 'GET':
                const missions = await missionsCol.find({}).sort({ date: 1 }).toArray();
                res.status(200).json(missions);
                break;

            case 'POST':
                const newMission = req.body;
                // ... (code existant)
                break;

            case 'PUT':
                const missionUpdate = req.body;
                const { _id, id, updatedBy, ...dataToUpdate } = missionUpdate;

                let query;
                if (_id) {
                    query = { _id: new ObjectId(_id) };
                } else if (id) {
                    query = { id: id };
                } else {
                    return res.status(400).json({ error: 'Un identifiant (_id ou id) est requis pour la mise à jour.' });
                }

                // --- Logique de notification pour les notes ---
                if (dataToUpdate.notes !== undefined) {
                    const originalMission = await missionsCol.findOne(query);
                    if (originalMission && originalMission.notes !== dataToUpdate.notes) {
                        const missionDetails = `Mission pour <strong>${originalMission.propertyId.toUpperCase()}</strong> le <strong>${originalMission.date}</strong>`;
                        const noteHtml = `<p><strong>Nouvelle note :</strong></p><p><i>${dataToUpdate.notes}</i></p>`;
                        const missionId = originalMission.id || originalMission._id.toString();

                        const handleEmail = async (type: string, to: string, subject: string, html: string) => {
                            const response = await sendEmail(to, subject, html);
                            if (response && response.ok) {
                                // Utilisation d'un dedupKey unique pour chaque note
                                const dedupKey = `note-${missionId}-${new Date().getTime()}`;
                                await emailsCol.insertOne({ type, to, subject, dedupKey, sentAt: new Date() });
                            }
                        };

                        // Si la mise à jour est faite par un agent, notifier l'admin
                        if (updatedBy === 'cleaner') {
                            const subject = `[NOTE] Note ajoutée par un agent sur ${originalMission.propertyId}`;
                            const html = `<p>Un agent a ajouté une note sur une mission.</p>${missionDetails}${noteHtml}`;
                            await handleEmail('note-to-admin', ADMIN_EMAIL, subject, html);
                        } 
                        // Si la mise à jour est faite par l'admin et qu'un agent est assigné
                        else if (originalMission.cleanerId) {
                            const cleaner = await cleanersCol.findOne({ id: originalMission.cleanerId });
                            if (cleaner && cleaner.email) {
                                const subject = `[NOTE] Nouvelle note sur votre mission ${originalMission.propertyId}`;
                                const html = `<p>Une nouvelle note a été ajoutée à votre mission.</p>${missionDetails}${noteHtml}`;
                                await handleEmail('note-to-cleaner', cleaner.email, subject, html);
                            }
                        }
                    }
                }
                // --- Fin de la logique de notification ---

                await missionsCol.updateOne(query, { $set: dataToUpdate });
                res.status(200).json({ success: true, message: `Mission mise à jour.` });
                break;

            // ... (cas DELETE et default)
        }
    } catch (error: any) {
        console.error("API Error missions:", error);
        res.status(500).json({ error: error.message || "Une erreur interne est survenue." });
    }
}
