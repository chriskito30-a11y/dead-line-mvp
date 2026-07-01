'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEADLINE_API_TARGETS,
  DEADLINE_CALL_TYPES,
  DEADLINE_VARIABLES,
  DEFAULT_PERFORM_TEMPLATE,
  DeadlineApiResponseMode,
  DeadlineApiTarget,
  DeadlineVariableKey,
  extractTemplateVariables,
  getCallTypeById,
  maskPhone,
  normalizePhone,
  validatePerformMessage,
} from '@/lib/deadlineConfig';

type ApiSource = {
  id: string;
  name: string;
  url: string;
  target: DeadlineApiTarget;
  responseMode: DeadlineApiResponseMode;
  jsonPath: string;
  enabled: boolean;
  lastValue?: string;
  lastError?: string;
  lastReadAt?: number;
  rawType?: string;
};

type ApiReadResult = {
  ok: boolean;
  value?: string;
  error?: string;
  rawType?: string;
  readAt?: number;
};

type VariablesState = Partial<Record<DeadlineVariableKey, string>>;

type CallResult = {
  ok: boolean;
  error?: string;
  message?: string;
  status?: string;
  statusLabel?: string;
  phoneMasked?: string;
  callId?: string;
};

const STORAGE_KEY = 'deadline_perform_settings_v1';
const JSON_PATH_PRESETS = ['text', 'globalStep', 'song', 'artist', 'lyrics', 'value', 'last', 'message'];

const blankVariables: VariablesState = {
  prediction: '',
  zone1: '',
  zone2: '',
  zone3: '',
  zone4: '',
  zone5: '',
  fullMessage: '',
};

