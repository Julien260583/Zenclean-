
// Fonction centralisée pour l'envoi d'emails via Mailjet
export async function sendEmail(to: string, subject: string, html: string) {
    const API_KEY = process.env.MAILJET_API_KEY;
    const SECRET_KEY = process.env.MAILJET_SECRET_KEY;

    // Lazy check — only throws when actually trying to send, not at module load time.
    // This prevents a missing key from crashing ALL serverless functions on startup.
    if (!API_KEY || !SECRET_KEY) {
        throw new Error('Configuration Mailjet incomplète: MAILJET_API_KEY et/ou MAILJET_SECRET_KEY manquantes.');
    }
    if (!to || !subject || !html) {
        throw new Error('sendEmail: paramètres manquants (to, subject ou html).');
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
