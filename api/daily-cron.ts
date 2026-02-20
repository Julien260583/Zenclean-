
import { MongoClient, AnyBulkWriteOperation } from 'mongodb';
import { sendEmail } from './lib/email';

const uri = process.env.MONGODB_URI || "";
const ADMIN_EMAIL = "mytoulhouse@gmail.com";

const PROPERTIES_CONFIG = [
  { id: 'naturel', calendarId: '319da3c78547e5913af3b1fed606645b9ead9b92795482061bd440d47fc23d65@group.calendar.google.com' },
  { id: 'morhange', calendarId: '4792a509f033d8033b457efd42b98865b31a67d28dde23a1284f93096942385c@group.calendar.google.com' },
  { id: 'scandinave', calendarId: '4f94cd0632de6ac44b4927d9783d73faba95e7ab54b506d60f587b46eaf54119@group.calendar.google.com' },
  { id: 'spa', calendarId: '7cd6b0882eec615ff72afba17915838e642c24c06ba1a96eee824da01b40cb0b@group.calendar.google.com' }
];

export default async function handler(req: any, res: any) {
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
        
        // --- 1. Nettoyage des anciennes missions ---
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        await missionsCol.deleteMany({
            status: 'completed',
            date: { $lt: twoMonthsAgo.toISOString().split('T')[0] }
        });

        // --- 2. Synchronisation des calendriers ---
        const calendarData = await Promise.all(PROPERTIES_CONFIG.map(async (prop) => {
            const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(prop.calendarId)}/public/basic.ics`;
            const response = await fetch(icalUrl);
            if (!response.ok) return { prop, events: [] };
            const icalData = await response.text();
            const events = icalData.split('BEGIN:VEVENT').slice(1);
            return { prop, events };
        }));

        const allCleaners = await cleanersCol.find({ email: { $exists: true, $ne: '' } }).toArray();
        const existingMissions = await missionsCol.find({}).toArray();
        const existingMissionsMap = new Map(existingMissions.map(m => [m.id, m]));

        const bulkOps: AnyBulkWriteOperation[] = [];
        const newMissionsForNotif: any[] = [];
        let currentCalendarUids: string[] = [];

        for (const { prop, events } of calendarData) {
            for (const eventStr of events) {
                const dtEndMatch = eventStr.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);
                const uidMatch = eventStr.match(/UID:(.*)/);
                if (!dtEndMatch || !uidMatch) continue;

                const rawDate = dtEndMatch[1];
                const formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
                const uid = uidMatch[1].trim();
                const missionId = `cal-${uid}`;
                currentCalendarUids.push(uid);

                if (formattedDate < todayStr) continue;

                const existing = existingMissionsMap.get(missionId);
                if (!existing) {
                    const newMission = {
                        id: missionId, calendarEventId: uid, propertyId: prop.id, date: formattedDate,
                        status: 'pending', notes: ""
                    };
                    bulkOps.push({ insertOne: { document: newMission } });
                    newMissionsForNotif.push(newMission);
                } else if (existing.date !== formattedDate) {
                    bulkOps.push({ updateOne: { filter: { id: missionId }, update: { $set: { date: formattedDate } } } });
                }
            }
        }
        
        const missionsToDelete = existingMissions
            .filter(m => m.calendarEventId && m.date >= todayStr && !currentCalendarUids.includes(m.calendarEventId))
            .map(m => m.id);

        if (missionsToDelete.length > 0) {
            bulkOps.push({ deleteMany: { filter: { id: { $in: missionsToDelete } } } });
        }

        if (bulkOps.length > 0) {
            await missionsCol.bulkWrite(bulkOps);
        }

        // --- 3. Préparation et envoi des notifications ---
        if (isScheduledRun) {
            const emailPromises: Promise<any>[] = [];
            const emailDedupKeys = new Set<string>();

            // Amélioration de la fonction d'archivage
            const addEmailJob = (type: string, to: string, subject: string, html: string, dedupKey: string) => {
                if (emailDedupKeys.has(dedupKey)) return;
                emailPromises.push(sendEmail(to, subject, html).then(async (res) => {
                    if (res && res.ok) {
                        await emailsCol.insertOne({ type, to, subject, dedupKey, sentAt: new Date() });
                    }
                }));
                emailDedupKeys.add(dedupKey);
            };
            
            const sentEmails = await emailsCol.find({ dedupKey: { $regex: '.*' } }).project({ dedupKey: 1 }).toArray();
            sentEmails.forEach(e => emailDedupKeys.add(e.dedupKey));

            // Notifications pour les nouvelles missions
            for (const mission of newMissionsForNotif) {
                const eligibleAgents = allCleaners.filter(c => c.assignedProperties.includes(mission.propertyId));
                for (const agent of eligibleAgents) {
                    const dedupKey = `new-mission-${mission.id}-${agent.id}`;
                    addEmailJob('new-mission', agent.email, `[NOUVEAU] Mission : ${mission.propertyId.toUpperCase()} (${mission.date})`, `<p>Bonjour ${agent.name}, une mission est disponible pour ${mission.propertyId.toUpperCase()} le ${mission.date}.</p>`, dedupKey);
                }
            }

            const missionsForReminders = await missionsCol.find({ status: { $in: ['pending', 'assigned'] }, date: { $gte: todayStr } }).toArray();
            const in7Days = new Date();
            in7Days.setDate(today.getDate() + 7);
            const in7DaysStr = in7Days.toISOString().split('T')[0];
            
            for (const mission of missionsForReminders) {
                // Rappel J-0
                if (mission.date === todayStr && mission.status === 'assigned' && mission.cleanerId) {
                    const cleaner = allCleaners.find(c => c.id === mission.cleanerId);
                    if (cleaner?.email) {
                        const dedupKey = `reminder-j0-${mission.id}-${todayStr}`;
                        addEmailJob('reminder-j0', cleaner.email, `[RAPPEL] Mission aujourd'hui : ${mission.propertyId.toUpperCase()}`, `<p>Bonjour ${cleaner.name}, rappel de votre mission aujourd'hui.</p>`, dedupKey);
                    }
                }
                // Alerte J-7
                if (mission.date === in7DaysStr && mission.status === 'pending') {
                    const eligible = allCleaners.filter(c => c.assignedProperties.includes(mission.propertyId));
                    for (const agent of eligible) {
                        const dedupKey = `alert-j7-${mission.id}-${agent.id}`;
                        addEmailJob('alert-j7', agent.email, `[URGENT J-7] Mission toujours libre : ${mission.propertyId.toUpperCase()}`, `<p>La mission du ${mission.date} n'est toujours pas assignée.</p>`, dedupKey);
                    }
                }
            }
            
            // Alerte missions en retard
            const overdueMissions = await missionsCol.find({ status: { $ne: 'completed' }, date: { $lt: todayStr } }).toArray();
            for (const mission of overdueMissions) {
                const dedupKey = `overdue-alert-${mission.id}`;
                 addEmailJob('overdue-alert', ADMIN_EMAIL, `[ALERTE RETARD] Mission non traitée : ${mission.propertyId.toUpperCase()}`, `<p>La mission du <strong>${mission.date}</strong> pour <strong>${mission.propertyId.toUpperCase()}</strong> est en retard. Statut actuel : ${mission.status}.</p>`, dedupKey);
            }

            await Promise.all(emailPromises);
        }

        return res.status(200).json({ success: true, message: "Cron job finished successfully." });

    } catch (error: any) {
        console.error("Cron Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    } finally {
        await client.close();
    }
}
