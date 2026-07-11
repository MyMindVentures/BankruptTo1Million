import { ArrowRight, CheckCircle2, HeartHandshake, Users } from 'lucide-react';
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
            <a className="button" href="#founding-hero-roles">
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

function App() {
  const isFoundingHeroesRoute = window.location.pathname === '/founding-heroes';

  return (
    <>
      <Header />
      {isFoundingHeroesRoute ? <FoundingHeroesPage /> : <HomePage />}
    </>
  );
}

export default App;
