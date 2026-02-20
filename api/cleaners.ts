
import clientPromise from './lib/mongodb.js';

export default async function handler(req: any, res: any) {
    try {
        const client = await clientPromise;
        const db = client.db("zenclean");
        const cleanersCol = db.collection("cleaners");

        switch (req.method) {
            case 'GET':
                const cleaners = await cleanersCol.find({}).toArray();
                res.status(200).json(cleaners);
                break;

            default:
                res.setHeader('Allow', ['GET']);
                res.status(405).json({ message: `Méthode ${req.method} non autorisée.` });
                break;
        }
    } catch (error: any) {
        console.error("API Error cleaners:", error);
        res.status(500).json({ error: error.message || "Une erreur interne est survenue." });
    }
}
