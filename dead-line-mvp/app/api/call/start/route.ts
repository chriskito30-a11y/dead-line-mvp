import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { requireAdminKey } from '@/lib/security';
import { twilioClient } from '@/lib/twilio';
import {
  getCallTypeById,
  getPresetById,
  maskPhone,
  normalizePhone,
  validatePerformMessage,
} from '@/lib/deadlineConfig';

function safeText(value: unknown, fallback: string, maxLength: number) {
  const text = String(value || '').trim();
  return (text || fallback).slice(0, maxLength);
}

export async function POST(req: NextRequest) {
  let callRef: any = null;
  let callId: string | null = null;

  try {
    requireAdminKey(req);

    const body = await req.json();
    const preset = getPresetById(String(body.presetId || 'custom'));
    const callType = getCallTypeById(String(body.callType || 'revelation'));
    const label = safeText(body.label, preset.defaultLabel, 90);
    let phone = normalizePhone(String(body.phone || ''));
    let message = safeText(body.message, preset.defaultMessage, 700);

    const template = typeof body.template === 'string' ? body.template : '';
    const variables = body.variables && typeof body.variables === 'object' ? body.variables : null;

    if (template && variables) {
      const validation = validatePerformMessage({ phone, template, variables });

      if (!validation.ok) {
        return NextResponse.json({
          ok: false,
          error: `Appel bloqué : ${validation.missing.join(', ')} manquant${validation.missing.length > 1 ? 's' : ''}.`,
          missing: validation.missing,
        }, { status: 400 });
      }

      phone = validation.phone;
      message = validation.message.slice(0, 700);
    }

    if (!phone || phone.length < 8 || !phone.startsWith('+')) {
      return NextResponse.json({ ok: false, error: 'Numéro invalide. Utilise un format international, par exemple +33612345678.' }, { status: 400 });
    }

    if (!message.trim()) {
      return NextResponse.json({ ok: false, error: 'Appel bloqué : message final manquant.' }, { status: 400 });
    }

    callRef = db.ref('calls').push();
    callId = callRef.key;

    if (!callId) {
      throw new Error('Impossible de créer le callId');
    }

    await callRef.set({
      phone,
      phoneMasked: maskPhone(phone),
      label,
      message,
      presetId: preset.id,
      presetLabel: preset.name,
      callType: callType.id,
      callTypeLabel: callType.name,
      cost: callType.cost,
      plan: 'admin_test',
      credits: {
        mode: 'prepared',
        charged: false,
        balanceBefore: null,
        balanceAfter: null,
      },
      perform: template ? {
        mode: 'template',
        template,
        variables,
        usedVariables: validatePerformMessage({ phone, template, variables: variables || {} }).usedVariables,
      } : null,
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
        status: 'simulation',
        statusLabel: 'Simulation',
        phoneMasked: maskPhone(phone),
        cost: callType.cost,
        callType: callType.id,
        message: 'Simulation enregistrée : numéro Twilio non configuré.'
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      await callRef.update({
        status: 'config_error',
        error: 'NEXT_PUBLIC_APP_URL manquant',
        updatedAt: Date.now()
      });

      return NextResponse.json({ ok: false, error: 'Configuration incomplète. Vérifie NEXT_PUBLIC_APP_URL dans Vercel.' }, { status: 500 });
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

    return NextResponse.json({
      ok: true,
      callId,
      status: 'queued',
      statusLabel: 'En file',
      phoneMasked: maskPhone(phone),
      twilioSidShort: `${call.sid.slice(0, 6)}…${call.sid.slice(-4)}`,
      cost: callType.cost,
      callType: callType.id,
    });
  } catch (error: any) {
    if (callRef) {
      await callRef.update({
        status: 'error',
        error: error?.message || 'Erreur inconnue',
        updatedAt: Date.now()
      });
    }

    const message = error?.message === 'Accès refusé'
      ? 'Accès refusé. Vérifie la clé admin.'
      : 'Impossible de lancer l’appel pour le moment.';

    return NextResponse.json({
      ok: false,
      callId,
      error: message
    }, { status: error?.message === 'Accès refusé' ? 403 : 500 });
  }
}
