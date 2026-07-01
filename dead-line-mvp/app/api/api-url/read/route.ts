import { NextRequest, NextResponse } from 'next/server';
import { requireAdminKey } from '@/lib/security';

function getByPath(input: any, path: string) {
  if (!path.trim()) return input;
  return path.split('.').reduce((current, part) => {
    if (current === null || current === undefined) return undefined;
    return current[part];
  }, input);
}

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return JSON.stringify(value).trim();
}

function extractAuto(parsed: any) {
  if (!parsed || typeof parsed !== 'object') return '';

  const candidates = [
    parsed.text,
    parsed.value,
    parsed.last,
    parsed.result,
    parsed.prediction,
    parsed.phone,
    parsed.message,
    parsed.data?.text,
    parsed.data?.value,
    parsed.data?.prediction,
    parsed.data?.phone,
  ];

  for (const candidate of candidates) {
    const value = normalizeValue(candidate);
    if (value) return value;
  }

  return '';
}

export async function POST(req: NextRequest) {
  try {
    requireAdminKey(req);

    const body = await req.json();
    const apiUrl = String(body.url || '').trim();
    const responseMode = String(body.responseMode || 'auto');
    const jsonPath = String(body.jsonPath || 'text').trim();

    if (!apiUrl) {
      return NextResponse.json({ ok: false, error: 'URL API manquante.' }, { status: 400 });
    }

    let url: URL;
    try {
      url = new URL(apiUrl);
    } catch {
      return NextResponse.json({ ok: false, error: 'URL API invalide.' }, { status: 400 });
    }

    if (!['https:', 'http:'].includes(url.protocol)) {
      return NextResponse.json({ ok: false, error: 'L’URL API doit commencer par http:// ou https://.' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          accept: 'application/json,text/plain,*/*',
          'user-agent': 'Dead-Line-API-Reader/1.0',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await response.text();

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        error: `URL API inaccessible (${response.status}).`,
        status: response.status,
      }, { status: 502 });
    }

    let parsed: any = null;
    const contentType = response.headers.get('content-type') || '';
    const shouldTryJson = responseMode !== 'text' || contentType.includes('json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[');

    if (shouldTryJson) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        if (responseMode === 'json') {
          return NextResponse.json({ ok: false, error: 'La réponse n’est pas un JSON valide.' }, { status: 422 });
        }
      }
    }

    let value = '';
    if (responseMode === 'text' || !parsed) {
      value = rawText.trim();
    } else if (responseMode === 'json') {
      value = normalizeValue(getByPath(parsed, jsonPath || 'text'));
    } else {
      value = normalizeValue(getByPath(parsed, jsonPath || 'text')) || extractAuto(parsed) || rawText.trim();
    }

    if (parsed && Object.prototype.hasOwnProperty.call(parsed, 'found') && Number(parsed.found) === 0) {
      return NextResponse.json({ ok: false, error: 'Aucune valeur disponible dans cette URL API.', rawType: parsed?.type || '' }, { status: 404 });
    }

    if (!value) {
      return NextResponse.json({ ok: false, error: 'La valeur récupérée est vide.' }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      value,
      rawType: parsed?.type ? String(parsed.type) : '',
      found: parsed?.found ?? null,
      mode: parsed ? 'json' : 'text',
      readAt: Date.now(),
    });
  } catch (error: any) {
    const status = error?.message === 'Accès refusé' ? 403 : 500;
    const message = error?.name === 'AbortError'
      ? 'L’URL API ne répond pas assez vite.'
      : error?.message === 'Accès refusé'
        ? 'Accès refusé. Vérifie la clé admin.'
        : 'Impossible de lire cette URL API.';

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
