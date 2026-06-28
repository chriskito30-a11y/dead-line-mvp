import { NextRequest } from 'next/server';

export function requireAdminKey(req: NextRequest) {
  const expected = process.env.DEADLINE_ADMIN_KEY;
  const received = req.headers.get('x-deadline-key');
  if (!expected || received !== expected) {
    throw new Error('Accès refusé');
  }
}
