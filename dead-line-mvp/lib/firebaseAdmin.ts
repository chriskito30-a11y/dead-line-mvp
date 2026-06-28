import admin from 'firebase-admin';

function getPrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) throw new Error('FIREBASE_PRIVATE_KEY manquant');
  return key.replace(/\\n/g, '\n');
}

export function getFirebaseAdminApp() {
  if (admin.apps.length) return admin.app();

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: getPrivateKey(),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export function db() {
  return getFirebaseAdminApp().database();
}
