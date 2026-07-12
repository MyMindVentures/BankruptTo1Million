import { FileCheck2, Fingerprint, Globe2, LockKeyhole, Scale, ShieldCheck } from 'lucide-react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';

const sections = [
  { id: 'ownership', label: 'Ownership & IP', icon: Fingerprint },
  { id: 'terms', label: 'Terms of Use', icon: Scale },
  { id: 'privacy', label: 'Privacy', icon: LockKeyhole },
  { id: 'mission', label: 'Public Mission', icon: Globe2 },
] as const;

export function LegalTransparencyPage() {
  return (
    <>
      <Header />
      <div className="page-shell">
        <main id="top" className="legal-page">
          <section className="hero legal-hero section-grid" aria-labelledby="legal-title">
            <div className="hero__content">
              <p className="eyebrow">Legal & Transparency</p>
              <h1 id="legal-title">Clear ownership. Honest publication. Open collaboration.</h1>
              <p className="hero__lede">
                This page explains who owns the concepts and content published through Bankrupt to 1 Million,
                why the work is shared publicly, how visitors may use it, and how personal information is handled.
              </p>
              <nav className="legal-hero__nav" aria-label="Legal page sections">
                {sections.map(({ id, label, icon: Icon }) => (
                  <a key={id} href={`#${id}`}><Icon size={16} aria-hidden="true" /> {label}</a>
                ))}
              </nav>
            </div>
            <aside className="hero-card legal-hero__card">
              <ShieldCheck aria-hidden="true" />
              <blockquote>Public does not mean ownerless.</blockquote>
              <p>
                Publication creates visibility and opportunity. It does not transfer ownership or grant permission
                to copy, commercialize or present the work as someone else’s creation.
              </p>
            </aside>
          </section>

          <section className="section legal-summary" aria-label="Ownership summary">
            <article><span>Owner entity</span><strong>MyMindVentures.io</strong></article>
            <article><span>Owner & CEO</span><strong>Kevin De Vlieger</strong></article>
            <article><span>Identification</span><strong>NIE Y8541916Y</strong></article>
            <article><span>Based in</span><strong>Alicante, Spain</strong></article>
          </section>

          <div className="section legal-content">
            <section id="ownership" className="legal-section" aria-labelledby="ownership-title">
              <div className="legal-section__heading"><Fingerprint aria-hidden="true" /><div><p className="eyebrow">01 · Ownership</p><h2 id="ownership-title">Ownership & Intellectual Property Notice</h2></div></div>
              <div className="legal-section__body">
                <p>
                  Unless explicitly stated otherwise, every concept, venture idea, product direction, service model,
                  platform concept, community initiative, physical-product concept, media concept and related body of
                  documentation published on this website is owned by <strong>MyMindVentures.io</strong>, led by
                  <strong> Kevin De Vlieger</strong>, CEO, Concept Thinker & Vision Partner.
                </p>
                <p>
                  Ownership includes the original concept framing, written documentation, product strategy, research,
                  positioning, business models, workflows, feature definitions, AI prompts, naming directions, visual
                  directions, mockup concepts, scoring models and supporting materials created for the concept.
                </p>
                <p>
                  Public publication does not transfer ownership and does not grant an automatic license. Visitors may
                  read and share links to the original pages. Copying, reproducing, redistributing, commercializing,
                  white-labelling, presenting the work as one’s own, or building directly from substantial unpublished or
                  protected documentation requires prior written permission from MyMindVentures.io and Kevin De Vlieger.
                </p>
                <div className="legal-callout">
                  <FileCheck2 aria-hidden="true" />
                  <p>
                    Collaboration, licensing, investment, validation, development and strategic partnership discussions
                    are welcome. Permission or commercial rights exist only when confirmed in a separate written agreement.
                  </p>
                </div>
              </div>
            </section>

            <section id="terms" className="legal-section" aria-labelledby="terms-title">
              <div className="legal-section__heading"><Scale aria-hidden="true" /><div><p className="eyebrow">02 · Use</p><h2 id="terms-title">Terms of Use</h2></div></div>
              <div className="legal-section__body">
                <p>
                  This website documents an active entrepreneurial journey. Concepts, scores, plans, pricing hypotheses,
                  market observations, roadmaps and partnership targets may change as research and validation progress.
                  They are shared for transparency and discovery, not as guaranteed outcomes, investment promises or
                  professional financial, legal, medical or technical advice.
                </p>
                <p>
                  Visitors must use the website lawfully and respectfully. Attempts to scrape protected documentation at
                  scale, interfere with the platform, misuse submission forms, impersonate contributors, or exploit private
                  contact information are not permitted.
                </p>
                <p>
                  External links are provided for context and convenience. MyMindVentures.io does not control third-party
                  websites and is not responsible for their availability, content, security or privacy practices.
                </p>
                <p>
                  Participation, public recognition, collaboration, volunteer support, sponsorship, investment interest or
                  development discussions do not create employment, equity, partnership, revenue-share or ownership rights
                  unless those rights are documented in a separate written agreement signed by the relevant parties.
                </p>
              </div>
            </section>

            <section id="privacy" className="legal-section" aria-labelledby="privacy-title">
              <div className="legal-section__heading"><LockKeyhole aria-hidden="true" /><div><p className="eyebrow">03 · Privacy</p><h2 id="privacy-title">Privacy & Data Handling</h2></div></div>
              <div className="legal-section__body">
                <p>
                  The website may collect information that a visitor actively submits through support offers, discovery
                  calls, contributor profiles, applications, comments or similar forms. Depending on the form, this may
                  include a name, email address, company, role, location, website, social profile, message, interests and
                  consent preferences.
                </p>
                <p>
                  Submitted information is intended to be used for the purpose shown with the form: responding to a request,
                  evaluating a collaboration, managing a contribution, publishing an approved profile, or improving the
                  mission and platform. Private contact details should not be displayed publicly unless the person has given
                  clear permission for that specific publication.
                </p>
                <p>
                  Platform data may be processed and stored through service providers used to operate the website, including
                  Supabase and hosting or deployment services. Access should be limited to people who need it for legitimate
                  operational purposes. Information should not be sold to advertisers.
                </p>
                <p>
                  A person who has submitted personal information may request access, correction or deletion by contacting
                  MyMindVentures.io through an available website contact or support pathway. Some information may need to be
                  retained where required for security, fraud prevention, legal obligations or the documentation of an agreed
                  collaboration.
                </p>
                <p className="legal-note">
                  This privacy summary describes the intended public-platform practice and should be reviewed as the website,
                  integrations and legal requirements evolve.
                </p>
              </div>
            </section>

            <section id="mission" className="legal-section" aria-labelledby="mission-title">
              <div className="legal-section__heading"><Globe2 aria-hidden="true" /><div><p className="eyebrow">04 · Mission</p><h2 id="mission-title">Public Mission Statement</h2></div></div>
              <div className="legal-section__body">
                <p>
                  Kevin De Vlieger publishes this work to establish visibility as a <strong>Concept Thinker & Vision Partner</strong>,
                  attract the builders and strategic partners required to turn strong ideas into real ventures, and build a
                  location-independent future as a <strong>Digital Nomad</strong>.
                </p>
                <p>
                  The portfolio is published under <strong>Bankrupt to 1 Million</strong>: a build-in-public mission documenting
                  a rebuild from financial hardship toward freedom, meaningful income, experiences, community and the full use
                  of personal talent and potential.
                </p>
                <p>
                  The mission is not a promise of guaranteed wealth and is not built around luxury performance or imitation.
                  It is a transparent record of experimentation, setbacks, partnerships, contribution and progress. Public
                  visibility is intended to create momentum and connection while preserving the ownership and identity of the
                  original work.
                </p>
              </div>
            </section>
          </div>

          <section className="section legal-footer-note">
            <ShieldCheck aria-hidden="true" />
            <div>
              <h2>One central source of truth</h2>
              <p>
                Concept-specific ownership notices remain linked to every item in Proof of Mind. This page provides the
                broader website-wide context. Nothing on this page replaces a signed agreement or professional legal advice.
              </p>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}
