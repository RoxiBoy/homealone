import logo from '../assets/logo.jpg';
import heroSafetyNet from '../assets/hero-safety-net.png';
import drJohnStory from '../assets/dr-john-story.png';
import solutionAppMonitoring from '../assets/solution-app-monitoring.png';
import howItWorksMockup from '../assets/how-it-works-phone-mockup.png';
import whoItsForCollage from '../assets/who-its-for-collage.png';
import providersPartnership from '../assets/providers-partnership.png';
import investorsMission from '../assets/investors-mission.png';
import testimonialFamily from '../assets/testimonial-family.png';
import promiseBg from '../assets/promise-peace-of-mind-bg.png';

const whyHomeAlone = [
  'No devices to wear',
  'No hardware installation',
  'Works anywhere with a smartphone',
  'Affordable monthly subscription',
  'Designed for privacy',
];

const howSteps = [
  {
    title: '1. Install the App',
    body: 'Download HomeAlone to your smartphone.',
  },
  {
    title: '2. Set up monitoring and contacts',
    body: 'Select your personal monitoring timing and add the people we should contact if something seems wrong.',
  },
  {
    title: '3. Go about your normal day',
    body: 'The app monitors normal activity and asks if you are ok if something unusual happens.',
  },
  {
    title: '4. Smart Alert',
    body: 'If you cannot respond to the alarm, your trusted contact receives a call, sms and email from you, asking them to check on you.',
  },
];

function NpIcon({ name }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'np-icon',
    'aria-hidden': true,
  };

  const icons = {
    shield: (
      <>
        <path d="M12 3l7 3v5c0 5-3.5 9.5-7 10-3.5-.5-7-5-7-10V6l7-3z" />
      </>
    ),
    bell: (
      <>
        <path d="M8.5 10.5V8a3.5 3.5 0 117 0v2.5c0 .9.3 1.7.9 2.4l1 1.1H6.6l1-1.1c.6-.7.9-1.5.9-2.4z" />
        <path d="M10.5 16a1.5 1.5 0 003 0" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="9" r="2.5" />
        <circle cx="16" cy="10" r="2" />
        <path d="M4.8 17.5c.6-2 2.4-3.2 4.2-3.2s3.6 1.2 4.2 3.2" />
        <path d="M13.5 17.3c.4-1.5 1.8-2.5 3.2-2.5s2.8 1 3.2 2.5" />
      </>
    ),
    phone: (
      <>
        <rect x="8" y="3.5" width="8" height="17" rx="2" />
        <path d="M11 6h2" />
        <circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
      </>
    ),
    pulse: (
      <>
        <path d="M3 12h4l2-4 3 8 2-4h7" />
      </>
    ),
    mail: (
      <>
        <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
        <path d="M4 7l8 6 8-6" />
      </>
    ),
    play: (
      <>
        <rect x="3.5" y="5" width="17" height="14" rx="2" />
        <path d="M11 10l4 2.5-4 2.5V10z" />
      </>
    ),
    star: (
      <>
        <path d="M12 3.8l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8L12 3.8z" />
      </>
    ),
    building: (
      <>
        <rect x="5" y="4" width="14" height="16" rx="1.5" />
        <path d="M9 8h1M14 8h1M9 11h1M14 11h1M9 14h1M14 14h1M11.5 20v-3h1v3" />
      </>
    ),
    chart: (
      <>
        <path d="M4 18h16" />
        <path d="M6 15l4-4 3 2 5-6" />
      </>
    ),
    quote: (
      <>
        <path d="M9.5 9H7.2a2.2 2.2 0 00-2.2 2.2V14a2 2 0 002 2h2.5V9zM18.5 9h-2.3a2.2 2.2 0 00-2.2 2.2V14a2 2 0 002 2h2.5V9z" />
      </>
    ),
  };

  return <svg {...common}>{icons[name] ?? icons.shield}</svg>;
}

