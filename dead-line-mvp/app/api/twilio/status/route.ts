import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get('callId');
  const form = await req.formData();
  const callStatus = String(form.get('CallStatus') || 'unknown');
  const callSid = String(form.get('CallSid') || '');
  const duration = String(form.get('CallDuration') || '');

  if (callId) {
    await db.ref(`calls/${callId}`).update({
      status: callStatus,
      twilioSid: callSid,
      duration,
      updatedAt: Date.now(),
    });
  }

  return NextResponse.json({ ok: true });
}
