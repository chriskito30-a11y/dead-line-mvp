import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { requireAdminKey } from '@/lib/security';
import { twilioClient } from '@/lib/twilio';

function normalizePhone(phone: string) {
  const cleaned = phone.trim().replace(/\s+/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0')) return '+33' + cleaned.slice(1);
  return cleaned;
}

export async function POST(req: NextRequest) {
  let callRef: any = null;
  let callId: string | null = null;

  try {
    requireAdminKey(req);

    const body = await req.json();
    const phone = normalizePhone(String(body.phone || ''));
    const label = String(body.label || 'Test Dead Line');
    const message = String(body.message || 'Je savais que tu penserais à la dame de cœur.');

    if (!phone || phone.length < 8) {
      return NextResponse.json({ ok: false, error: 'Numéro invalide' }, { status: 400 });
    }

    callRef = db.ref('calls').push();
    callId = callRef.key;

    if (!callId) {
      throw new Error('Impossible de créer le callId');
    }

    await callRef.set({
      phone,
      label,
      message,
      status: 'creating',
      createdAt: Date.now()
    });

    const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (!fromNumber) {
      await callRef.update({
        status: 'simulation',
        simulated: true,
        error: 'TWILIO_PHONE_NUMBER manquant',
        updatedAt: Date.now()
      });

      return NextResponse.json({
        ok: true,
        mode: 'simulation',
        callId,
        message: 'Simulation enregistrée : TWILIO_PHONE_NUMBER manquant'
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      await callRef.update({
        status: 'config_error',
        error: 'NEXT_PUBLIC_APP_URL manquant',
        updatedAt: Date.now()
      });

      return NextResponse.json({ ok: false, error: 'NEXT_PUBLIC_APP_URL manquant' }, { status: 500 });
    }

    const client = twilioClient();

    const call = await client.calls.create({
      to: phone,
      from: fromNumber,
      url: `${baseUrl}/api/twilio/voice?callId=${callId}`,
      statusCallback: `${baseUrl}/api/twilio/status?callId=${callId}`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

    await callRef.update({
      status: 'queued',
      twilioSid: call.sid,
      updatedAt: Date.now()
    });

    return NextResponse.json({ ok: true, callId, twilioSid: call.sid });
  } catch (error: any) {
    if (callRef) {
      await callRef.update({
        status: 'error',
        error: error?.message || 'Erreur inconnue',
        updatedAt: Date.now()
      });
    }

    return NextResponse.json({
      ok: false,
      callId,
      error: error?.message || 'Erreur inconnue'
    }, { status: 500 });
  }
}
