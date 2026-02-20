
import { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';
import { Cleaner } from '../types';

// Note: It's crucial to use environment variables for sensitive data.
const {
  MONGO_URI,
  ADMIN_EMAIL,
  ADMIN_PASSWORD
} = process.env;

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }
  const client = await MongoClient.connect(MONGO_URI);
  const db = client.db('zenclean');
  cachedDb = db;
  return db;
}

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  // 1. Check for Admin credentials
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.status(200).json({ user: 'admin' });
  }

  // 2. If not admin, check for Cleaner credentials
  try {
    const db = await connectToDatabase();
    const cleanersCollection = db.collection('cleaners');
    const cleaner = await cleanersCollection.findOne({ email, password });

    if (cleaner) {
      // Return cleaner object without sensitive data if needed in the future
      const cleanerData: Partial<Cleaner> = {
          _id: cleaner._id,
          id: cleaner.id,
          name: cleaner.name,
          email: cleaner.email,
          avatar: cleaner.avatar,
          assignedProperties: cleaner.assignedProperties,
          propertyRates: cleaner.propertyRates,
      };
      return res.status(200).json({ user: cleanerData });
    }

    // 3. If no user is found
    return res.status(401).json({ message: 'Identifiants incorrects. Veuillez réessayer.' });

  } catch (error) {
    console.error('Login API error:', error);
    return res.status(500).json({ message: 'Erreur de connexion. Veuillez réessayer.' });
  }
};