export default function NewPage() {
  return (
    <div className="np-page">
      <header className="np-nav">
        <div className="np-logo-block">
          <img src={logo} alt="HomeAlone logo" className="np-logo" />
          <div>
            <p className="np-brand">HomeAlone</p>
            <p className="np-brand-tag">A safety net for people who live alone</p>
          </div>
        </div>
        <nav className="np-links">
          <a href="#np-how">How It Works</a>
          <a href="#np-pricing">Pricing</a>
          <a href="#np-providers">Providers</a>
          <a href="#np-investors">Investors</a>
          <a href="#np-contact">Contact</a>
        </nav>
      </header>

      <main className="np-main">
        <section className="np-section np-hero np-white" id="np-home">
          <div className="np-shell np-hero-grid">
            <div className="np-content np-hero-content">
              <h1>A Safety Net for People Who Live Alone</h1>
              <p className="np-subheadline">
                HomeAlone is a simple smartphone app that alerts someone you trust if something might be
                wrong.
              </p>
              <div className="np-actions">
                <a
                  className="np-btn np-btn-primary"
                  href="mailto:investors@homealoneapp.com?subject=Start%20Free%20Trial"
                >
                  Start Free Trial
                </a>
                <a className="np-btn np-btn-secondary" href="#np-how">
                  Learn How It Works
                </a>
              </div>
            </div>
            <div className="np-hero-media">
              <img src={heroSafetyNet} alt="Older adult using HomeAlone comfortably at home" className="np-photo np-photo-hero" />
            </div>
          </div>
        </section>

        <section className="np-section np-orange" id="np-problem">
          <div className="np-shell">
            <div className="np-content">
              <div className="np-heading">
                <NpIcon name="pulse" />
                <h2>Living Alone Has Hidden Risks</h2>
              </div>
              <p>More people than ever live alone.</p>
              <p>
                If something goes wrong - a fall, illness, or accident - it can take hours or even days
                before anyone notices.
              </p>
              <p>
                Traditional solutions like medical alarm pendants are expensive, inconvenient, and often
                forgotten.
              </p>
              <p>People living independently deserve a simple safety net.</p>
            </div>
            <aside className="np-problem-side">
              <div className="np-story-placeholder">
                <img src={drJohnStory} alt="Origin story illustration" className="np-photo np-photo-story" />
                <div className="np-story-title">
                  <NpIcon name="quote" />
                  <h3>The Origin Story</h3>
                </div>
                <p>Read how this idea began and why it matters so much.</p>
                <a className="np-story-link" href="/origin-story.html">
                  Read the full story
                </a>
              </div>
            </aside>
          </div>
        </section>

        <section className="np-section np-blue" id="np-solution">
          <div className="np-shell">
            <div className="np-content">
              <div className="np-heading">
                <NpIcon name="shield" />
                <h2>Meet HomeAlone</h2>
              </div>
              <p>HomeAlone is a smartphone app that quietly monitors your activity throughout the day.</p>
              <p>
                If activity suddenly stops for an unusual period, the app automatically sends a message to
                a trusted contact asking them to check on you.
              </p>
            </div>
            <img src={solutionAppMonitoring} alt="Illustration of quiet background monitoring on a phone" className="np-photo np-photo-solution" />
          </div>
          <div className="np-trust-strip">
            <div>
              <NpIcon name="pulse" />
              <span>Quiet background monitoring</span>
            </div>
            <div>
              <NpIcon name="bell" />
              <span>Smart alert if something unusual happens</span>
            </div>
            <div>
              <NpIcon name="users" />
              <span>Trusted contact receives a message</span>
            </div>
            <div>
              <NpIcon name="mail" />
              <span>Call, sms and email escalation if needed</span>
            </div>
          </div>
        </section>

        <section className="np-section np-white" id="np-how">
          <div className="np-shell np-shell-block">
            <div className="np-content">
              <div className="np-heading">
                <NpIcon name="play" />
                <h2>How It Works</h2>
              </div>
            </div>
            <div className="np-steps np-steps-centered">
              {howSteps.map(step => (
                <article className="np-step" key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
            <img src={howItWorksMockup} alt="Illustration of the HomeAlone phone flow" className="np-photo np-photo-how-wide" />
            <div className="np-demo-full">
              <NpIcon name="play" />
              <p>Leave a space on this page for an explainer and video link.</p>
            </div>
          </div>
        </section>

        <section className="np-section np-orange" id="np-who">
          <div className="np-shell np-shell-block">
            <div className="np-content">
              <div className="np-heading">
                <NpIcon name="users" />
                <h2>Who It&apos;s For</h2>
              </div>
              <p>
                HomeAlone is designed for people who value independence but want an added layer of safety.
              </p>
            </div>
            <img src={whoItsForCollage} alt="Collage of people and care contexts supported by HomeAlone" className="np-photo np-photo-who-full" />
          </div>
        </section>

        <section className="np-section np-blue" id="np-why">
          <div className="np-shell np-shell-block">
            <div className="np-content">
              <div className="np-heading">
                <NpIcon name="star" />
                <h2>Why HomeAlone?</h2>
              </div>
            </div>
            <ul className="np-check-list np-check-grid">
              {whyHomeAlone.map(item => (
                <li key={item}>✔ {item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="np-section np-white" id="np-pricing">
          <div className="np-shell np-shell-block">
            <div className="np-content">
              <div className="np-heading">
                <NpIcon name="chart" />
                <h2>Simple and Affordable</h2>
              </div>
              <p className="np-list-title">For early adopters:</p>
              <p>
                Start protecting yourself or someone you love for just $10 per month or $100 per year (paid
                up front)
              </p>
              <p>Lock in a lifetime guaranteed price now.</p>
              <p>No contracts - Cancel anytime.</p>
              <p>Prices will rise after official launch.</p>
            </div>
            <div className="np-price-card">
              <p>$10 per month</p>
              <p>$100 per year</p>
              <a
                className="np-btn np-btn-primary"
                href="mailto:investors@homealoneapp.com?subject=Start%20Free%20Trial"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </section>

        <section className="np-section np-orange" id="np-providers">
          <div className="np-shell">
            <div className="np-content">
              <div className="np-heading np-heading-providers">
                <NpIcon name="building" />
                <h2>Add HomeAlone to your care offering</h2>
              </div>
              <p>Home support providers can offer HomeAlone as part of your Home Support packages.</p>
              <p>Talk to us about how it works now.</p>
            </div>
            <div className="np-action-card">
              <img src={providersPartnership} alt="Provider and client discussing care support" className="np-photo np-photo-providers" />
            </div>
          </div>
        </section>

        <section className="np-section np-blue" id="np-investors">
          <div className="np-shell">
            <div className="np-content">
              <div className="np-heading">
                <NpIcon name="chart" />
                <h2>Investors</h2>
              </div>
              <p>
                We are happy to discuss ideas with individuals and organisations that share our aim to help
                save lives and provide comfort and would like to get involved. Country and area franchises
                will also be available soon. We would love to connect.
              </p>
            </div>
            <div className="np-action-card">
              <img src={investorsMission} alt="Mission-driven team collaboration for HomeAlone" className="np-photo np-photo-investors" />
              <a
                className="np-btn np-btn-secondary-light"
                href="mailto:investors@homealoneapp.com?subject=Investor%20Interest"
              >
                Click here to contact us now.
              </a>
            </div>
          </div>
        </section>

        <section className="np-section np-white np-promise" id="np-promise">
          <img src={promiseBg} alt="" className="np-promise-bg" aria-hidden="true" />
          <div className="np-shell np-shell-block">
            <div className="np-content">
              <h2>Peace of mind for just $10 per month.</h2>
            </div>
          </div>
        </section>

        <section className="np-section np-orange" id="np-contact">
          <div className="np-shell np-shell-block">
            <div className="np-content">
              <div className="np-heading">
                <NpIcon name="quote" />
                <h2>Some of our early testers and adopters have already been spreading the word.</h2>
              </div>
              <blockquote>
                &quot;I worry about my mum living alone. This gives me peace of mind.&quot;
              </blockquote>
              <img src={testimonialFamily} alt="Family reassurance moment showing peace of mind" className="np-photo np-photo-testimonial" />
              <div className="np-testimonial-space">
                leave space for more - later we will do some scrolling things with peoples pictures
              </div>
              <a
                className="np-btn np-btn-secondary-light"
                href="mailto:investors@homealoneapp.com?subject=Start%20Free%20Trial"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="np-footer">
        <div className="np-footer-brand">
          <img src={logo} alt="HomeAlone logo" className="np-footer-logo" />
          <div>
            <p className="np-footer-title">HomeAlone</p>
            <p className="np-footer-tag">A safety net for people who live alone</p>
          </div>
        </div>
        <div className="np-footer-contact">
          <p>
            Main Contact: <a href="mailto:investors@homealoneapp.com">investors@homealoneapp.com</a>
          </p>
          <p>
            Developer Contact: <a href="mailto:saurab.developer@gmail.com">saurab.developer@gmail.com</a>
          </p>
          <p>© 2026 HomeAlone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
