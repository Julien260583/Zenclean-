import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
if (!uri) throw new Error('Veuillez ajouter MONGODB_URI aux variables d\'environnement Vercel.');

// Reuse the same connection across hot-reloads (dev) AND across invocations
// in the same Vercel function instance (prod). Without this, each cold-start
// creates a new MongoClient and the previous one leaks — exhausting the
// MongoDB Atlas free-tier connection limit (max 500) quickly.
declare global { var _mongoClientPromise: Promise<MongoClient> | undefined; }

if (!globalThis._mongoClientPromise) {
  const client = new MongoClient(uri, {
    maxPoolSize: 5,        // keep pool small — free tier allows ~10 concurrent
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });
  globalThis._mongoClientPromise = client.connect().then(async c => {
    // Ensure indexes exist (idempotent — safe to run on every cold start)
    const db = c.db('zenclean');
    // Drop the old unique index on emails.dedupKey if it exists (was too strict — blocked note emails)
    await db.collection('emails').dropIndex('dedupKey_1').catch(() => {}); // ignore if doesn't exist

    await Promise.all([
      db.collection('missions').createIndex({ date: 1 }),
      db.collection('emails').createIndex({ dedupKey: 1 }, { unique: true, sparse: true }),
      db.collection('emails').createIndex({ dedupKey: 1 }, { sparse: true }),        // non-unique: note emails have no dedupKey
      db.collection('emails').createIndex({ sentAt: -1 }),                            // for fast GET sort
      db.collection('calendar_events').createIndex({ propertyId: 1, startDate: 1 }),
      db.collection('calendar_events').createIndex({ uid: 1, propertyId: 1 }, { unique: true }),
    ]).catch(() => {}); // ignore "already exists" errors
    return c;
  });
}

export default globalThis._mongoClientPromise;
