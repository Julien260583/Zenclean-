import clientPromise from './lib/mongodb.js';

const PROPERTIES_CONFIG = [
  {
    id: 'naturel',
    name: 'Naturel',
    calendarId: '319da3c78547e5913af3b1fed606645b9ead9b92795482061bd440d47fc23d65@group.calendar.google.com',
    hexColor: '#10B981'
  },
  {
    id: 'morhange',
    name: 'Morhange',
    calendarId: '4792a509f033d8033b457efd42b98865b31a67d28dde23a1284f93096942385c@group.calendar.google.com',
    hexColor: '#3B82F6'
  },
  {
    id: 'scandinave',
    name: 'Scandinave',
    calendarId: '4f94cd0632de6ac44b4927d9783d73faba95e7ab54b506d60f587b46eaf54119@group.calendar.google.com',
    hexColor: '#6366F1'
  },
  {
    id: 'spa',
    name: 'Spa',
    calendarId: '7cd6b0882eec615ff72afba17915838e642c24c06ba1a96eee824da01b40cb0b@group.calendar.google.com',
    hexColor: '#F43F5E'
  }
];

function parseIcalDate(raw: string): string | null {
  const match = raw.match(/(\d{8})/);
  if (!match) return null;
  const d = match[1];
  return `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
}

function parseIcalEvents(icalData: string, propertyId: string) {
  const events: any[] = [];
  const blocks = icalData.split('BEGIN:VEVENT');
  blocks.shift();

  for (const block of blocks) {
    try {
      const uidMatch = block.match(/^UID:(.+)$/m);
      const summaryMatch = block.match(/^SUMMARY:(.+)$/m);
      const dtStartMatch = block.match(/^DTSTART(?:;[^:]*)?:(.+)$/m);
      const dtEndMatch = block.match(/^DTEND(?:;[^:]*)?:(.+)$/m);
      const descMatch = block.match(/^DESCRIPTION:(.+)$/m);

      if (!uidMatch || !dtStartMatch) continue;

      const uid = uidMatch[1].trim();
      const summary = summaryMatch ? summaryMatch[1].trim() : 'Événement';
      const startRaw = dtStartMatch[1].trim();
      const endRaw = dtEndMatch ? dtEndMatch[1].trim() : startRaw;
      const description = descMatch ? descMatch[1].trim() : '';

      const startDate = parseIcalDate(startRaw);
      const endDate = parseIcalDate(endRaw);

      if (!startDate) continue;

      // Determine event type from summary keywords
      let eventType: 'checkin' | 'checkout' | 'reservation' | 'blocked' = 'reservation';
      const summaryLower = summary.toLowerCase();
      if (summaryLower.includes('check-out') || summaryLower.includes('checkout') || summaryLower.includes('départ')) {
        eventType = 'checkout';
      } else if (summaryLower.includes('check-in') || summaryLower.includes('checkin') || summaryLower.includes('arrivée')) {
        eventType = 'checkin';
      } else if (summaryLower.includes('blocked') || summaryLower.includes('indisponible') || summaryLower.includes('fermé')) {
        eventType = 'blocked';
      }

      events.push({
        uid,
        propertyId,
        summary,
        description,
        startDate,
        endDate,
        eventType,
        source: 'ical',
        updatedAt: new Date()
      });
    } catch (e) {
      // skip malformed events
    }
  }

  return events;
}

export default async function handler(req: any, res: any) {
  try {
    const client = await clientPromise;
    const db = client.db("zenclean");
    const calendarEventsCol = db.collection("calendar_events");

    if (req.method === 'POST') {
      // Sync all iCal feeds to MongoDB
      let totalSynced = 0;
      const errors: string[] = [];

      for (const prop of PROPERTIES_CONFIG) {
        try {
          const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(prop.calendarId)}/public/basic.ics`;
          const response = await fetch(icalUrl);

          if (!response.ok) {
            errors.push(`Impossible de récupérer le calendrier pour ${prop.name}: ${response.status}`);
            continue;
          }

          const icalData = await response.text();
          const events = parseIcalEvents(icalData, prop.id);

          // Upsert each event by uid
          for (const event of events) {
            await calendarEventsCol.updateOne(
              { uid: event.uid, propertyId: event.propertyId },
              { $set: event },
              { upsert: true }
            );
            totalSynced++;
          }
        } catch (e: any) {
          errors.push(`Erreur pour ${prop.name}: ${e.message}`);
        }
      }

      // Create index if not exists
      try {
        await calendarEventsCol.createIndex({ propertyId: 1, startDate: 1 });
        await calendarEventsCol.createIndex({ uid: 1, propertyId: 1 }, { unique: true });
      } catch (e) {
        // index may already exist
      }

      return res.status(200).json({
        success: true,
        synced: totalSynced,
        errors
      });
    }

    if (req.method === 'GET') {
      const { propertyId, month, year } = req.query;

      // Build filter
      const filter: any = {};

      if (propertyId && propertyId !== 'all') {
        filter.propertyId = propertyId;
      }

      // Filter by month/year if provided
      if (month && year) {
        const m = parseInt(month);
        const y = parseInt(year);
        const startOfMonth = `${y}-${String(m).padStart(2, '0')}-01`;
        const endOfMonth = `${y}-${String(m).padStart(2, '0')}-31`;
        filter.startDate = { $gte: startOfMonth, $lte: endOfMonth };
      }

      const events = await calendarEventsCol
        .find(filter)
        .sort({ startDate: 1 })
        .toArray();

      return res.status(200).json(events);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée.` });

  } catch (error: any) {
    console.error("API Error [calendar-events]:", error);
    return res.status(500).json({ error: error.message || "Une erreur interne est survenue." });
  }
}
