import {
  ArrowDown,
  Bot,
  Brain,
  BriefcaseBusiness,
  Compass,
  HeartHandshake,
  Laptop,
  Network,
  Rocket,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { useEffect } from 'react';

const goals = [
  {
    number: '01',
    label: 'Momentum',
    title: 'Gain momentum',
    description: 'Stop running in circles around startup funding. Build the right support structure with developers, venture studios, investors and strategic partners so progress can compound.',
    icon: Rocket,
  },
  {
    number: '02',
    label: 'Freedom',
    title: 'Work with freedom',
    description: 'Create a way of working that functions anywhere, anytime and on any device, supported by systems that do not depend on constant personal attention.',
    icon: Laptop,
  },
  {
    number: '03',
    label: 'Clarity',
    title: 'Protect my mind',
    description: 'Use my brain to improve and create concepts instead of exhausting it through survival loops, overload and continuously searching for a way out.',
    icon: Brain,
  },
  {
    number: '04',
    label: 'People',
    title: 'Build long-term relationships',
    description: 'Grow durable relationships with convinced investors, clients, developers, venture studios, founders and partners who believe in building together.',
    icon: Network,
  },
  {
    number: '05',
    label: 'Direction',
    title: 'Be proud of my daily direction',
    description: 'Feel confident about my way of thinking, the products I create and where I invest my time, knowing I am on the right business and financial track.',
    icon: Compass,
  },
  {
    number: '06',
    label: 'Alignment',
    title: 'Align work, interests and adventure',
    description: 'Let entrepreneurship, technology, AI, aviation, photography, travel, problem-solving and community building strengthen each other instead of living in separate worlds.',
    icon: BriefcaseBusiness,
  },
  {
    number: '07',
    label: 'Leverage',
    title: 'Catch the AI train',
    description: 'Become an AI-first entrepreneur by embracing the digital world, automations and intelligent systems that multiply creativity, output and opportunity.',
    icon: Bot,
  },
  {
    number: '08',
    label: 'Compounding',
    title: 'Plant seeds that compound',
    description: 'Build businesses, software, content, relationships, knowledge and a trusted brand that continue to grow beyond a single day of work.',
    icon: Sprout,
  },
  {
    number: '09',
    label: 'Together',
    title: 'Gain success together',
    description: 'Create opportunities with people who believe in the mission, turning ideas into products, products into ventures and ventures into shared impact.',
    icon: HeartHandshake,
  },
];

const pillars = ['Freedom', 'Clarity', 'Leverage', 'Relationships', 'Adventure', 'Shared success'];

export function KevinGoalsRoadmapPage() {
  useEffect(() => {
    document.title = "Kevin's Goals & Roadmap | Bankrupt to 1 Million";
  }, []);

  return (
    <main className="kevin-roadmap-page" id="top">
      <section className="kevin-roadmap-hero">
        <div className="kevin-roadmap-hero__glow kevin-roadmap-hero__glow--one" aria-hidden="true" />
        <div className="kevin-roadmap-hero__glow kevin-roadmap-hero__glow--two" aria-hidden="true" />
        <div className="kevin-roadmap-hero__grid" aria-hidden="true" />

        <div className="kevin-roadmap-hero__inner">
          <div className="kevin-roadmap-hero__copy">
            <div className="kevin-roadmap-kicker">
              <Sparkles size={16} aria-hidden="true" />
              <span>Personal North Star</span>
            </div>
            <h1>Kevin&apos;s Goals <span>&amp; Roadmap</span></h1>
            <p className="kevin-roadmap-hero__lede">
              Create a life where time, talent, passions and business reinforce each other—building meaningful ventures without constantly fighting financial survival.
            </p>
            <div className="kevin-roadmap-hero__actions">
              <a className="button" href="#roadmap">Explore the roadmap</a>
              <a className="kevin-roadmap-scroll-link" href="#mission">
                <ArrowDown size={18} aria-hidden="true" />
                The mission behind it
              </a>
            </div>
          </div>

          <aside className="kevin-roadmap-hero__panel" aria-label="Core ambition">
            <span className="kevin-roadmap-hero__panel-label">Core ambition</span>
            <p>Move from survival mode to a life built around momentum, freedom and meaningful creation.</p>
            <div className="kevin-roadmap-hero__panel-meta">
              <span>09 priorities</span>
              <span>01 direction</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="kevin-roadmap-intro section" id="mission" aria-labelledby="kevin-roadmap-mission-title">
        <div className="kevin-roadmap-intro__heading">
          <p className="eyebrow">My mission</p>
          <h2 id="kevin-roadmap-mission-title">From survival loops to lasting momentum</h2>
        </div>
        <div className="kevin-roadmap-intro__copy">
          <p>
            The goal is not simply to work harder. It is to build leverage, protect mental energy and create a direction that combines freedom, confidence, relationships, technology, adventure and shared success.
          </p>
          <div className="kevin-roadmap-pill-list" aria-label="Mission pillars">
            {pillars.map((pillar) => <span key={pillar}>{pillar}</span>)}
          </div>
        </div>
      </section>

      <section className="kevin-roadmap-section section" id="roadmap" aria-labelledby="kevin-roadmap-title">
        <div className="kevin-roadmap-section__heading">
          <div>
            <p className="eyebrow">The roadmap</p>
            <h2 id="kevin-roadmap-title">Nine priorities. One direction.</h2>
          </div>
          <p>Each priority turns the bigger vision into a practical focus for daily decisions, partnerships and future ventures.</p>
        </div>

        <div className="kevin-roadmap-grid">
          {goals.map(({ number, label, title, description, icon: Icon }, index) => (
            <article className={`kevin-roadmap-card kevin-roadmap-card--${(index % 3) + 1}`} key={number}>
              <div className="kevin-roadmap-card__top">
                <span className="kevin-roadmap-card__number" aria-hidden="true">{number}</span>
                <span className="kevin-roadmap-card__icon" aria-hidden="true"><Icon size={23} /></span>
              </div>
              <div className="kevin-roadmap-card__body">
                <p className="kevin-roadmap-card__label">{label}</p>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="kevin-roadmap-principle section" aria-labelledby="kevin-roadmap-principle-title">
        <div className="kevin-roadmap-principle__orb" aria-hidden="true" />
        <div className="kevin-roadmap-principle__inner">
          <p className="eyebrow">Guiding principle</p>
          <h2 id="kevin-roadmap-principle-title">Build systems instead of stress.</h2>
          <div className="kevin-roadmap-principle__lines">
            <p><span>01</span> Build leverage instead of only working harder.</p>
            <p><span>02</span> Build relationships instead of transactions.</p>
            <p><span>03</span> Plant seeds every day and let compound growth do the rest.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
