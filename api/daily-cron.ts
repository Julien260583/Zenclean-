
import { MongoClient, AnyBulkWriteOperation } from 'mongodb';
import { sendEmail } from './lib/email.js';

// Configuration
const ADMIN_EMAIL = "mytoulhouse@gmail.com";
const PROPERTIES_CONFIG = [
  { id: 'naturel', calendarId: '319da3c78547e5913af3b1fed606645b9ead9b92795482061bd440d47fc23d65@group.calendar.google.com' },
  { id: 'morhange', calendarId: '4792a509f033d8033b457efd42b98865b31a67d28dde23a1284f93096942385c@group.calendar.google.com' },
  { id: 'scandinave', calendarId: '4f94cd0632de6ac44b4927d9783d73faba95e7ab54b506d60f587b46eaf54119@group.calendar.google.com' },
  { id: 'spa', calendarId: '7cd6b0882eec615ff72afba17915838e642c24c06ba1a96eee824da01b40cb0b@group.calendar.google.com' }
];
const DEDUPLICATION_LOOKBACK_DAYS = 10; // Ne vérifier les doublons d'emails que sur les 10 derniers jours.

export default async function handler(req: any, res: any) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("FATAL: MONGODB_URI is not defined in environment variables.");
        return res.status(500).json({ success: false, error: "Server configuration error." });
    }

    const client = new MongoClient(uri);
    const isScheduledRun = req.query.schedule === 'true';

    try {
        await client.connect();
        const db = client.db("zenclean");
        const missionsCol = db.collection("missions");
        const cleanersCol = db.collection("cleaners");
        const emailsCol = db.collection("emails");

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // --- 1. Synchronisation des calendriers ---
        const calendarDataPromises = PROPERTIES_CONFIG.map(async (prop) => {
            try {
                const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(prop.calendarId)}/public/basic.ics`;
                const response = await fetch(icalUrl, { signal: AbortSignal.timeout(8000) }); // Timeout de 8s
                if (!response.ok) {
                    console.warn(`Failed to fetch calendar for ${prop.id}. Status: ${response.status}`);
                    return { prop, events: [] };
                }
                const icalData = await response.text();
                const events = icalData.split('BEGIN:VEVENT').slice(1);
                return { prop, events };
            } catch (error) {
                console.error(`Error fetching or parsing calendar for ${prop.id}:`, error);
                return { prop, events: [] }; // Renvoyer un tableau vide en cas d'erreur
            }
        });

        const calendarData = await Promise.all(calendarDataPromises);

        const [allCleaners, existingMissions] = await Promise.all([
            cleanersCol.find({ email: { $exists: true, $ne: '' } }).toArray(),
            missionsCol.find({}).toArray()
        ]);
        
        const existingMissionsMap = new Map(existingMissions.map(m => [m.id, m]));
        const bulkOps: AnyBulkWriteOperation[] = [];
        const newMissionsForNotif: any[] = [];
        let currentCalendarUids: Set<string> = new Set();

        for (const { prop, events } of calendarData) {
            for (const eventStr of events) {
                const dtEndMatch = eventStr.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);
                const uidMatch = eventStr.match(/UID:(.*)/);
                if (!dtEndMatch || !uidMatch) continue;

                const rawDate = dtEndMatch[1];
                const formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
                const uid = uidMatch[1].trim();
                currentCalendarUids.add(uid);

                if (formattedDate < todayStr) continue;
                
                const missionId = `cal-${uid}`;
                const existing = existingMissionsMap.get(missionId);

                if (!existing) {
                    const newMission = {
                        id: missionId, calendarEventId: uid, propertyId: prop.id, date: formattedDate,
                        status: 'pending', notes: "", isManual: false,
                    };
                    bulkOps.push({ insertOne: { document: newMission } });
                    newMissionsForNotif.push(newMission);
                } else if (existing.date !== formattedDate) {
                    bulkOps.push({ updateOne: { filter: { id: missionId }, update: { $set: { date: formattedDate } } } });
                }
            }
        }
        
        const missionsToDelete = existingMissions
            .filter(m => m.calendarEventId && m.date >= todayStr && !currentCalendarUids.has(m.calendarEventId))
            .map(m => m.id);

        if (missionsToDelete.length > 0) {
            bulkOps.push({ deleteMany: { filter: { id: { $in: missionsToDelete } } } });
        }

        if (bulkOps.length > 0) {
            await missionsCol.bulkWrite(bulkOps);
        }

        // --- 2. Préparation et envoi des notifications (si demandé) ---
        if (isScheduledRun) {
            const lookbackDate = new Date();
            lookbackDate.setDate(today.getDate() - DEDUPLICATION_LOOKBACK_DAYS);
            const sentEmails = await emailsCol.find({ sentAt: { $gte: lookbackDate } }).project({ dedupKey: 1 }).toArray();
            const emailDedupKeys = new Set<string>(sentEmails.map(e => e.dedupKey));

            const emailJobs: any[] = [];

            // Notifications pour les nouvelles missions
            for (const mission of newMissionsForNotif) {
                const eligibleAgents = allCleaners.filter(c => c.assignedProperties?.includes(mission.propertyId));
                for (const agent of eligibleAgents) {
                    const dedupKey = `new-mission-${mission.id}-${agent.id}`;
                    if (!emailDedupKeys.has(dedupKey)) {
                        emailJobs.push({ to: agent.email, subject: `[NOUVEAU] Mission : ${mission.propertyId.toUpperCase()} (${mission.date})`, html: `<p>Bonjour ${agent.name}, une mission est disponible pour ${mission.propertyId.toUpperCase()} le ${mission.date}.</p>`, dedupKey });
                        emailDedupKeys.add(dedupKey); // Evite double envoi dans la même session
                    }
                }
            }

            const missionsForReminders = await missionsCol.find({ status: { $in: ['pending', 'assigned'] }, date: { $gte: todayStr } }).toArray();
            const in7Days = new Date();
            in7Days.setDate(today.getDate() + 7);
            const in7DaysStr = in7Days.toISOString().split('T')[0];
            
            for (const mission of missionsForReminders) {
                if (mission.date === todayStr && mission.status === 'assigned' && mission.cleanerId) {
                    const cleaner = allCleaners.find(c => c.id === mission.cleanerId);
                    if (cleaner?.email) {
                        const dedupKey = `reminder-j0-${mission.id}-${todayStr}`;
                        if (!emailDedupKeys.has(dedupKey)) {
                            emailJobs.push({ to: cleaner.email, subject: `[RAPPEL] Mission aujourd'hui : ${mission.propertyId.toUpperCase()}`, html: `<p>Bonjour ${cleaner.name}, rappel de votre mission aujourd'hui.</p>`, dedupKey });
                            emailDedupKeys.add(dedupKey);
                        }
                    } else {
                        console.warn(`Data inconsistency: Cleaner ID ${mission.cleanerId} not found for mission ${mission.id}`);
                    }
                }
                if (mission.date === in7DaysStr && mission.status === 'pending') {
                    const eligible = allCleaners.filter(c => c.assignedProperties?.includes(mission.propertyId));
                    for (const agent of eligible) {
                        const dedupKey = `alert-j7-${mission.id}-${agent.id}`;
                        if (!emailDedupKeys.has(dedupKey)){
                            emailJobs.push({ to: agent.email, subject: `[URGENT J-7] Mission toujours libre : ${mission.propertyId.toUpperCase()}`, html: `<p>La mission du ${mission.date} n'est toujours pas assignée.</p>`, dedupKey });
                            emailDedupKeys.add(dedupKey);
                        }
                    }
                }
            }
            
            const overdueMissions = await missionsCol.find({ status: { $ne: 'completed' }, date: { $lt: todayStr } }).toArray();
            for (const mission of overdueMissions) {
                const dedupKey = `overdue-alert-${mission.id}`;
                if (!emailDedupKeys.has(dedupKey)) {
                    emailJobs.push({ to: ADMIN_EMAIL, subject: `[ALERTE RETARD] Mission non traitée : ${mission.propertyId.toUpperCase()}`, html: `<p>La mission du <strong>${mission.date}</strong> pour <strong>${mission.propertyId.toUpperCase()}</strong> est en retard. Statut actuel : ${mission.status}.</p>`, dedupKey });
                    emailDedupKeys.add(dedupKey);
                }
            }
            
            // Envoi des emails en parallèle avec gestion d'erreur individuelle
            const emailSendPromises = emailJobs.map(async (job) => {
                try {
                    const response = await sendEmail(job.to, job.subject, job.html);
                    if (response && response.ok) {
                        return { ...job, status: 'sent' };
                    } else {
                        const errorInfo = response ? `Status: ${response.status}` : "No response";
                        console.error(`Failed to send email to ${job.to}. ${errorInfo}`);
                        return { ...job, status: 'failed' };
                    }
                } catch (error) {
                    console.error(`Error sending email to ${job.to}:`, error);
                    return { ...job, status: 'failed' };
                }
            });

            const results = await Promise.all(emailSendPromises);
            const sentJobs = results.filter(r => r.status === 'sent');
            if (sentJobs.length > 0) {
                const docsToInsert = sentJobs.map(job => ({ to: job.to, subject: job.subject, dedupKey: job.dedupKey, sentAt: new Date() }));
                await emailsCol.insertMany(docsToInsert);
            }
        }

        return res.status(200).json({ success: true, message: "Cron job finished successfully." });

    } catch (error: any) {
        console.error("Cron Job Main Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    } finally {
        await client.close();
    }
}
