
import { Property, Cleaner } from './types';

export const PROPERTIES: Property[] = [
  {
    id: 'naturel',
    name: 'Naturel',
    calendarId: '319da3c78547e5913af3b1fed606645b9ead9b92795482061bd440d47fc23d65@group.calendar.google.com',
    calendarUrl: 'https://calendar.google.com/calendar/embed?src=319da3c78547e5913af3b1fed606645b9ead9b92795482061bd440d47fc23d65%40group.calendar.google.com&ctz=Europe%2FParis',
    color: 'bg-emerald-500',
    hexColor: '#10B981'
  },
  {
    id: 'morhange',
    name: 'Morhange',
    calendarId: '4792a509f033d8033b457efd42b98865b31a67d28dde23a1284f93096942385c@group.calendar.google.com',
    calendarUrl: 'https://calendar.google.com/calendar/embed?src=4792a509f033d8033b457efd42b98865b31a67d28dde23a1284f93096942385c%40group.calendar.google.com&ctz=Europe%2FParis',
    color: 'bg-blue-500',
    hexColor: '#3B82F6'
  },
  {
    id: 'scandinave',
    name: 'Scandinave',
    calendarId: '4f94cd0632de6ac44b4927d9783d73faba95e7ab54b506d60f587b46eaf54119@group.calendar.google.com',
    calendarUrl: 'https://calendar.google.com/calendar/embed?src=4f94cd0632de6ac44b4927d9783d73faba95e7ab54b506d60f587b46eaf54119%40group.calendar.google.com&ctz=Europe%2FParis',
    color: 'bg-indigo-500',
    hexColor: '#6366F1'
  },
  {
    id: 'spa',
    name: 'Spa',
    calendarId: '7cd6b0882eec615ff72afba17915838e642c24c06ba1a96eee824da01b40cb0b@group.calendar.google.com',
    calendarUrl: 'https://calendar.google.com/calendar/embed?src=7cd6b0882eec615ff72afba17915838e642c24c06ba1a96eee824da01b40cb0b%40group.calendar.google.com&ctz=Europe%2FParis',
    color: 'bg-rose-500',
    hexColor: '#F43F5E'
  }
];

export const INITIAL_CLEANERS: Cleaner[] = [
  {
    id: 'c1',
    name: 'Maria Dupont',
    email: 'maria@example.com',
    password: 'password123',
    phone: '06 12 34 56 78',
    avatar: 'https://picsum.photos/seed/maria/100/100',
    assignedProperties: ['naturel', 'spa'],
    propertyRates: { 'naturel': 45, 'spa': 60 }
  },
  {
    id: 'c2',
    name: 'Elena Silva',
    email: 'elena@example.com',
    password: 'password456',
    phone: '06 23 45 67 89',
    avatar: 'https://picsum.photos/seed/elena/100/100',
    assignedProperties: ['morhange', 'scandinave'],
    propertyRates: { 'morhange': 50, 'scandinave': 55 }
  },
  {
    id: 'c3',
    name: 'Fatima Benali',
    email: 'fatima@example.com',
    password: 'password789',
    phone: '06 34 56 78 90',
    avatar: 'https://picsum.photos/seed/fatima/100/100',
    assignedProperties: ['spa'],
    propertyRates: { 'spa': 65 }
  }
];
