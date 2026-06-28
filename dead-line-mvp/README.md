# Dead Line MVP

MVP minimal pour tester un appel téléphonique magique : Next.js + Vercel + Firebase RTDB + Twilio Voice.

## Fonction actuelle

- Dashboard simple `/dashboard`
- Entrée d'un numéro au format international
- Entrée d'un message vocal
- Déclenchement d'un vrai appel Twilio
- Twilio lit le message avec `<Say>`
- Logs simples dans Firebase RTDB sous `calls`

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Variables `.env.local`

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://xxxx-default-rtdb.europe-west1.firebasedatabase.app
DEADLINE_ADMIN_KEY=change-moi
```

En local, Twilio doit pouvoir joindre `/api/twilio/voice`, donc il faudra soit déployer sur Vercel, soit utiliser un tunnel type ngrok. Le plus simple : déployer sur Vercel et mettre `NEXT_PUBLIC_APP_URL=https://ton-projet.vercel.app`.

## Déploiement Vercel

1. Créer un repo GitHub.
2. Pousser ce dossier.
3. Importer le repo dans Vercel.
4. Ajouter toutes les variables d'environnement dans Vercel.
5. Déployer.
6. Ouvrir `/dashboard`.

## Firebase RTDB

Structure créée automatiquement :

```json
{
  "calls": {
    "callId": {
      "label": "Test Dead Line",
      "phone": "+336...",
      "message": "...",
      "status": "queued",
      "twilioSid": "...",
      "createdAt": 123456789
    }
  }
}
```

## Attention Twilio Trial

Sur compte Twilio trial, les numéros appelés doivent souvent être vérifiés dans Twilio avant test. C'est normal.

