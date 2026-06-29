import { NextRequest } from 'next/server';

export function getAdminKey(req: NextRequest) {
  return (
    req.headers.get('x-deadline-key') ||
    req.headers.get('x-admin-key') ||
    req.nextUrl.searchParams.get('key') ||
    ''
  );
}

export function requireAdminKey(req: NextRequest) {
  const expected = process.env.DEADLINE_ADMIN_KEY;
  const received = getAdminKey(req);

  if (!expected || received !== expected) {
    throw new Error('Accès refusé');
  }
}
