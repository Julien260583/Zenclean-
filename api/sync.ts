
const PROPERTIES_CONFIG = [
  {
    id: 'naturel',
    calendarId: '319da3c78547e5913af3b1fed606645b9ead9b92795482061bd440d47fc23d65@group.calendar.google.com'
  },
  {
    id: 'morhange',
    calendarId: '4792a509f033d8033b457efd42b98865b31a67d28dde23a1284f93096942385c@group.calendar.google.com'
  },
  {
    id: 'scandinave',
    calendarId: '4f94cd0632de6ac44b4927d9783d73faba95e7ab54b506d60f587b46eaf54119@group.calendar.google.com'
  },
  {
    id: 'spa',
    calendarId: '7cd6b0882eec615ff72afba17915838e642c24c06ba1a96eee824da01b40cb0b@group.calendar.google.com'
  }
];

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  const allProposedMissions: any[] = [];

  try {
    for (const prop of PROPERTIES_CONFIG) {
      const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(prop.calendarId)}/public/basic.ics`;
      
      const response = await fetch(icalUrl);
      if (!response.ok) {
        console.error(`Impossible de récupérer le calendrier pour ${prop.id}`);
        continue;
      }

      const icalData = await response.text();
      const events = icalData.split('BEGIN:VEVENT');
      events.shift(); 

      events.forEach(eventStr => {
        const dtEndMatch = eventStr.match(/DTEND(?:;VALUE=DATE)?:(\d{8})(?:T\d{6}Z)?/);
        const uidMatch = eventStr.match(/UID:(.*)/);
        
        if (dtEndMatch && dtEndMatch[1]) {
          const rawDate = dtEndMatch[1];
          const formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
          const uid = uidMatch ? uidMatch[1].trim() : `${prop.id}-${rawDate}`;
          
          allProposedMissions.push({
            calendarEventId: uid,
            propertyId: prop.id,
            date: formattedDate,
            notes: "Généré automatiquement (Check-out Google Calendar)"
          });
        }
      });
    }

    return res.status(200).json(allProposedMissions);
  } catch (error) {
    console.error("Erreur Sync iCal complète:", error);
    return res.status(500).json({ error: "Erreur lors de la synchronisation des calendriers" });
  }
}
