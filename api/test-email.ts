
import { sendEmail } from './lib/email.js';

const ADMIN_EMAIL = "mytoulhouse@gmail.com";

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }

    try {
        const subject = "Email de Test - ZenClean App";
        const html = "<p>Ceci est un email de test envoyé depuis l'application ZenClean pour vérifier la configuration de Mailjet.</p><p>Si vous recevez cet email, tout fonctionne correctement.</p>";
        
        const mailjetResponse = await sendEmail(ADMIN_EMAIL, subject, html);

        if (mailjetResponse && mailjetResponse.ok) {
            return res.status(200).json({ success: true, message: "Email de test envoyé avec succès à " + ADMIN_EMAIL });
        } else {
            const errorText = mailjetResponse ? await mailjetResponse.text() : "Réponse indéfinie de la fonction sendEmail.";
            console.error("Mailjet API Error:", errorText);
            return res.status(500).json({ success: false, error: "Échec de l'envoi de l'email de test.", details: errorText });
        }

    } catch (error: any) {
        console.error("API Error (test-email):", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
