import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { requireAdminKey } from '@/lib/security';
import { twilioClient, twilioFromNumber } from '@/lib/twilio';

function normalizePhone(phone: string) {
  const cleaned = phone.trim().replace(/\s+/g, '');
  if (!cleaned.startsWith('+')) {
    throw new Error('Le numéro doit être au format international, ex: +33612345678');
  }
  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    requireAdminKey(req);

    const body = await req.json();
    const phone = normalizePhone(String(body.phone || ''));
    const message = String(body.message || '').trim();
    const label = String(body.label || 'Test Dead Line').trim();

    if (!message) throw new Error('Message vocal manquant');

    const createdAt = Date.now();
    const callRef = db().ref('calls').push();
    const callId = callRef.key;
    if (!callId) throw new Error('Impossible de créer le callId');

    await callRef.set({
      label,
      phone,
      message,
      status: 'creating',
      createdAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL manquant');

    const client = twilioClient();
    const call = await client.calls.create({
      to: phone,
      from: twilioFromNumber(),
      url: `${appUrl}/api/twilio/voice?callId=${callId}`,
      statusCallback: `${appUrl}/api/twilio/status?callId=${callId}`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });

    await callRef.update({
      status: 'queued',
      twilioSid: call.sid,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ ok: true, callId, twilioSid: call.sid });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Erreur inconnue' }, { status: 400 });
  }
}
