import { HandHeart, Map, Newspaper, Rocket, Users, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
};

export type FeatureCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type RoadmapItem = {
  phase: string;
  title: string;
  description: string;
};

export const navItems: NavItem[] = [
  { label: 'Home', href: '/#top' },
  { label: 'Story', href: '/#story' },
  { label: 'Platform', href: '/#platform' },
  { label: 'Roadmap', href: '/#roadmap' },
  { label: 'Journal', href: '/journal' },
  { label: 'Proof of Mind', href: '/proof-of-mind' },
  { label: 'Break the Circle', href: '/break-the-circle' },
  { label: 'Founders', href: '/founders/kevin-de-vlieger' },
  { label: 'Founding Heroes', href: '/founding-heroes' },
  { label: 'Support', href: '/support' },
  { label: 'Impact', href: '/impact' },
  { label: 'Issues', href: '/issues' },
  { label: 'Profile', href: '/profile/issues' },
  { label: 'Apply', href: '/become-a-founding-hero' },
];

export const platformFeatures: FeatureCard[] = [
  {
    title: 'Living documentary',
    description: 'Follow the honest founder journey from rock bottom to momentum through public updates, media and lessons learned.',
    icon: Video,
  },
  {
    title: 'Founder journal',
    description: 'Editorial stories turn raw moments, decisions and setbacks into a transparent record of the rebuild.',
    icon: Newspaper,
  },
  {
    title: 'Interactive journey map',
    description: 'Milestones, setbacks, partnerships and shipped features become a navigable timeline of progress.',
    icon: Map,
  },
  {
    title: 'Community hub',
    description: 'Builders, supporters, designers, writers and hosts can find clear ways to contribute one useful piece at a time.',
    icon: Users,
  },
  {
    title: 'Venture studio showcase',
    description: 'Future ventures, collaborations and experiments can be documented as the movement creates new opportunities.',
    icon: Rocket,
  },
  {
    title: 'Giving-back platform',
    description: 'The long-term goal is to help others rebuild through connections, practical support and visible opportunities.',
    icon: HandHeart,
  },
];

export const roadmap: RoadmapItem[] = [
  {
    phase: 'Foundation',
    title: 'Core website architecture',
    description: 'Establish the responsive application shell, design language, contribution pathways and content structure.',
  },
  {
    phase: 'Community',
    title: 'Founding Builders Wall',
    description: 'Recognize meaningful contributors with profile cards, contribution history and permission-first visibility.',
  },
];
