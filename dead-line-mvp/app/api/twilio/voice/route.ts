import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

function escapeXml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get('callId');
  if (!callId) {
    return new NextResponse('<Response><Say language="fr-FR">Erreur Dead Line.</Say></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  const snap = await db().ref(`calls/${callId}`).get();
  const data = snap.val();
  const message = data?.message || 'Le message est introuvable.';

  await db().ref(`calls/${callId}`).update({ status: 'answered_or_voice_requested', voiceRequestedAt: Date.now() });

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say language="fr-FR" voice="alice">${escapeXml(message)}</Say>
  <Pause length="1"/>
  <Say language="fr-FR" voice="alice">Fin du message.</Say>
</Response>`;

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
