'use client';

import { useMemo, useState } from 'react';
import { DEADLINE_CALL_TYPES, DEADLINE_PRESETS, getCallTypeById, getPresetById } from '@/lib/deadlineConfig';

type RecentCall = {
  id: string;
  phone: string;
  phoneMasked: string;
  label: string;
  message: string;
  status: string;
  statusLabel: string;
  createdAt: number;
  updatedAt: number;
  duration: string;
  presetId: string;
  callType: string;
  callTypeLabel: string;
  cost: number;
  twilioSidShort: string;
};

type ApiResult = {
  ok: boolean;
  error?: string;
  callId?: string;
  status?: string;
  statusLabel?: string;
  phoneMasked?: string;
  cost?: number;
  callType?: string;
  twilioSidShort?: string;
  message?: string;
};

function formatDate(timestamp: number) {
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function statusTone(status: string) {
  if (['completed'].includes(status)) return 'success';
  if (['ringing', 'answered', 'in-progress', 'answered_or_voice_requested'].includes(status)) return 'live';
  if (['failed', 'busy', 'no-answer', 'canceled', 'error', 'config_error'].includes(status)) return 'danger';
  return 'neutral';
}

export default function Dashboard() {
  const firstPreset = DEADLINE_PRESETS[0];
  const [key, setKey] = useState('');
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState(firstPreset.defaultLabel);
  const [message, setMessage] = useState(firstPreset.defaultMessage);
  const [presetId, setPresetId] = useState(firstPreset.id);
  const [callType, setCallType] = useState('revelation');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [history, setHistory] = useState<RecentCall[]>([]);
  const [historyError, setHistoryError] = useState('');

  const selectedCallType = useMemo(() => getCallTypeById(callType), [callType]);
  const selectedPreset = useMemo(() => getPresetById(presetId), [presetId]);
  const messageLength = message.trim().length;

  function applyPreset(nextPresetId: string) {
    const preset = getPresetById(nextPresetId);
    setPresetId(preset.id);
    setLabel(preset.defaultLabel);
    setMessage(preset.defaultMessage);
    setResult(null);
  }

  async function loadHistory() {
    if (!key.trim()) {
      setHistoryError('Entre la clé admin pour charger l’historique.');
      return;
    }

    setHistoryLoading(true);
    setHistoryError('');

    try {
      const res = await fetch('/api/calls/recent', {
        headers: { 'x-deadline-key': key },
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Impossible de charger l’historique.');
      }

      setHistory(data.calls || []);
    } catch (error: any) {
      setHistoryError(error?.message || 'Impossible de charger l’historique.');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function startCall() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/call/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-deadline-key': key,
        },
        body: JSON.stringify({
          phone,
          label,
          message,
          presetId,
          callType,
        }),
      });

      const data = await res.json();
      setResult(data);

      if (res.ok && data.ok) {
        loadHistory();
      }
    } catch (error: any) {
      setResult({ ok: false, error: error?.message || 'Impossible de lancer l’appel.' });
    } finally {
      setLoading(false);
    }
  }

  function duplicateCall(call: RecentCall) {
    setPhone(call.phone || '');
    setLabel(call.label || selectedPreset.defaultLabel);
    setMessage(call.message || selectedPreset.defaultMessage);
    setPresetId(getPresetById(call.presetId).id);
    setCallType(getCallTypeById(call.callType).id);
    setResult({ ok: true, message: 'Appel dupliqué dans le formulaire. Rien n’a été relancé automatiquement.' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="dashboard-shell">
      <section className="hero">
        <div>
          <p className="kicker">Dead Line</p>
          <h1>L’appel impossible, prêt pour la scène.</h1>
          <p className="hero-text">
            Déclenche un vrai appel vocal, avec un message court, mystérieux et contrôlé. Pensé pour un usage pro en mentalisme, pas pour un prank call.
          </p>
        </div>
        <div className="hero-panel" aria-label="Statut MVP">
          <span className="pulse" />
          <strong>MVP opérationnel</strong>
          <span>Twilio Voice + Firebase RTDB</span>
          <a className="ghost-button panel-link" href="/perform">Mode performance</a>
        </div>
      </section>

      <section className="grid two-cols">
        <div className="card command-card">
          <div className="section-title">
            <p className="eyebrow">Déclenchement</p>
            <h2>Préparer l’appel</h2>
          </div>

          <label>Clé admin</label>
          <input
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="DEADLINE_ADMIN_KEY"
            type="password"
            autoComplete="off"
          />

          <label>Numéro à appeler</label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+33612345678"
            inputMode="tel"
          />

          <label>Nom de routine</label>
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Routine dame de cœur" />

          <div className="form-row">
            <div>
              <label>Scénario</label>
              <select value={presetId} onChange={(event) => applyPreset(event.target.value)}>
                {DEADLINE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Format d’appel</label>
              <select value={callType} onChange={(event) => setCallType(event.target.value)}>
                {DEADLINE_CALL_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>{type.name} · {type.cost} crédit{type.cost > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <label>Message vocal</label>
          <textarea rows={7} value={message} onChange={(event) => setMessage(event.target.value)} />

          <div className="meta-line">
            <span>{selectedPreset.eyebrow}</span>
            <span>{messageLength} caractères</span>
          </div>

          <button className="primary-button" onClick={startCall} disabled={loading}>
            {loading ? 'Déclenchement en cours…' : 'Déclencher l’appel'}
          </button>
        </div>

        <aside className="card preview-card">
          <div className="section-title">
            <p className="eyebrow">Format</p>
            <h2>{selectedCallType.name}</h2>
          </div>
          <p>{selectedCallType.description}</p>
          <div className="credit-box">
            <span>Coût préparé</span>
            <strong>{selectedCallType.cost} crédit{selectedCallType.cost > 1 ? 's' : ''}</strong>
          </div>
          <div className="script-preview">
            <span>Texte qui sera lu</span>
            <p>{message || 'Le message vocal apparaîtra ici.'}</p>
          </div>
          <p className="small warning-note">
            Le bouton déclenche un vrai appel. Vérifie toujours le numéro avant utilisation en spectacle.
          </p>
        </aside>
      </section>

      {result && (
        <section className={`card result-card ${result.ok ? 'result-ok' : 'result-error'}`}>
          <div>
            <p className="eyebrow">Résultat</p>
            <h2>{result.ok ? 'Appel envoyé' : 'Appel non lancé'}</h2>
          </div>
          <p>{result.error || result.message || 'La demande a été transmise à Twilio.'}</p>
          {result.ok && (
            <div className="result-grid">
              <span>Statut : <strong>{result.statusLabel || result.status || 'En file'}</strong></span>
              <span>Numéro : <strong>{result.phoneMasked || '—'}</strong></span>
              <span>Coût : <strong>{result.cost || selectedCallType.cost} crédit{(result.cost || selectedCallType.cost) > 1 ? 's' : ''}</strong></span>
              {result.twilioSidShort && <span>Twilio : <strong>{result.twilioSidShort}</strong></span>}
            </div>
          )}
        </section>
      )}

      <section className="card history-card">
        <div className="history-head">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>Derniers appels</h2>
          </div>
          <button className="secondary-button" onClick={loadHistory} disabled={historyLoading}>
            {historyLoading ? 'Chargement…' : 'Rafraîchir'}
          </button>
        </div>

        {historyError && <p className="inline-error">{historyError}</p>}

        {!history.length && !historyError && (
          <p className="small">Entre la clé admin puis clique sur “Rafraîchir” pour afficher les 20 derniers appels.</p>
        )}

        <div className="history-list">
          {history.map((call) => (
            <article className="call-row" key={call.id}>
              <div className="call-main">
                <div className="call-title-line">
                  <strong>{call.label}</strong>
                  <span className={`status-pill ${statusTone(call.status)}`}>{call.statusLabel}</span>
                </div>
                <p>{call.message}</p>
                <div className="call-meta">
                  <span>{formatDate(call.createdAt)}</span>
                  <span>{call.phoneMasked}</span>
                  <span>{call.callTypeLabel || getCallTypeById(call.callType).name} · {call.cost} crédit{call.cost > 1 ? 's' : ''}</span>
                  {call.duration && <span>{call.duration}s</span>}
                </div>
              </div>
              <button className="ghost-button" onClick={() => duplicateCall(call)}>Dupliquer</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
