
import { NextRequest, NextResponse } from 'next/server';

import { twilioClient } from '@/lib/twilio';



export async function GET(req: NextRequest) {

  const key =

    req.headers.get('x-admin-key') ||

    req.nextUrl.searchParams.get('key') ||

    '';



  if (!process.env.DEADLINE_ADMIN_KEY || key !== process.env.DEADLINE_ADMIN_KEY) {

    return NextResponse.json({ ok: false, error: 'Accès refusé' }, { status: 403 });

  }



  try {

    const client = twilioClient();



    const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });

    const verifiedCallerIds = await client.outgoingCallerIds.list({ limit: 20 });



    return NextResponse.json({

      ok: true,

      twilioPhoneNumberEnv: process.env.TWILIO_PHONE_NUMBER || null,

      accountSidEnv: process.env.TWILIO_ACCOUNT_SID || null,

      incomingNumbers: incomingNumbers.map((n) => ({

        sid: n.sid,

        phoneNumber: n.phoneNumber,

        friendlyName: n.friendlyName,

        capabilities: n.capabilities

      })),

      verifiedCallerIds: verifiedCallerIds.map((n) => ({

        sid: n.sid,

        phoneNumber: n.phoneNumber,

        friendlyName: n.friendlyName

      }))

    });

  } catch (error: any) {

    return NextResponse.json({

      ok: false,

      error: error?.message || 'Erreur inconnue'

    }, { status: 500 });

  }

}

