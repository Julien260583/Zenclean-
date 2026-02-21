
import { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.MAILJET_API_KEY;
const SECRET_KEY = process.env.MAILJET_SECRET_KEY;

if (!API_KEY || !SECRET_KEY) {
    throw new Error("Les clés API Mailjet ne sont pas définies dans les variables d'environnement.");
}

// Fonction pour envoyer un email
export async function sendEmail(to: string, subject: string, html: string) {
    
    // Vérification basique des entrées
    if (!to || !subject || !html) {
        console.error("sendEmail: Paramètres manquants.");
        return;
    }

    const auth = btoa(`${API_KEY}:${SECRET_KEY}`);

    try {
            return await fetch('https://api.mailjet.com/v3.1/send', {
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
        } catch (e) {
            console.error("Erreur lors de l'envoi de l'email via Mailjet:", e);
        }
    }
