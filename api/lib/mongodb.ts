
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "";
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error("Veuillez ajouter MONGODB_URI à vos variables d'environnement dans le tableau de bord Vercel.");
}

// Fonction pour créer les index
const createIndexes = async (client: MongoClient) => {
  try {
    const db = client.db("zenclean");
    // Index pour la collection email_logs
    await db.collection('email_logs').createIndex({ dedupKey: 1 });
    console.log("Index créé sur dedupKey pour email_logs.");

    // Index pour la collection missions
    await db.collection('missions').createIndex({ date: 1 });
    console.log("Index créé sur date pour missions.");

  } catch (e) {
    console.error("Erreur lors de la création des index:", e);
  }
};

if (process.env.NODE_ENV === 'development') {
  let globalWithMongo = globalThis as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().then(client => {
      createIndexes(client);
      return client;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect().then(client => {
    createIndexes(client);
    return client;
  });
}

export default clientPromise;
