export default function Home() {
  return (
    <main className="home-shell">
      <section className="landing-card">
        <p className="kicker">Dead Line</p>
        <h1>L’appel impossible.</h1>
        <p>
          Un outil discret pour envoyer une révélation vocale au bon moment. Pensé pour les magiciens et mentalistes en conditions réelles.
        </p>
        <div className="landing-actions">
          <a className="primary-link" href="/perform">Mode performance</a>
          <a className="ghost-button landing-ghost" href="/dashboard">Dashboard</a>
        </div>
      </section>
    </main>
  );
}
