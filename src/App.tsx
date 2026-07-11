import { ArrowRight, CheckCircle2, Github, HeartHandshake } from 'lucide-react';
import { Header } from './components/Header';
import { SectionHeading } from './components/SectionHeading';
import { platformFeatures, roadmap } from './data/siteContent';

function App() {
  return (
    <>
      <Header />
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
              <Github aria-hidden="true" size={18} /> Browse open issues
            </a>
            <a className="button button--ghost" href="https://github.com/MyMindVentures/BankruptTo1Million#how-to-contribute">
              <CheckCircle2 aria-hidden="true" size={18} /> Contribution guide
            </a>
          </div>
        </section>
      </main>
    </>
  );
}

export default App;
