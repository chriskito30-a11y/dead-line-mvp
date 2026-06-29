import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { requireAdminKey } from '@/lib/security';

function maskPhone(phone: string) {
  const clean = String(phone || '').replace(/\s+/g, '');
  if (!clean) return '—';
  if (clean.length <= 6) return '••••';
  return `${clean.slice(0, 3)}••••••${clean.slice(-4)}`;
}

function publicStatus(status: string) {
  const value = String(status || 'unknown');

  const labels: Record<string, string> = {
    creating: 'Création',
    simulation: 'Simulation',
    config_error: 'Configuration',
    queued: 'En file',
    initiated: 'En préparation',
    ringing: 'Sonne',
    answered: 'Répondu',
    'in-progress': 'Répondu',
    answered_or_voice_requested: 'Message demandé',
    completed: 'Terminé',
    failed: 'Erreur',
    busy: 'Occupé',
    'no-answer': 'Sans réponse',
    canceled: 'Annulé',
    error: 'Erreur',
    unknown: 'Inconnu',
  };

  return labels[value] || value;
}

function normalizeCall(id: string, call: any) {
  return {
    id,
    label: String(call?.label || 'Dead Line'),
    message: String(call?.message || ''),
    phone: String(call?.phone || ''),
    phoneMasked: call?.phoneMasked || maskPhone(call?.phone || ''),
    status: String(call?.status || 'unknown'),
    statusLabel: publicStatus(call?.status || 'unknown'),
    createdAt: Number(call?.createdAt || 0),
    updatedAt: Number(call?.updatedAt || 0),
    duration: call?.duration ? String(call.duration) : '',
    callType: String(call?.callType || 'revelation'),
    callTypeLabel: String(call?.callTypeLabel || ''),
    cost: typeof call?.cost === 'number' ? call.cost : 2,
    presetId: String(call?.presetId || 'custom'),
    twilioSidShort: call?.twilioSid ? `${String(call.twilioSid).slice(0, 6)}…${String(call.twilioSid).slice(-4)}` : '',
  };
}

export async function GET(req: NextRequest) {
  try {
    requireAdminKey(req);

    const snap = await db.ref('calls').orderByChild('createdAt').limitToLast(20).get();
    const data = snap.val() || {};

    const calls = Object.entries(data)
      .map(([id, call]) => normalizeCall(id, call))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({ ok: true, calls });
  } catch (error: any) {
    const message = error?.message === 'Accès refusé' ? 'Accès refusé' : 'Impossible de charger l’historique.';
    const status = error?.message === 'Accès refusé' ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
