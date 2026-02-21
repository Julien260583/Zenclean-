
import { VercelRequest, VercelResponse } from '@vercel/node';

// Utilisation des noms de variables d'environnement corrects et cohérents
const API_KEY = process.env.MAILJET_API_KEY;
const SECRET_KEY = process.env.MAILJET_SECRET_KEY;

if (!API_KEY || !SECRET_KEY) {
    // Cette erreur est critique et doit empêcher le démarrage si les clés sont absentes.
    throw new Error("Configuration Mailjet incomplète: Les variables d'environnement MAILJET_API_KEY et/ou MAILJET_SECRET_KEY sont manquantes.");
}

// Fonction centralisée et robuste pour l'envoi d'emails
export async function sendEmail(to: string, subject: string, html: string) {
    
    if (!to || !subject || !html) {
        console.error("sendEmail: Paramètres manquants (destinataire, sujet, ou contenu HTML).");
        throw new Error("Impossible d'envoyer l'email: des paramètres essentiels sont manquants.");
    }

    const auth = Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString('base64');

    try {
        const response = await fetch('https://api.mailjet.com/v3.1/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
                Messages: [{
                    From: { Email: "menage@mytoulhouse.fr", Name: "MyToulhouse" },
                    To: [{ Email: to }],
                    Subject: subject,
                    HTMLPart: html
                }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Erreur de l'API Mailjet: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`L'envoi de l'email a échoué avec le statut: ${response.status}`);
        }

        return response;

    } catch (error) {
        console.error("Exception lors de la tentative d'envoi de l'email via Mailjet:", error);
        throw error;
    }
}
