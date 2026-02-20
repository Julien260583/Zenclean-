
export type PropertyKey = 'naturel' | 'morhange' | 'scandinave' | 'spa';

export interface Property {
  id: PropertyKey;
  name: string;
  calendarId: string;
  calendarUrl: string;
  color: string;
  hexColor: string;
}

export interface Cleaner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  avatar: string;
  assignedProperties: PropertyKey[];
  propertyRates: Record<string, number>; // Coût par appartement
}

export interface Mission {
  id: string;
  _id?: string; // ID MongoDB
  propertyId: PropertyKey;
  cleanerId?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'assigned' | 'completed' | 'cancelled';
  notes?: string;
  calendarEventId?: string; // ID unique du calendrier Google
  isManual?: boolean; // Pour distinguer les missions manuelles
}

export interface AIRecommendation {
  cleanerId: string;
  reason: string;
  confidence: number;
}
