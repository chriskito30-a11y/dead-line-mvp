import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

function privateKey() {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) throw new Error('Missing FIREBASE_PRIVATE_KEY');
  return key.replace(/\\n/g, '\n');
}

export function getFirebaseAdminApp() {
  const apps = getApps();
  if (apps.length) return apps[0];

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey()
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

export const db = getDatabase(getFirebaseAdminApp());
