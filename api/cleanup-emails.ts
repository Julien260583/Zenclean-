
import clientPromise from '../../lib/mongodb';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
    }

    try {
        const client = await clientPromise;
        const db = client.db("zenclean");

        // Date limite : e-mails envoyés il y a plus de 30 jours
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

        const result = await db.collection("emails").deleteMany({
            sentAt: { $lt: oneMonthAgo }
        });

        return res.status(200).json({
            success: true,
            deletedCount: result.deletedCount,
            thresholdDate: oneMonthAgo.toISOString()
        });
    } catch (error: any) {
        console.error("API Error cleanup-emails:", error);
        return res.status(500).json({ error: error.message || "Une erreur est survenue lors du nettoyage des e-mails." });
    }
}
