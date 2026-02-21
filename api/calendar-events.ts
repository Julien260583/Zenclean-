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

// Unfold iCal content lines (continuation lines start with space or tab)
function unfoldIcal(data: string): string {
  return data.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

// Extract a single iCal property value, handling unfolded content
function getProp(block: string, propName: string): string | null {
  const regex = new RegExp(`^${propName}(?:;[^:]*)?:(.+)$`, 'm');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

// Get the TZID parameter from a property line (e.g. DTSTART;TZID=Europe/Paris:20250215T120000)
function getTzid(block: string, propName: string): string | null {
  const regex = new RegExp(`^${propName};[^:]*TZID=([^:;]+)`, 'm');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Parse an iCal datetime value into { date: 'YYYY-MM-DD', time: 'HH:MM', isAllDay: boolean }
 *
 * Supported formats:
 *   20250215                    → all-day date
 *   20250215T120000             → local datetime (no timezone → assume Europe/Paris)
 *   20250215T110000Z            → UTC datetime → convert to Europe/Paris
 *   TZID=Europe/Paris:20250215T120000 → zoned datetime
 */
function parseIcalDateTime(raw: string, tzid: string | null): { date: string; time: string | null; isAllDay: boolean } {
  const allDayMatch = raw.match(/^(\d{8})$/);
  if (allDayMatch) {
    const d = allDayMatch[1];
    return {
      date: `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`,
      time: null,
      isAllDay: true
    };
  }

  // Datetime: 20250215T120000Z or 20250215T120000
  const dtMatch = raw.match(/^(\d{8})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!dtMatch) {
    // Fallback: just extract date digits
    const fallback = raw.match(/(\d{8})/);
    if (!fallback) return { date: '', time: null, isAllDay: true };
    const d = fallback[1];
    return { date: `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`, time: null, isAllDay: true };
  }

  const [, datePart, hh, mm, , isUTC] = dtMatch;
  const year = parseInt(datePart.substring(0, 4));
  const month = parseInt(datePart.substring(4, 6)) - 1;
  const day = parseInt(datePart.substring(6, 8));
  const hour = parseInt(hh);
  const minute = parseInt(mm);

  let localDate: Date;
  if (isUTC === 'Z') {
    // UTC → convert to Europe/Paris using Intl
    localDate = new Date(Date.UTC(year, month, day, hour, minute, 0));
  } else {
    // Local time — treat as Europe/Paris (UTC+1 winter, UTC+2 summer)
    // Simple heuristic: use the date as-is, convert using Paris offset
    localDate = new Date(Date.UTC(year, month, day, hour, minute, 0));
    // Determine Paris offset: last Sunday of March → +2, last Sunday of Oct → +1
    const parisOffset = getParisDSTOffset(localDate);
    localDate = new Date(localDate.getTime() - parisOffset * 60 * 60 * 1000);
  }

  // Now express in Europe/Paris local time
  const parisStr = localDate.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' });
  // sv-SE gives "YYYY-MM-DD HH:MM:SS"
  const [dateParsed, timeParsed] = parisStr.split(' ');
  const timeFormatted = timeParsed ? timeParsed.substring(0, 5) : null; // HH:MM

  return { date: dateParsed, time: timeFormatted, isAllDay: false };
}

// Returns the UTC offset in hours for Europe/Paris at a given UTC date
function getParisDSTOffset(utcDate: Date): number {
  // Europe/Paris is UTC+1 (CET) or UTC+2 (CEST)
  // DST starts last Sunday of March at 02:00, ends last Sunday of October at 03:00
  const year = utcDate.getUTCFullYear();

  // Last Sunday of March
  const dstStart = lastSundayOf(year, 2); // month 2 = March (0-indexed)
  dstStart.setUTCHours(1, 0, 0, 0); // 02:00 Paris = 01:00 UTC

  // Last Sunday of October
  const dstEnd = lastSundayOf(year, 9); // month 9 = October (0-indexed)
  dstEnd.setUTCHours(1, 0, 0, 0); // 03:00 Paris CEST = 01:00 UTC

  if (utcDate >= dstStart && utcDate < dstEnd) return 2; // CEST
  return 1; // CET
}

function lastSundayOf(year: number, month: number): Date {
  // Find last day of month
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const dayOfWeek = lastDay.getUTCDay(); // 0=Sun
  lastDay.setUTCDate(lastDay.getUTCDate() - dayOfWeek);
  return lastDay;
}

function parseIcalEvents(icalData: string, propertyId: string) {
  const events: any[] = [];
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
      const startTzid = getTzid(block, 'DTSTART');
      const endTzid = getTzid(block, 'DTEND');

      if (!uid || !startRaw) continue;

      const startParsed = parseIcalDateTime(startRaw, startTzid);
      const endParsed = endRaw ? parseIcalDateTime(endRaw, endTzid) : null;

      if (!startParsed.date) continue;

      // For multi-day all-day events, DTEND is exclusive (standard iCal).
      // For timed events, DTEND is the actual end moment — keep as-is.
      let endDate = endParsed ? endParsed.date : startParsed.date;
      let endTime = endParsed ? endParsed.time : null;

      if (endParsed && startParsed.isAllDay && endParsed.isAllDay && endDate > startParsed.date) {
        // All-day: subtract 1 day from exclusive DTEND
        const ed = new Date(endDate + 'T12:00:00');
        ed.setDate(ed.getDate() - 1);
        endDate = ed.toISOString().split('T')[0];
      }

      // Determine event type
      let eventType: 'checkin' | 'checkout' | 'reservation' | 'blocked' = 'reservation';
      const textLower = (summary + ' ' + description).toLowerCase();
      if (textLower.includes('check-out') || textLower.includes('checkout') || textLower.includes('départ') || textLower.includes('depart')) {
        eventType = 'checkout';
      } else if (textLower.includes('check-in') || textLower.includes('checkin') || textLower.includes('arrivée') || textLower.includes('arrivee') || textLower.includes('arrival')) {
        eventType = 'checkin';
      } else if (textLower.includes('blocked') || textLower.includes('indisponible') || textLower.includes('not available') || textLower.includes('fermé') || textLower.includes('unavailable')) {
        eventType = 'blocked';
      }

      events.push({
        uid,
        propertyId,
        summary,
        description: description.substring(0, 500),
        startDate: startParsed.date,
        startTime: startParsed.time,       // e.g. "16:00" or null for all-day
        endDate,
        endTime,                            // e.g. "11:00" or null for all-day
        isAllDay: startParsed.isAllDay,
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