function makeId() {
  return `api_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatTime(timestamp?: number) {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}

function targetLabel(target: string) {
  return DEADLINE_API_TARGETS.find((item) => item.id === target)?.label || target;
}

function variableLabel(variableId: DeadlineVariableKey) {
  return DEADLINE_VARIABLES.find((item) => item.id === variableId)?.label || variableId;
}

function renderReadablePreview(template: string, variables: VariablesState) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (fullMatch, rawKey) => {
    const key = rawKey as DeadlineVariableKey;
    const variableExists = DEADLINE_VARIABLES.some((variable) => variable.id === key);
    if (!variableExists) return `[variable inconnue ${rawKey}]`;

    const value = String(variables?.[key] || '').trim();
    if (value) return value;

    return `[${variableLabel(key)} manquante]`;
  }).trim();
}

function shortValue(value?: string, maxLength = 180) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

function buildDefaultSource(): ApiSource {
  return {
    id: makeId(),
    name: 'URL API',
    url: '',
    target: 'zone1',
    responseMode: 'auto',
    jsonPath: 'text',
    enabled: true,
  };
}

export default function PerformPage() {
  const [hydrated, setHydrated] = useState(false);
  const [key, setKey] = useState('');
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('Session performance');
  const [variables, setVariables] = useState<VariablesState>(blankVariables);
  const [template, setTemplate] = useState(DEFAULT_PERFORM_TEMPLATE);
  const [sources, setSources] = useState<ApiSource[]>([buildDefaultSource()]);
  const [callType, setCallType] = useState('revelation');
  const [triggerMode, setTriggerMode] = useState<'manual' | 'auto'>('manual');
  const [delaySeconds, setDelaySeconds] = useState(10);
  const [readingAll, setReadingAll] = useState(false);
  const [readingId, setReadingId] = useState('');
  const [callLoading, setCallLoading] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const autoScheduledRef = useRef('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [result, setResult] = useState<CallResult | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setKey(parsed.key || '');
        setPhone(parsed.phone || '');
        setLabel(parsed.label || 'Session performance');
        setVariables({ ...blankVariables, ...(parsed.variables || {}) });
        setTemplate(parsed.template || DEFAULT_PERFORM_TEMPLATE);
        setSources(Array.isArray(parsed.sources) && parsed.sources.length ? parsed.sources : [buildDefaultSource()]);
        setCallType(parsed.callType || 'revelation');
        setTriggerMode(parsed.triggerMode === 'auto' ? 'auto' : 'manual');
        setDelaySeconds(Number.isFinite(Number(parsed.delaySeconds)) ? Number(parsed.delaySeconds) : 10);
      }
    } catch {
      // Réglages locaux illisibles : on repart sur une session propre.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      key,
      phone,
      label,
      variables,
      template,
      sources,
      callType,
      triggerMode,
      delaySeconds,
    }));
  }, [hydrated, key, phone, label, variables, template, sources, callType, triggerMode, delaySeconds]);

  const validation = useMemo(() => validatePerformMessage({ phone, template, variables }), [phone, template, variables]);
  const normalizedPhone = validation.phone || normalizePhone(phone);
  const usedVariables = useMemo(() => extractTemplateVariables(template), [template]);
  const selectedCallType = useMemo(() => getCallTypeById(callType), [callType]);
  const readinessKey = validation.ok ? JSON.stringify({ phone: normalizedPhone, message: validation.message, callType, label }) : '';
  const readablePreview = useMemo(() => renderReadablePreview(template, variables), [template, variables]);
  const usedVariableRows = useMemo(() => usedVariables.map((variableId) => {
    const value = String(variables[variableId] || '').trim();
    return {
      id: variableId,
      token: `{${variableId}}`,
      label: variableLabel(variableId),
      value,
      missing: !value,
    };
  }), [usedVariables, variables]);

  function updateVariable(key: DeadlineVariableKey, value: string) {
    setVariables((current) => ({ ...current, [key]: value }));
    setCallStarted(false);
    setResult(null);
  }

  function updateSource(id: string, patch: Partial<ApiSource>) {
    setSources((current) => current.map((source) => source.id === id ? { ...source, ...patch } : source));
  }

  function addSource() {
    setSources((current) => [...current, buildDefaultSource()]);
  }

  function removeSource(id: string) {
    setSources((current) => current.length <= 1 ? [buildDefaultSource()] : current.filter((source) => source.id !== id));
  }

  function applyTarget(target: DeadlineApiTarget, value: string, nextPhone: string, nextVariables: VariablesState) {
    if (target === 'phone') {
      return { phone: normalizePhone(value), variables: nextVariables };
    }

    if (target === 'trigger') {
      return { phone: nextPhone, variables: nextVariables };
    }

    return {
      phone: nextPhone,
      variables: { ...nextVariables, [target]: value },
    };
  }

  async function fetchApiSource(source: ApiSource): Promise<ApiReadResult> {
    const res = await fetch('/api/api-url/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-deadline-key': key,
      },
      body: JSON.stringify({
        url: source.url,
        responseMode: source.responseMode,
        jsonPath: source.jsonPath,
        target: source.target,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data?.error || 'Impossible de lire cette URL API.');
    }
    return data;
  }

  async function readOne(sourceId: string) {
    const source = sources.find((item) => item.id === sourceId);
    if (!source) return;
    if (!key.trim()) {
      setNotice('Entre la clé admin avant de lire une URL API.');
      return;
    }
    if (!source.url.trim()) {
      updateSource(source.id, { lastError: 'URL manquante.' });
      return;
    }

    setReadingId(source.id);
    setNotice('');

    try {
      const data = await fetchApiSource(source);
      const applied = applyTarget(source.target, String(data.value || ''), phone, variables);
      setPhone(applied.phone);
      setVariables(applied.variables);
      updateSource(source.id, {
        lastValue: String(data.value || ''),
        lastError: '',
        lastReadAt: data.readAt || Date.now(),
        rawType: data.rawType || '',
      });
      setCallStarted(false);
      setResult(null);
      setNotice(`${source.name || 'URL API'} lue : ${targetLabel(source.target)} mis à jour.`);
    } catch (error: any) {
      updateSource(source.id, { lastError: error?.message || 'Lecture impossible.', lastReadAt: Date.now() });
    } finally {
      setReadingId('');
    }
  }

  async function readAll() {
    if (!key.trim()) {
      setNotice('Entre la clé admin avant de lire les URL API.');
      return;
    }

    setReadingAll(true);
    setNotice('Lecture des URL API en cours…');

    let nextPhone = phone;
    let nextVariables: VariablesState = { ...variables };
    const updatedSources: ApiSource[] = [];

    for (const source of sources) {
      if (!source.enabled || !source.url.trim()) {
        updatedSources.push(source);
        continue;
      }

      try {
        const data = await fetchApiSource(source);
        const applied = applyTarget(source.target, String(data.value || ''), nextPhone, nextVariables);
        nextPhone = applied.phone;
        nextVariables = applied.variables;
        updatedSources.push({
          ...source,
          lastValue: String(data.value || ''),
          lastError: '',
          lastReadAt: data.readAt || Date.now(),
          rawType: data.rawType || '',
        });
      } catch (error: any) {
        updatedSources.push({
          ...source,
          lastError: error?.message || 'Lecture impossible.',
          lastReadAt: Date.now(),
        });
      }
    }

    setPhone(nextPhone);
    setVariables(nextVariables);
    setSources(updatedSources);
    setCallStarted(false);
    setResult(null);

    const nextValidation = validatePerformMessage({ phone: nextPhone, template, variables: nextVariables });
    if (nextValidation.ok) {
      setNotice(triggerMode === 'auto'
        ? `Toutes les valeurs sont prêtes. Déclenchement automatique dans ${Math.max(0, delaySeconds)} seconde${Math.max(0, delaySeconds) > 1 ? 's' : ''}.`
        : 'Toutes les valeurs sont prêtes. Tu peux armer et déclencher manuellement.');
    } else {
      setNotice(`Lecture terminée. À compléter : ${nextValidation.missing.join(', ')}.`);
    }

    setReadingAll(false);
  }

  async function startCall(source: 'manual' | 'auto' = 'manual') {
    const currentValidation = validatePerformMessage({ phone, template, variables });
    setResult(null);

    if (!key.trim()) {
      setResult({ ok: false, error: 'Appel bloqué : clé admin manquante.' });
      return;
    }

    if (!currentValidation.ok) {
      setResult({ ok: false, error: `Appel bloqué : ${currentValidation.missing.join(', ')} manquant${currentValidation.missing.length > 1 ? 's' : ''}.` });
      return;
    }

    if (callStarted) {
      setResult({ ok: false, error: 'Appel bloqué : cette session a déjà déclenché un appel. Crée une nouvelle session pour relancer.' });
      return;
    }

    setCallLoading(true);
    setCountdown(null);

    try {
      const res = await fetch('/api/call/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-deadline-key': key,
        },
        body: JSON.stringify({
          phone: currentValidation.phone,
          label,
          message: currentValidation.message,
          presetId: 'custom',
          callType,
          template,
          variables,
          triggerSource: source,
        }),
      });

      const data = await res.json();
      setResult(data);
      if (res.ok && data.ok) {
        setCallStarted(true);
        setNotice('Appel déclenché. Cette session est verrouillée pour éviter un double appel.');
      }
    } catch (error: any) {
      setResult({ ok: false, error: error?.message || 'Impossible de déclencher l’appel.' });
    } finally {
      setCallLoading(false);
    }
  }

  function newSession() {
    setPhone('');
    setVariables(blankVariables);
    setTemplate(DEFAULT_PERFORM_TEMPLATE);
    setLabel('Session performance');
    setResult(null);
    setNotice('Nouvelle session prête. Les URL API restent enregistrées sur cet appareil.');
    setCallStarted(false);
    setCountdown(null);
    autoScheduledRef.current = '';
  }

  useEffect(() => {
    if (triggerMode !== 'auto' || !validation.ok || callStarted || callLoading || !readinessKey) {
      setCountdown(null);
      if (!validation.ok) autoScheduledRef.current = '';
      return;
    }

    if (autoScheduledRef.current === readinessKey) return;

    autoScheduledRef.current = readinessKey;
    const delay = Math.max(0, Math.min(300, Number(delaySeconds) || 0));
    setCountdown(delay);

    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current === null) return null;
        return Math.max(0, current - 1);
      });
    }, 1000);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setCountdown(null);
      startCall('auto');
    }, delay * 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [triggerMode, validation.ok, readinessKey, delaySeconds, callStarted, callLoading]);

  return (
    <main className="dashboard-shell perform-shell">
      <section className="hero perform-hero">
        <div>
          <p className="kicker">Dead Line · Performance</p>
          <h1>URLs API, variables, appel verrouillé.</h1>
          <p className="hero-text">
            Renseigne le contact, lis une ou plusieurs URL API, construis ton message avec des variables, puis déclenche manuellement ou automatiquement quand tout est prêt.
          </p>
        </div>
        <div className={`hero-panel ${validation.ok ? 'ready-panel' : ''}`}>
          <span className="pulse" />
          <strong>{validation.ok ? 'Prêt' : 'Verrouillé'}</strong>
          <span>{validation.ok ? 'Toutes les valeurs nécessaires sont présentes.' : `À compléter : ${validation.missing.join(', ') || 'configuration'}.`}</span>
        </div>
      </section>

      <section className="grid two-cols">
        <div className="grid stack">
          <section className="card">
            <div className="section-title inline-title">
              <div>
                <p className="eyebrow">Accès</p>
                <h2>Session</h2>
              </div>
              <a className="ghost-button mini-link" href="/dashboard">Dashboard</a>
            </div>

            <label>Clé admin</label>
            <input
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="DEADLINE_ADMIN_KEY"
              type="password"
              autoComplete="off"
            />

            <label>Nom de session</label>
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Routine carte + couleur" />
          </section>

          <section className="card">
            <div className="section-title">
              <p className="eyebrow">Contact</p>
              <h2>Téléphone</h2>
            </div>
            <p className="help-text">Le contact peut être saisi ici ou rempli par une URL API. L’appel reste bloqué tant que le contact n’est pas valide.</p>
            <input
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setCallStarted(false);
                setResult(null);
              }}
              onBlur={() => setPhone(normalizePhone(phone))}
              placeholder="06 12 34 56 78 ou +33612345678"
              inputMode="tel"
            />
            <div className="meta-line">
              <span>{validation.ok || normalizedPhone ? `Contact : ${maskPhone(normalizedPhone)}` : 'Aucun contact prêt'}</span>
              <span>{normalizedPhone && validation.missing.includes('Contact valide') ? 'Format à corriger' : 'Format FR auto depuis 06/07'}</span>
            </div>
          </section>

          <section className="card">
            <div className="section-title">
              <p className="eyebrow">Variables</p>
              <h2>Valeurs à utiliser</h2>
            </div>
            <p className="help-text">Les variables peuvent être remplies à la main ou par une URL API. Elles deviennent utilisables dans le message final avec des accolades.</p>
            <div className="variables-grid">
              {DEADLINE_VARIABLES.map((variable) => (
                <div key={variable.id}>
                  <label>{variable.label}</label>
                  <input
                    value={variables[variable.id] || ''}
                    onChange={(event) => updateVariable(variable.id, event.target.value)}
                    placeholder={variable.placeholder}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="section-title inline-title">
              <div>
                <p className="eyebrow">URL API</p>
                <h2>Lectures configurables</h2>
              </div>
              <button className="secondary-button" onClick={addSource}>+ Ajouter</button>
            </div>
            <p className="help-text">Ajoute une URL qui renvoie une information. Choisis le champ JSON à lire, puis l’endroit où Dead Line doit ranger la valeur.</p>

            <div className="api-list">
              {sources.map((source, index) => (
                <article className="api-card" key={source.id}>
                  <div className="api-card-head">
                    <strong>URL API {index + 1}</strong>
                    <label className="toggle-line">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        onChange={(event) => updateSource(source.id, { enabled: event.target.checked })}
                      />
                      Active
                    </label>
                  </div>

                  <label>Nom</label>
                  <input value={source.name} onChange={(event) => updateSource(source.id, { name: event.target.value })} placeholder="Carte, couleur, contact…" />

                  <label>URL</label>
                  <input value={source.url} onChange={(event) => updateSource(source.id, { url: event.target.value })} placeholder="https://..." inputMode="url" />

                  <div className="form-row">
                    <div>
                      <label>Format</label>
                      <select value={source.responseMode} onChange={(event) => updateSource(source.id, { responseMode: event.target.value as DeadlineApiResponseMode })}>
                        <option value="auto">Auto</option>
                        <option value="json">JSON</option>
                        <option value="text">Texte brut</option>
                      </select>
                    </div>
                    <div>
                      <label>Champ JSON</label>
                      <input value={source.jsonPath} onChange={(event) => updateSource(source.id, { jsonPath: event.target.value })} placeholder="text, globalStep, result.value…" />
                    </div>
                  </div>

                  <div className="json-path-presets" aria-label="Raccourcis de champs JSON">
                    {JSON_PATH_PRESETS.map((path) => (
                      <button key={path} type="button" className="ghost-button token-button" onClick={() => updateSource(source.id, { responseMode: 'json', jsonPath: path })}>
                        {path}
                      </button>
                    ))}
                  </div>
                  <p className="field-help">Pour Impression élégante, utilise généralement <strong>globalStep</strong>. Pour MysterSmith, utilise généralement <strong>text</strong>.</p>

                  <label>Remplir</label>
                  <select value={source.target} onChange={(event) => updateSource(source.id, { target: event.target.value as DeadlineApiTarget })}>
                    {DEADLINE_API_TARGETS.map((target) => (
                      <option key={target.id} value={target.id}>{target.label}</option>
                    ))}
                  </select>

                  <div className="api-actions">
                    <button className="secondary-button" onClick={() => readOne(source.id)} disabled={readingAll || readingId === source.id}>
                      {readingId === source.id ? 'Lecture…' : 'Lire cette URL'}
                    </button>
                    <button className="ghost-button" onClick={() => removeSource(source.id)}>Supprimer</button>
                  </div>

                  {source.lastValue && <p className="api-note success-text">Dernière valeur → {targetLabel(source.target)} : <strong title={source.lastValue}>{shortValue(source.lastValue)}</strong>{source.rawType ? ` · ${source.rawType}` : ''}{source.lastReadAt ? ` · ${formatTime(source.lastReadAt)}` : ''}</p>}
                  {source.lastError && <p className="inline-error">{source.lastError}</p>}
                </article>
              ))}
            </div>

            <button className="primary-button compact-primary" onClick={readAll} disabled={readingAll}>
              {readingAll ? 'Lecture en cours…' : 'Lire toutes les URL API actives'}
            </button>
          </section>
        </div>

        <aside className="card preview-card perform-preview">
          <div className="section-title">
            <p className="eyebrow">Message final</p>
            <h2>Construction</h2>
          </div>

          <p className="help-text">Compose le texte lu pendant l’appel avec les variables. Exemple : “La carte est {'{zone1}'}. La couleur est {'{zone2}'}.”</p>

          <label>Template</label>
          <textarea rows={6} value={template} onChange={(event) => {
            setTemplate(event.target.value);
            setCallStarted(false);
            setResult(null);
          }} />

          <div className="variable-tokens">
            {DEADLINE_VARIABLES.map((variable) => (
              <button key={variable.id} className="ghost-button token-button" onClick={() => setTemplate((current) => `${current}${current.endsWith(' ') || !current ? '' : ' '}{${variable.id}}`)}>
                {'{'}{variable.id}{'}'}
              </button>
            ))}
          </div>

          <div className="message-preview-panel">
            <div className="preview-headline">
              <span>Prévisualisation du message final</span>
              <strong className={validation.ok ? 'preview-ready' : 'preview-locked'}>{validation.ok ? 'Prêt' : 'Verrouillé'}</strong>
            </div>
            <p className="final-message-preview">{readablePreview || 'Le message final apparaîtra ici.'}</p>
          </div>

          <div className="template-checklist">
            <div className="preview-headline">
              <span>Champs programmés</span>
              <strong>{usedVariableRows.length ? `${usedVariableRows.length} champ${usedVariableRows.length > 1 ? 's' : ''}` : 'Aucun champ'}</strong>
            </div>
            {usedVariableRows.length ? usedVariableRows.map((row) => (
              <div className={`template-row ${row.missing ? 'is-missing' : 'is-ready'}`} key={row.id}>
                <span>{row.token}</span>
                <strong>{row.missing ? `${row.label} manquante` : row.value}</strong>
                <em>{row.missing ? 'Manquant' : 'OK'}</em>
              </div>
            )) : (
              <p className="small no-fields">Aucune variable n’est utilisée dans le template. Tu peux écrire un message fixe ou ajouter un champ comme {'{zone1}'}.</p>
            )}
          </div>

          {validation.missing.length > 0 && (
            <div className="missing-box">
              <strong>Appel bloqué</strong>
              <p>À compléter avant tout appel : {validation.missing.join(', ')}.</p>
            </div>
          )}

          <div className="section-title trigger-title">
            <p className="eyebrow">Déclenchement</p>
            <h2>Envoi</h2>
          </div>

          <div className="form-row">
            <div>
              <label>Mode</label>
              <select value={triggerMode} onChange={(event) => {
                setTriggerMode(event.target.value === 'auto' ? 'auto' : 'manual');
                autoScheduledRef.current = '';
                setCountdown(null);
              }}>
                <option value="manual">Manuel</option>
                <option value="auto">Automatique quand tout est prêt</option>
              </select>
            </div>
            <div>
              <label>Délai en secondes</label>
              <input
                type="number"
                min={0}
                max={300}
                value={delaySeconds}
                onChange={(event) => setDelaySeconds(Math.max(0, Math.min(300, Number(event.target.value) || 0)))}
              />
            </div>
          </div>

          <label>Format d’appel</label>
          <select value={callType} onChange={(event) => setCallType(event.target.value)}>
            {DEADLINE_CALL_TYPES.map((type) => (
              <option key={type.id} value={type.id}>{type.name} · {type.cost} crédit{type.cost > 1 ? 's' : ''}</option>
            ))}
          </select>
          <p className="small">{selectedCallType.description}</p>

          {countdown !== null && (
            <div className="countdown-box">
              Déclenchement automatique dans <strong>{countdown}s</strong>
            </div>
          )}

          <button className="primary-button danger-action" onClick={() => startCall('manual')} disabled={!validation.ok || callLoading || callStarted}>
            {callLoading ? 'Déclenchement…' : callStarted ? 'Session déjà déclenchée' : 'Déclencher l’appel'}
          </button>

          <button className="ghost-button full-width" onClick={newSession}>Nouvelle session</button>

          {notice && <p className="small notice-text">{notice}</p>}

          {result && (
            <div className={`result-card embedded-result ${result.ok ? 'result-ok' : 'result-error'}`}>
              <strong>{result.ok ? 'Appel envoyé' : 'Appel non lancé'}</strong>
              <p>{result.error || result.message || result.statusLabel || 'Demande transmise.'}</p>
              {result.phoneMasked && <span>{result.phoneMasked}</span>}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
