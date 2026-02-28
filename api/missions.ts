
import clientPromise from './lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { sendEmail } from './lib/email.js';

const formatDate = (d: string) => d ? d.split('-').reverse().join('/') : '';

// Retourne la date du jour en heure Paris (YYYY-MM-DD)
const todayParis = () => {
  const now = new Date();
  return new Date(now.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' })).toISOString().split('T')[0];
};

// Token secret partagé uniquement côté serveur
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const isAdminRequest = (req: any): boolean => {
  const token = req.headers['x-admin-token'];
  return !!ADMIN_TOKEN && token === ADMIN_TOKEN;
};

export default async function handler(req: any, res: any) {
    try {
        const client = await clientPromise;
        const db = client.db("zenclean");
        const missionsCol = db.collection("missions");

        switch (req.method) {
            case 'GET': {
                const cutoffStr = todayParis();
                const cutoff = new Date(cutoffStr);
                cutoff.setDate(cutoff.getDate() - 90);
                const cutoffMinus90 = cutoff.toISOString().split('T')[0];
                const missions = await missionsCol
                    .find({ date: { $gte: cutoffMinus90 } })
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
                            // Vérifie si l'email a déjà été envoyé avant d'ajouter au batch
                            const alreadySent = await emailsCol.findOne({ dedupKey });
                            if (!alreadySent) {
                                emailJobs.push({
                                    to: agent.email,
                                    subject: `[NOUVEAU] Mission manuelle : ${createdMission.propertyId.toUpperCase()} (${formatDate(createdMission.date)})`,
                                    html: `<p>Bonjour ${agent.name}, une nouvelle mission manuelle vient d'être ajoutée pour ${createdMission.propertyId.toUpperCase()} le ${formatDate(createdMission.date)}.</p>`,
                                    propertyId: createdMission.propertyId,
                                    dedupKey
                                });
                            }
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
                            // upsert sur dedupKey pour garantir l'unicité
                            await Promise.all(sentJobs.map(job =>
                                emailsCol.updateOne(
                                    { dedupKey: job.dedupKey },
                                    { $setOnInsert: { to: job.to, subject: job.subject, propertyId: job.propertyId, dedupKey: job.dedupKey, sentAt: new Date() } },
                                    { upsert: true }
                                )
                            ));
                        }
                    }
                }

                return res.status(201).json(createdMission);

            case 'PUT':
                const missionUpdate = req.body;
                const { _id: update_id, id: updateId, noteUpdatedBy, isAdmin: _ignored, ...dataToUpdate } = missionUpdate;

                // Vérification côté serveur : seul un appel avec le token admin peut modifier les assignations
                const callerIsAdmin = isAdminRequest(req);

                let filter;
                if (update_id) {
                    filter = { _id: new ObjectId(update_id) };
                } else if (updateId) {
                    filter = { id: updateId };
                } else {
                    return res.status(400).json({ error: 'Un identifiant de mission (_id ou id) est requis.' });
                }

                // Fetch the current mission to detect note changes and protect assignation
                const currentMission = await missionsCol.findOne(filter);

                // Protection assignation : seul l'admin peut retirer ou remplacer un agent déjà assigné
                if (!callerIsAdmin && currentMission?.cleanerId) {
                    // L'agent ne peut pas modifier cleanerId si quelqu'un est déjà assigné
                    delete dataToUpdate.cleanerId;
                    delete dataToUpdate.status;
                }

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
                    const displayDate = formatDate(date);
                    const newNote = dataToUpdate.notes || '';
                    const ADMIN_EMAIL = "mytoulouse@gmail.com";

                    const emailsCol = db.collection('emails');

                    if (noteUpdatedBy === 'admin') {
                        // Admin edited a note → notify assigned agent(s)
                        if (currentMission.cleanerId) {
                            const agent = await cleanersCol.findOne({ $or: [{ id: currentMission.cleanerId }, { _id: currentMission.cleanerId }] });
                            if (agent?.email) {
                                const subject = `[Note mise à jour] Mission ${property} - ${displayDate}`;
                                const html = `<p>Bonjour ${agent.name},</p>
                                        <p>L'administrateur a ajouté ou modifié une note sur votre mission :</p>
                                        <ul>
                                          <li><strong>Propriété :</strong> ${property}</li>
                                          <li><strong>Date :</strong> ${displayDate}</li>
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
                        const subject = `[Note ajoutée/modifiée] Mission ${property} - ${displayDate}`;
                        const html = `<p>Bonjour,</p>
                                <p><strong>${agentName}</strong> a ajouté ou modifié une note sur la mission :</p>
                                <ul>
                                  <li><strong>Propriété :</strong> ${property}</li>
                                  <li><strong>Date :</strong> ${displayDate}</li>
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

                // Récupère la mission avant suppression pour notifier l'agent assigné
                const missionToDelete = await missionsCol.findOne(deleteFilter);

                const deleteResult = await missionsCol.deleteOne(deleteFilter);

                if (deleteResult.deletedCount === 0) {
                    return res.status(404).json({ error: "Mission non trouvée pour la suppression." });
                }

                // Notifie l'agent assigné si la mission avait un cleanerId
                if (missionToDelete?.cleanerId) {
                    try {
                        const cleanersCol = db.collection("cleaners");
                        const emailsCol = db.collection("emails");
                        const agent = await cleanersCol.findOne({ $or: [{ id: missionToDelete.cleanerId }, { _id: missionToDelete.cleanerId }] });
                        if (agent?.email) {
                            const property = (missionToDelete.propertyId || '').toUpperCase();
                            const displayDate = formatDate(missionToDelete.date || '');
                            const dedupKey = `mission-deleted-${deleteId}-${agent.id}`;
                            const alreadySent = await emailsCol.findOne({ dedupKey });
                            if (!alreadySent) {
                                const subject = `[ANNULATION] Mission supprimée : ${property} - ${displayDate}`;
                                const html = `<p>Bonjour ${agent.name},</p>
                                    <p>La mission suivante a été <strong>supprimée</strong> par l'administrateur :</p>
                                    <ul>
                                      <li><strong>Propriété :</strong> ${property}</li>
                                      <li><strong>Date :</strong> ${displayDate}</li>
                                    </ul>
                                    <p>Merci de ne plus vous déplacer pour cette intervention.</p>`;
                                const r = await sendEmail(agent.email, subject, html);
                                if (r?.ok) {
                                    await emailsCol.updateOne(
                                        { dedupKey },
                                        { $setOnInsert: { to: agent.email, subject, propertyId: missionToDelete.propertyId, dedupKey, sentAt: new Date() } },
                                        { upsert: true }
                                    );
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Delete notification email failed:', e);
                    }
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
