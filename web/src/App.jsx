import logo from './assets/logo.jpg';

const featureCards = [
  {
    title: 'Smart Check-Ins',
    body:
      'Set a simple schedule and HomeAlone handles the rest. If you are active, the check-in slides forward so alerts happen only when they are truly needed.',
  },
  {
    title: 'Full-Screen Safety Alerts',
    body:
      'When a check-in is due, the alert shows up boldly with sound so it is easy to respond in time, even when the phone is locked.',
  },
  {
    title: 'Escalation That Makes Sense',
    body:
      'No response triggers a calm, step-by-step escalation to trusted contacts or providers with clear context.',
  },
  {
    title: 'Privacy-First Design',
    body:
      'We only use the minimum signals needed to keep someone safe. No tracking, no noisy alerts, just the essentials.',
  },
  {
    title: 'Provider Ready',
    body:
      'Designed so home support teams can offer HomeAlone as a simple, affordable service to clients who live independently.',
  },
];

const steps = [
  {
    label: '1',
    title: 'Set the check-in plan',
    body: 'Choose a routine that matches daily life. HomeAlone keeps it simple and flexible.',
  },
  {
    label: '2',
    title: 'Stay active, stay uninterrupted',
    body: 'If the person uses their phone, the timer quietly resets. No unnecessary prompts.',
  },
  {
    label: '3',
    title: 'Respond when it matters',
    body: 'If a check-in is due, a bold alert asks for a quick response to confirm everything is okay.',
  },
  {
    label: '4',
    title: 'Escalate with confidence',
    body: 'If there is no response, HomeAlone notifies the care network with the right details.',
  },
];

export default function App() {
  return (
    <div className="page">
      <header className="nav">
        <div className="logo-block">
          <img src={logo} alt="HomeAlone logo" className="logo" />
          <div>
            <p className="brand">HomeAlone</p>
            <span className="brand-tag">Safety check-ins for independent living</span>
          </div>
        </div>
        <nav className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#demo">Demo</a>
          <a href="#providers">Providers</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">Home safety, without the constant worry</p>
            <h1>
              A calm, modern check-in system that keeps people safe while they live independently.
            </h1>
            <p className="hero-body">
              HomeAlone delivers gentle, automated safety check-ins and escalates only when needed. It is
              designed for families, support providers, and anyone who wants confidence without invasive
              monitoring.
            </p>
            <div className="cta-row">
              <a className="btn primary" href="#contact">
                Get the pre-launch test version
              </a>
              <a className="btn secondary" href="#providers">
                Bring HomeAlone to your care menu
              </a>
            </div>
            <p className="cta-note">
              Contact us to lock in a founding price forever, or share your provider details and we will
              follow up directly.
            </p>
          </div>
          <div className="hero-card">
            <div className="hero-copy">
              <h3>Confidence without the noise</h3>
              <p>
                HomeAlone quietly adapts to real life. It notices activity, delays unnecessary alerts,
                and keeps the safety check-in calm for everyone involved.
              </p>
              <div className="hero-pill-row">
                <span>Personalized schedules</span>
                <span>Silent activity sensing</span>
                <span>Clear escalation paths</span>
              </div>
            </div>
            <div className="hero-triangles">
              <div className="triangle-card">
                <h4>Personalized schedules</h4>
                <p>Check-ins adjust to real routines so alerts feel natural.</p>
              </div>
              <div className="triangle-card">
                <h4>Silent activity sensing</h4>
                <p>Light signals delay alerts when the phone is in use.</p>
              </div>
              <div className="triangle-card">
                <h4>Clear escalation paths</h4>
                <p>When needed, trusted contacts receive timely updates.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section alt" id="how">
          <div className="section-header">
            <p className="eyebrow">How it works</p>
            <h2>Support that respects independence</h2>
            <p>
              HomeAlone stays quiet in the background and only speaks up when the moment truly matters.
            </p>
          </div>
          <div className="steps">
            {steps.map(step => (
              <div key={step.label} className="step-card">
                <div className="step-label">{step.label}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="features">
          <div className="section-header">
            <p className="eyebrow">Features</p>
            <h2>Everything you need to feel secure</h2>
            <p>
              Designed with real care teams in mind, HomeAlone keeps the experience calm, helpful, and
              reliable.
            </p>
          </div>
          <div className="feature-grid">
            {featureCards.map(feature => (
              <div key={feature.title} className="feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section demo alt" id="demo">
          <div className="section-header">
            <p className="eyebrow">Demo</p>
            <h2>See the experience in action</h2>
            <p>
              A full walkthrough video will be shared here. For now, this placeholder represents the
              upcoming product demo.
            </p>
          </div>
          <div className="video-placeholder">
            <div className="video-frame">
              <div className="video-badge">Demo video placeholder</div>
              <div className="video-grid">
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section investors" id="investors">
          <div className="section-header">
            <p className="eyebrow">Investors</p>
            <h2>Interested in the next generation of independent living?</h2>
            <p>
              We are opening a limited investor conversation for mission-aligned partners. If you are
              exploring investment or strategic partnerships, we would love to connect.
            </p>
          </div>
          <div className="investor-card">
            <div>
              <h3>Let’s talk</h3>
              <p>
                We are raising to expand pilots, deepen provider partnerships, and build a trusted
                safety platform for independent living.
              </p>
            </div>
            <a className="btn secondary" href="#contact">
              Contact the founders
            </a>
          </div>
        </section>

        <section className="section providers alt" id="providers">
          <div className="section-header">
            <p className="eyebrow">For providers</p>
            <h2>Add HomeAlone to your care offering</h2>
            <p>
              Home support providers can offer HomeAlone as a lightweight safety layer for independent
              clients. We help you integrate quickly, and we keep it affordable.
            </p>
          </div>
          <div className="cta-panel">
            <div>
              <h3>Provider partnership</h3>
              <ul>card
                <li>Simple onboarding for clients</li>
                <li>Clear escalation pathways</li>
                <li>Founding pricing locked in</li>
              </ul>
            </div>
            <div className="provider-cta">
              <p>Ask your home support provider to contact HomeAlone for menu inclusion.</p>
              <a className="btn primary" href="#contact">
                Share provider details
              </a>
            </div>
          </div>
        </section>

        <section className="section founding" id="contact">
          <div className="section-header">
            <p className="eyebrow">Founding offer</p>
            <h2>Get the pre-launch test version</h2>
            <p>
              We are opening a small founding group for early adopters. Join now to help shape the
              product and lock in a founding price forever.
            </p>
          </div>
          <div className="cta-panel">
            <div>
              <h3>Request early access</h3>
              <p>
                Email us with your name, location, and preferred check-in schedule. We will respond with
                onboarding details and the founding offer.
              </p>
            </div>
            <div className="cta-actions">
              <a className="btn primary" href="mailto:investors@homealoneapp.com">
                Email investors@homealoneapp.com
              </a>
              <span className="small">We respond within 24 hours.</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <p className="brand">HomeAlone</p>
          <span className="brand-tag">Safety check-ins for independent living</span>
        </div>
        <div>
          <p>Contact: investors@homealoneapp.com</p>
          <p>Developer: saurab.developer@gmail.com</p>
          <p>© 2026 HomeAlone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
