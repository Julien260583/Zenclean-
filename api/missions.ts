
import clientPromise from './lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { sendEmail } from './lib/email.js';

export default async function handler(req: any, res: any) {
    try {
        const client = await clientPromise;
        const db = client.db("zenclean");
        const missionsCol = db.collection("missions");

        switch (req.method) {
            case 'GET': {
                // Load missions from 90 days ago onwards to keep the query bounded.
                // The frontend only uses recent/upcoming missions anyway.
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 90);
                const cutoffStr = cutoff.toISOString().split('T')[0];
                const missions = await missionsCol
                    .find({ date: { $gte: cutoffStr } })
                    .sort({ date: 1 })
                    .toArray();
                return res.status(200).json(missions);
            }

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
                const { _id: update_id, id: updateId, noteUpdatedBy, ...dataToUpdate } = missionUpdate;

                let filter;
                if (update_id) {
                    filter = { _id: new ObjectId(update_id) };
                } else if (updateId) {
                    filter = { id: updateId };
                } else {
                    return res.status(400).json({ error: 'Un identifiant de mission (_id ou id) est requis.' });
                }

                // Fetch the current mission to detect note changes
                const currentMission = await missionsCol.findOne(filter);
                const noteChanged = dataToUpdate.notes !== undefined && dataToUpdate.notes !== (currentMission?.notes ?? '');

                const updateResult = await missionsCol.updateOne(filter, { $set: dataToUpdate });

                if (updateResult.matchedCount === 0) {
                    return res.status(404).json({ error: 'Mission non trouvée.' });
                }

                // Send email notifications if the note changed
                if (noteChanged && currentMission) {
                    const cleanersCol = db.collection("cleaners");
                    const property = (currentMission.propertyId || '').toUpperCase();
                    const date = currentMission.date || '';
                    const newNote = dataToUpdate.notes || '';
                    const ADMIN_EMAIL = "mytoulhouse@gmail.com";

                    const emailsCol = db.collection('emails');

                    if (noteUpdatedBy === 'admin') {
                        // Admin edited a note → notify assigned agent(s)
                        if (currentMission.cleanerId) {
                            const agent = await cleanersCol.findOne({ $or: [{ id: currentMission.cleanerId }, { _id: currentMission.cleanerId }] });
                            if (agent?.email) {
                                const subject = `[Note mise à jour] Mission ${property} - ${date}`;
                                const html = `<p>Bonjour ${agent.name},</p>
                                        <p>L'administrateur a ajouté ou modifié une note sur votre mission :</p>
                                        <ul>
                                          <li><strong>Propriété :</strong> ${property}</li>
                                          <li><strong>Date :</strong> ${date}</li>
                                        </ul>
                                        <blockquote style="border-left:4px solid #f97316;padding:8px 16px;background:#fff7ed;margin:12px 0;border-radius:4px;">
                                          ${newNote.replace(/\n/g, '<br>')}
                                        </blockquote>
                                        <p>Merci de bien en prendre connaissance avant votre intervention.</p>`;
                                try {
                                    const r = await sendEmail(agent.email, subject, html);
                                    if (r?.ok) {
                                        await emailsCol.insertOne({ to: agent.email, subject, propertyId: currentMission.propertyId, sentAt: new Date() });
                                    }
                                } catch (e) {
                                    console.error('Note notification email failed (agent):', e);
                                }
                            }
                        }
                    } else {
                        // Agent edited a note → notify admin
                        const agentName = noteUpdatedBy || 'Un agent';
                        const subject = `[Note ajoutée/modifiée] Mission ${property} - ${date}`;
                        const html = `<p>Bonjour,</p>
                                <p><strong>${agentName}</strong> a ajouté ou modifié une note sur la mission :</p>
                                <ul>
                                  <li><strong>Propriété :</strong> ${property}</li>
                                  <li><strong>Date :</strong> ${date}</li>
                                </ul>
                                <blockquote style="border-left:4px solid #3b82f6;padding:8px 16px;background:#eff6ff;margin:12px 0;border-radius:4px;">
                                  ${newNote.replace(/\n/g, '<br>')}
                                </blockquote>`;
                        try {
                            const r = await sendEmail(ADMIN_EMAIL, subject, html);
                            if (r?.ok) {
                                await emailsCol.insertOne({ to: ADMIN_EMAIL, subject, propertyId: currentMission.propertyId, sentAt: new Date() });
                            }
                        } catch (e) {
                            console.error('Note notification email failed (admin):', e);
                        }
                    }
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
