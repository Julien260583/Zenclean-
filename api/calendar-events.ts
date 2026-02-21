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

// Unfold iCal content lines (continuation lines start with space or tab)
function unfoldIcal(data: string): string {
  return data.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

// Extract a single iCal property value, handling unfolded content
function getProp(block: string, propName: string): string | null {
  // Match property with optional parameters: PROPNAME or PROPNAME;params
  const regex = new RegExp(`^${propName}(?:;[^:]*)?:(.+)$`, 'm');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

function parseIcalEvents(icalData: string, propertyId: string) {
  const events: any[] = [];
  // Unfold continuation lines first
  const unfolded = unfoldIcal(icalData);
  const blocks = unfolded.split('BEGIN:VEVENT');
  blocks.shift();

  for (const block of blocks) {
    try {
      const uid = getProp(block, 'UID');
      const summary = getProp(block, 'SUMMARY') || 'Réservation';
      const startRaw = getProp(block, 'DTSTART');
      const endRaw = getProp(block, 'DTEND');
      const description = getProp(block, 'DESCRIPTION') || '';

      if (!uid || !startRaw) continue;

      const startDate = parseIcalDate(startRaw);
      const endDate = endRaw ? parseIcalDate(endRaw) : startDate;

      if (!startDate) continue;

      // Determine event type from summary and description keywords
      let eventType: 'checkin' | 'checkout' | 'reservation' | 'blocked' = 'reservation';
      const textLower = (summary + ' ' + description).toLowerCase();
      if (
        textLower.includes('check-out') || textLower.includes('checkout') ||
        textLower.includes('départ') || textLower.includes('depart')
      ) {
        eventType = 'checkout';
      } else if (
        textLower.includes('check-in') || textLower.includes('checkin') ||
        textLower.includes('arrivée') || textLower.includes('arrivee') || textLower.includes('arrival')
      ) {
        eventType = 'checkin';
      } else if (
        textLower.includes('blocked') || textLower.includes('indisponible') ||
        textLower.includes('not available') || textLower.includes('fermé') || textLower.includes('unavailable')
      ) {
        eventType = 'blocked';
      }

      events.push({
        uid,
        propertyId,
        summary,
        description: description.substring(0, 500), // cap description length
        startDate,
        endDate: endDate || startDate,
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

      // Fetch events that OVERLAP the requested month (not just those starting in it).
      // An event overlaps the month if: startDate <= endOfMonth AND (endDate >= startOfMonth OR startDate >= startOfMonth)
      if (month && year) {
        const m = parseInt(month as string);
        const y = parseInt(year as string);
        const startOfMonth = `${y}-${String(m).padStart(2, '0')}-01`;
        // Last day of month
        const lastDay = new Date(y, m, 0).getDate();
        const endOfMonth = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // Events that overlap: startDate <= endOfMonth AND endDate >= startOfMonth
        // (events without endDate use startDate as endDate)
        filter.startDate = { $lte: endOfMonth };
        filter.$or = [
          { endDate: { $gte: startOfMonth } },
          { endDate: { $exists: false }, startDate: { $gte: startOfMonth } }
        ];
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
