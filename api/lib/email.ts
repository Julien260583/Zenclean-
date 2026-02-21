
import { Buffer } from 'buffer';

const MAILJET_API_KEY = process.env.MAILJET_KEY_API;
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_API;

/**
 * Envoie un email en utilisant l'API de Mailjet.
 * @param to L'adresse email du destinataire.
 * @param subject Le sujet de l'email.
 * @param html Le contenu HTML de l'email.
 * @returns La réponse de l'API Mailjet ou undefined en cas d'erreur de configuration.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<Response | undefined> {
    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
        console.error("Les clés API Mailjet ne sont pas configurées. Impossible d'envoyer l'email.");
        return;
    }

    const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');

    try {
        return await fetch('https://api.mailjet.com/v3.1/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
                Messages: [{
                    From: { Email: "menage@mytoulhouse.fr", Name: "ZenClean App" },
                    To: [{ Email: to }],
                    Subject: subject,
                    HTMLPart: html
                }]
            })
        });
    } catch (e) {
        console.error("Erreur lors de l'envoi de l'email via Mailjet:", e);
    }
}
