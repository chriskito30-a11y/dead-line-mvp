import twilio from 'twilio';

export function twilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Identifiants Twilio manquants');
  return twilio(sid, token);
}

export function twilioFromNumber() {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error('TWILIO_PHONE_NUMBER manquant');
  return from;
}
