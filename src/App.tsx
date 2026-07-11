import { ArrowRight, CheckCircle2, HeartHandshake, Users } from 'lucide-react';
import type { FormEvent } from 'react';
import { Header } from './components/Header';
import { SectionHeading } from './components/SectionHeading';
import { foundingHeroPlaceholders, foundingHeroRoles, platformFeatures, roadmap } from './data/siteContent';

function HomePage() {
  return (
    <main id="top">
      <section className="hero section-grid" aria-labelledby="hero-title">
        <div className="hero__content">
          <p className="eyebrow">More than rebuilding a life. Building a movement.</p>
          <h1 id="hero-title">Building in public from financial rock bottom.</h1>
          <p className="hero__lede">
            Bankrupt to 1 Million is a living documentary, community platform and venture story about rebuilding honestly — one story,
            one connection and one feature at a time.
          </p>
          <div className="hero__actions" aria-label="Primary calls to action">
            <a className="button" href="#contribute">
              Become a founding builder <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button--ghost" href="#story">
              Read the mission
            </a>
          </div>
        </div>
        <aside className="hero-card" aria-label="Project belief">
          <HeartHandshake aria-hidden="true" />
          <blockquote>No one rebuilds alone.</blockquote>
          <p>
            The platform exists to help the right people find each other through trust, collaboration and human connection.
          </p>
        </aside>
      </section>

      <section className="section section-grid" id="story" aria-labelledby="story-title">
        <SectionHeading eyebrow="The story" title="A real journey in progress" titleId="story-title">
          Kevin De Vlieger and Micha are starting from financial rock bottom and choosing to build publicly instead of waiting for a perfect moment.
        </SectionHeading>
        <div className="story-panel">
          <p>
            This website is designed to feel human, cinematic, editorial and warm — a credible home for transparent founder updates,
            contribution opportunities, documentary moments and future ventures.
          </p>
          <p>
            The goal is not to manufacture a polished success story after the fact. The goal is to invite builders, creators,
            supporters and partners into the rebuild while the outcome is still being shaped.
          </p>
        </div>
      </section>

      <section className="section" id="platform" aria-labelledby="platform-title">
        <SectionHeading eyebrow="Platform vision" title="The full product scaffold" titleId="platform-title">
          The long-term platform combines storytelling, community recognition, partnership pathways and a public roadmap into one coherent experience.
        </SectionHeading>
        <div className="feature-grid">
          {platformFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="feature-card" key={feature.title}>
                <Icon aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section section-grid" id="roadmap" aria-labelledby="roadmap-title">
        <SectionHeading eyebrow="Build path" title="Progressive, issue-led growth" titleId="roadmap-title">
          The scaffold supports small, focused contributions today while leaving room for future pages, integrations and content systems.
        </SectionHeading>
        <ol className="roadmap-list">
          {roadmap.map((item) => (
            <li key={item.phase}>
              <span>{item.phase}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section contribute" id="contribute" aria-labelledby="contribute-title">
        <div>
          <p className="eyebrow">Founding builders</p>
          <h2 id="contribute-title">Build one meaningful feature.</h2>
          <p>
            Contributors can help with components, pages, forms, accessibility, documentation, testing workflows, translations and future integrations.
            Every focused contribution becomes part of the public history of the movement.
          </p>
        </div>
        <div className="contribute__actions">
          <a className="button" href="https://github.com/MyMindVentures/BankruptTo1Million/issues">
            <Users aria-hidden="true" size={18} /> Browse open issues
          </a>
          <a className="button button--ghost" href="https://github.com/MyMindVentures/BankruptTo1Million#how-to-contribute">
            <CheckCircle2 aria-hidden="true" size={18} /> Contribution guide
          </a>
        </div>
      </section>
    </main>
  );
}

function FoundingHeroesPage() {
  return (
    <main id="top" className="founding-page">
      <section className="hero founding-hero section-grid" aria-labelledby="founding-hero-title">
        <div className="hero__content">
          <p className="eyebrow">Founding Heroes</p>
          <h1 id="founding-hero-title">Belief before proof.</h1>
          <p className="hero__lede">
            This future wall will recognize the early builders who chose to contribute before the outcome was certain.
            It is a quiet public thank you for useful work, courage and trust.
          </p>
          <div className="hero__actions" aria-label="Founding Heroes calls to action">
            <a className="button" href="/become-a-founding-hero">
              Become a Founding Hero <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button--ghost" href="#founding-hero-profiles">
              View future profiles
            </a>
          </div>
        </div>
        <aside className="hero-card founding-hero__note" aria-label="Recognition principle">
          <HeartHandshake aria-hidden="true" />
          <blockquote>Recognition without performance.</blockquote>
          <p>
            Profiles will only appear with permission and will focus on meaningful contributions, not rankings, points or invented social proof.
          </p>
        </aside>
      </section>

      <section className="section section-grid" aria-labelledby="recognition-title">
        <SectionHeading eyebrow="Recognition" title="A permanent place for early trust" titleId="recognition-title">
          Founding Heroes are people who help shape the foundation: code, design, writing, testing, accessibility, introductions and practical support.
        </SectionHeading>
        <div className="story-panel">
          <p>
            The page shell is intentionally honest today. It creates the structure for recognition without pretending that profiles,
            numbers or testimonials already exist.
          </p>
          <p>
            As the project grows, this chapter can hold approved contributor stories, public or anonymous recognition and the context behind each contribution.
          </p>
        </div>
      </section>

      <section className="section" id="founding-hero-profiles" aria-labelledby="profile-slots-title">
        <SectionHeading eyebrow="Future profiles" title="Profile slots for later contributors" titleId="profile-slots-title">
          These placeholders reserve space for permission-first editorial profiles once real contributors choose how they want to be recognized.
        </SectionHeading>
        <div className="placeholder-grid">
          {foundingHeroPlaceholders.map((slot) => (
            <article className="placeholder-card" key={slot.title}>
              <span>{slot.label}</span>
              <h3>{slot.title}</h3>
              <p>{slot.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-grid" id="founding-hero-roles" aria-labelledby="roles-title">
        <SectionHeading eyebrow="Open roles" title="Useful ways to help next" titleId="roles-title">
          The first opportunities stay small, practical and issue-led so contributors can build one meaningful feature at a time.
        </SectionHeading>
        <ul className="role-list" aria-label="Future open role categories">
          {foundingHeroRoles.map((role) => (
            <li key={role.title}>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function BecomeFoundingHeroPage() {
  const handlePreviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <main id="top" className="application-page">
      <section className="hero application-hero section-grid" aria-labelledby="application-hero-title">
        <div className="hero__content">
          <p className="eyebrow">Founding Hero application</p>
          <h1 id="application-hero-title">Start with one honest contribution.</h1>
          <p className="hero__lede">
            This page is the first public shell for people who want to help shape Bankrupt to 1 Million before the outcome is certain.
            The form is not connected yet, so it clearly explains the next structure without pretending a submission was sent.
          </p>
        </div>
        <aside className="hero-card application-hero__note" aria-label="Application status">
          <CheckCircle2 aria-hidden="true" />
          <blockquote>Not connected yet.</blockquote>
          <p>
            The application flow is frontend-only for now. A real submission step will be added only after privacy, storage and backend handling are configured.
          </p>
        </aside>
      </section>

      <section className="section section-grid" aria-labelledby="application-context-title">
        <SectionHeading eyebrow="Before you apply" title="Choose the way you can help" titleId="application-context-title">
          Founding Heroes can support the mission through voluntary contribution, practical resources, sponsorship, investment interest or commercial collaboration depending on the role.
        </SectionHeading>
        <div className="story-panel application-note">
          <h3>Privacy first</h3>
          <p>
            Share only information you are comfortable providing. Public recognition will always require permission, and sensitive contact details should never appear on the Founding Heroes Wall.
          </p>
          <h3>Participation models</h3>
          <p>
            Some roles may be volunteer or in-kind support. Others may become sponsored, invested or commercial only through a separate written agreement.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="application-form-title">
        <SectionHeading eyebrow="Form shell" title="Structured application preview" titleId="application-form-title">
          Later issues will add fields, validation and Supabase submission. This issue establishes the accessible page and form structure only.
        </SectionHeading>

        <form className="application-form" aria-describedby="application-form-status" onSubmit={handlePreviewSubmit}>
          <fieldset>
            <legend>Your identity</legend>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="founding-hero-name">Name</label>
                <input
                  id="founding-hero-name"
                  name="name"
                  type="text"
                  placeholder="Your name or public alias"
                  aria-describedby="founding-hero-name-help"
                  disabled
                />
                <p id="founding-hero-name-help">Identity fields will be finalized in a follow-up issue.</p>
              </div>
              <div className="form-field">
                <label htmlFor="founding-hero-email">Email</label>
                <input
                  id="founding-hero-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  aria-describedby="founding-hero-email-help"
                  disabled
                />
                <p id="founding-hero-email-help">Used only for application follow-up after backend storage is configured.</p>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>How you want to contribute</legend>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="founding-hero-participation">Participation type</label>
                <select
                  id="founding-hero-participation"
                  name="participation"
                  aria-describedby="founding-hero-participation-help"
                  disabled
                  defaultValue=""
                >
                  <option value="">Choose a future option</option>
                  <option>Volunteer contribution</option>
                  <option>In-kind support</option>
                  <option>Sponsored support</option>
                  <option>Investment interest</option>
                  <option>Commercial collaboration</option>
                </select>
                <p id="founding-hero-participation-help">These models explain intent only and do not create an automatic agreement.</p>
              </div>
              <div className="form-field">
                <label htmlFor="founding-hero-role">Contribution focus</label>
                <input
                  id="founding-hero-role"
                  name="role"
                  type="text"
                  placeholder="Frontend, writing, testing, hosting..."
                  aria-describedby="founding-hero-role-help"
                  disabled
                />
                <p id="founding-hero-role-help">Role selection will be implemented in a separate focused issue.</p>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Motivation and consent</legend>
            <div className="form-field">
              <label htmlFor="founding-hero-message">Why this mission fits you</label>
              <textarea
                id="founding-hero-message"
                name="message"
                placeholder="A short note about the contribution you want to make"
                aria-describedby="founding-hero-message-help"
                disabled
              />
              <p id="founding-hero-message-help">Long-form fields, validation and consent controls are intentionally out of scope here.</p>
            </div>
            <div className="form-field consent-field">
              <div className="consent-field__control">
                <input
                  id="founding-hero-recognition-consent"
                  name="publicRecognitionConsent"
                  type="checkbox"
                  aria-describedby="founding-hero-recognition-consent-help"
                  disabled
                />
                <label htmlFor="founding-hero-recognition-consent">I may want public recognition later</label>
              </div>
              <p id="founding-hero-recognition-consent-help">
                Public recognition will require separate confirmation before anything is published on the Founding Heroes Wall.
              </p>
            </div>
          </fieldset>

          <div className="form-status" id="application-form-status" role="status">
            <strong>Submissions are not open yet.</strong>
            <span>This shell is intentionally disabled until secure storage, privacy handling and real submission logic are configured.</span>
          </div>
          <button className="button" type="submit" disabled>
            Submit application later
          </button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const path = window.location.pathname;

  return (
    <>
      <Header />
      {path === '/founding-heroes' ? (
        <FoundingHeroesPage />
      ) : path === '/become-a-founding-hero' ? (
        <BecomeFoundingHeroPage />
      ) : (
        <HomePage />
      )}
    </>
  );
}

export default App;
