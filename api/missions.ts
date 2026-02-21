
import clientPromise from './lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { sendEmail } from './lib/email.js';

export default async function handler(req: any, res: any) {
    try {
        const client = await clientPromise;
        const db = client.db("zenclean");
        const missionsCol = db.collection("missions");

        switch (req.method) {
            case 'GET':
                const missions = await missionsCol.find({}).sort({ date: 1 }).toArray();
                return res.status(200).json(missions);

            case 'POST':
                const newMissionData = req.body;
                const { _id, ...missionToCreate } = newMissionData;

                const result = await missionsCol.insertOne(missionToCreate);
                const createdMission = await missionsCol.findOne({ _id: result.insertedId });

                // Si la mission est créée manuellement, on envoie une notif
                if (createdMission && createdMission.isManual) {
                    const cleanersCol = db.collection("cleaners");
                    const allCleaners = await cleanersCol.find({ email: { $exists: true, $ne: '' } }).toArray();
                    const eligibleAgents = allCleaners.filter(c => c.assignedProperties?.includes(createdMission.propertyId));

                    if (eligibleAgents.length > 0) {
                        const emailsCol = db.collection("emails");
                        const emailJobs = [];
                        for (const agent of eligibleAgents) {
                            const dedupKey = `new-mission-${createdMission.id || createdMission._id}-${agent.id}`;
                            emailJobs.push({
                                to: agent.email,
                                subject: `[NOUVEAU] Mission manuelle : ${createdMission.propertyId.toUpperCase()} (${createdMission.date})`,
                                html: `<p>Bonjour ${agent.name}, une nouvelle mission manuelle vient d'être ajoutée pour ${createdMission.propertyId.toUpperCase()} le ${createdMission.date}.</p>`,
                                propertyId: createdMission.propertyId,
                                dedupKey: dedupKey
                            });
                        }
                        
                        const emailSendPromises = emailJobs.map(async (job) => {
                            try {
                                const response = await sendEmail(job.to, job.subject, job.html);
                                return { ...job, status: response && response.ok ? 'sent' : 'failed' };
                            } catch (error) {
                                return { ...job, status: 'failed' };
                            }
                        });

                        const results = await Promise.all(emailSendPromises);
                        const sentJobs = results.filter(r => r.status === 'sent');
                        if (sentJobs.length > 0) {
                            const docsToInsert = sentJobs.map(job => ({ 
                                to: job.to, 
                                subject: job.subject, 
                                propertyId: job.propertyId, 
                                dedupKey: job.dedupKey, 
                                sentAt: new Date() 
                            }));
                            await emailsCol.insertMany(docsToInsert);
                        }
                    }
                }

                return res.status(201).json(createdMission);

            case 'PUT':
                const missionUpdate = req.body;
                const { _id: update_id, id: updateId, ...dataToUpdate } = missionUpdate;

                let filter;
                if (update_id) {
                    filter = { _id: new ObjectId(update_id) };
                } else if (updateId) {
                    filter = { id: updateId };
                } else {
                    return res.status(400).json({ error: 'Un identifiant de mission (_id ou id) est requis.' });
                }

                const updateResult = await missionsCol.updateOne(filter, { $set: dataToUpdate });

                if (updateResult.matchedCount === 0) {
                    return res.status(404).json({ error: 'Mission non trouvée.' });
                }
                return res.status(200).json({ success: true, message: 'Mission mise à jour.' });

            case 'DELETE':
                const { id: deleteId } = req.query;
                if (!deleteId) {
                    return res.status(400).json({ error: "L'identifiant de la mission est requis." });
                }

                let deleteFilter;
                try {
                    deleteFilter = { _id: new ObjectId(deleteId) };
                } catch (e) {
                    deleteFilter = { id: deleteId };
                }

                const deleteResult = await missionsCol.deleteOne(deleteFilter);

                if (deleteResult.deletedCount === 0) {
                    return res.status(404).json({ error: "Mission non trouvée pour la suppression." });
                }

                return res.status(200).json({ success: true, message: "Mission supprimée avec succès." });

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                return res.status(405).json({ message: `Méthode ${req.method} non autorisée.` });
        }
    } catch (error: any) {
        console.error("API Error [missions]:", error);
        return res.status(500).json({ error: error.message || "Une erreur interne est survenue." });
    }
}
