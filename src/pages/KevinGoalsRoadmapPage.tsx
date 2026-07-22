import {
  Bot,
  Brain,
  BriefcaseBusiness,
  Compass,
  HeartHandshake,
  Laptop,
  Network,
  Rocket,
  Sprout,
} from 'lucide-react';
import { useEffect } from 'react';

const goals = [
  {
    number: '01',
    title: 'Gain momentum',
    description: 'Stop running in circles around startup funding. Build the right support structure with developers, venture studios, investors and strategic partners so progress can compound.',
    icon: Rocket,
  },
  {
    number: '02',
    title: 'Work with freedom',
    description: 'Create a way of working that functions anywhere, anytime and on any device, supported by systems that do not depend on constant personal attention.',
    icon: Laptop,
  },
  {
    number: '03',
    title: 'Protect my mind',
    description: 'Use my brain to improve and create concepts instead of exhausting it through survival loops, overload and continuously searching for a way out.',
    icon: Brain,
  },
  {
    number: '04',
    title: 'Build long-term relationships',
    description: 'Grow durable relationships with convinced investors, clients, developers, venture studios, founders and partners who believe in building together.',
    icon: Network,
  },
  {
    number: '05',
    title: 'Be proud of my daily direction',
    description: 'Feel confident about my way of thinking, the products I create and where I invest my time, knowing I am on the right business and financial track.',
    icon: Compass,
  },
  {
    number: '06',
    title: 'Align work, interests and adventure',
    description: 'Let entrepreneurship, technology, AI, aviation, photography, travel, problem-solving and community building strengthen each other instead of living in separate worlds.',
    icon: BriefcaseBusiness,
  },
  {
    number: '07',
    title: 'Catch the AI train',
    description: 'Become an AI-first entrepreneur by embracing the digital world, automations and intelligent systems that multiply creativity, output and opportunity.',
    icon: Bot,
  },
  {
    number: '08',
    title: 'Plant seeds that compound',
    description: 'Build businesses, software, content, relationships, knowledge and a trusted brand that continue to grow beyond a single day of work.',
    icon: Sprout,
  },
  {
    number: '09',
    title: 'Gain success together',
    description: 'Create opportunities with people who believe in the mission, turning ideas into products, products into ventures and ventures into shared impact.',
    icon: HeartHandshake,
  },
];

export function KevinGoalsRoadmapPage() {
  useEffect(() => {
    document.title = "Kevin's Goals & Roadmap | Bankrupt to 1 Million";
  }, []);

  return (
    <main className="kevin-roadmap-page" id="top">
      <section className="kevin-roadmap-hero">
        <div className="kevin-roadmap-hero__glow" aria-hidden="true" />
        <div className="kevin-roadmap-hero__inner">
          <p className="eyebrow">Personal North Star</p>
          <h1>Kevin&apos;s Goals &amp; Roadmap</h1>
          <p className="kevin-roadmap-hero__lede">
            Create a life where time, talent, passions and business reinforce each other—building meaningful ventures without constantly fighting financial survival.
          </p>
          <a className="button" href="#roadmap">Explore the roadmap</a>
        </div>
      </section>

      <section className="kevin-roadmap-intro section" aria-labelledby="kevin-roadmap-mission-title">
        <div>
          <p className="eyebrow">My mission</p>
          <h2 id="kevin-roadmap-mission-title">From survival loops to lasting momentum</h2>
        </div>
        <p>
          The goal is not simply to work harder. It is to build leverage, protect mental energy and create a direction that combines freedom, confidence, relationships, technology, adventure and shared success.
        </p>
      </section>

      <section className="kevin-roadmap-grid section" id="roadmap" aria-label="Kevin's goals">
        {goals.map(({ number, title, description, icon: Icon }) => (
          <article className="kevin-roadmap-card" key={number}>
            <div className="kevin-roadmap-card__top">
              <span className="kevin-roadmap-card__number" aria-hidden="true">{number}</span>
              <span className="kevin-roadmap-card__icon" aria-hidden="true"><Icon size={24} /></span>
            </div>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="kevin-roadmap-principle section" aria-labelledby="kevin-roadmap-principle-title">
        <p className="eyebrow">Guiding principle</p>
        <h2 id="kevin-roadmap-principle-title">Build systems instead of stress.</h2>
        <div className="kevin-roadmap-principle__lines">
          <p>Build leverage instead of only working harder.</p>
          <p>Build relationships instead of transactions.</p>
          <p>Plant seeds every day and let compound growth do the rest.</p>
        </div>
      </section>
    </main>
  );
}
