'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [key, setKey] = useState('');
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('Test Dead Line');
  const [message, setMessage] = useState('Je savais que tu penserais à la dame de cœur.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

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
        body: JSON.stringify({ phone, label, message }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ ok: false, error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Dead Line — Dashboard MVP</h1>
      <p className="small">Premier test : un vrai appel Twilio avec un message vocal choisi.</p>

      <div className="card">
        <label>Clé admin MVP</label>
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="DEADLINE_ADMIN_KEY" />

        <label>Numéro à appeler</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33612345678" />

        <label>Nom du test / routine</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />

        <label>Message vocal</label>
        <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />

        <button onClick={startCall} disabled={loading}>{loading ? 'Appel en cours...' : 'Déclencher l’appel'}</button>
      </div>

      {result && (
        <div className="card">
          <h2>Résultat</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}
