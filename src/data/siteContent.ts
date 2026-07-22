import type { I18nManifest } from '../lib/i18nManifest';
import { HandHeart, Map, Newspaper, Rocket, Users, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const SITE_CONTENT_I18N_MANIFEST = {
  componentKey: 'data.site.content',
  namespace: 'home.platform.features',
  translationKeys: [
    'home.platform.features.community_hub',
    'home.platform.features.founder_journal',
    'home.platform.features.giving_back_platform',
    'home.platform.features.interactive_journey_map',
    'home.platform.features.living_documentary',
    'home.platform.features.venture_studio_showcase',
    'home.roadmap.items.community',
    'home.roadmap.items.foundation',
    'home.roadmap.items.momentum',
    'home.roadmap.items.storytelling',
    'navigation.apply',
    'navigation.breakfast_for_a_story',
    'navigation.break_the_circle',
    'navigation.calendar',
    'navigation.founder_support',
    'navigation.founders',
    'navigation.founding_heroes',
    'navigation.group.community',
    'navigation.group.explore',
    'navigation.group.participate',
    'navigation.home',
    'navigation.impact',
    'navigation.issues',
    'navigation.journal',
    'navigation.media',
    'navigation.mission_statement',
    'navigation.platform',
    'navigation.profile',
    'navigation.proof_of_mind',
    'navigation.roadmap',
    'navigation.story',
    'navigation.support',
    'navigation.what_we_offer',
  ] as const,
  keyPatterns: [
    'home.platform.features.*',
    'home.roadmap.items.*',
    'navigation.group.*',
  ] as const,
} as const satisfies I18nManifest;

export type NavItem = {
  label: string;
  translationKey: string;
  href: string;
};

export type FeatureCard = {
  translationKey: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type RoadmapItem = {
  translationKey: string;
  phase: string;
  title: string;
  description: string;
};

export type NavGroup = {
  id: string;
  labelKey: string;
  items: NavItem[];
};

export const primaryNavItems: NavItem[] = [
  { label: 'Home', translationKey: 'navigation.home', href: '/#top' },
  { label: 'Journal', translationKey: 'navigation.journal', href: '/journal' },
];

export const navGroups: NavGroup[] = [
  {
    id: 'explore',
    labelKey: 'navigation.group.explore',
    items: [
      { label: 'Story', translationKey: 'navigation.story', href: '/#story' },
      { label: 'Mission Statement', translationKey: 'navigation.mission_statement', href: '/mission-statement' },
      { label: 'Platform', translationKey: 'navigation.platform', href: '/#platform' },
      { label: 'Roadmap', translationKey: 'navigation.roadmap', href: '/#roadmap' },
      { label: 'Media', translationKey: 'navigation.media', href: '/media' },
      { label: 'Calendar', translationKey: 'navigation.calendar', href: '/calendar' },
      { label: 'Proof of Mind', translationKey: 'navigation.proof_of_mind', href: '/proof-of-mind' },
      { label: 'Break the Circle', translationKey: 'navigation.break_the_circle', href: '/break-the-circle' },
    ],
  },
  {
    id: 'community',
    labelKey: 'navigation.group.community',
    items: [
      { label: 'Founders', translationKey: 'navigation.founders', href: '/founders' },
      { label: 'What We Offer', translationKey: 'navigation.what_we_offer', href: '/offers' },
      { label: 'Impact', translationKey: 'navigation.impact', href: '/impact' },
      { label: 'Founding Heroes', translationKey: 'navigation.founding_heroes', href: '/founding-heroes' },
    ],
  },
  {
    id: 'participate',
    labelKey: 'navigation.group.participate',
    items: [
      { label: 'Breakfast for a Story', translationKey: 'navigation.breakfast_for_a_story', href: '/breakfast-for-a-story' },
      { label: 'Apply', translationKey: 'navigation.apply', href: '/become-a-founding-hero' },
      { label: 'Support', translationKey: 'navigation.support', href: '/support' },
      { label: 'Issues', translationKey: 'navigation.issues', href: '/issues' },
      { label: 'Profile', translationKey: 'navigation.profile', href: '/profile/issues' },
      { label: 'Founder Support', translationKey: 'navigation.founder_support', href: '/founder-support' },
    ],
  },
];

export const navItems: NavItem[] = [
  { label: 'Home', translationKey: 'navigation.home', href: '/#top' },
  { label: 'Story', translationKey: 'navigation.story', href: '/#story' },
  { label: 'Mission Statement', translationKey: 'navigation.mission_statement', href: '/mission-statement' },
  { label: 'Founders', translationKey: 'navigation.founders', href: '/founders' },
  { label: 'Journal', translationKey: 'navigation.journal', href: '/journal' },
  { label: 'What We Offer', translationKey: 'navigation.what_we_offer', href: '/offers' },
  { label: 'Media', translationKey: 'navigation.media', href: '/media' },
  { label: 'Calendar', translationKey: 'navigation.calendar', href: '/calendar' },
  { label: 'Proof of Mind', translationKey: 'navigation.proof_of_mind', href: '/proof-of-mind' },
  { label: 'Break the Circle', translationKey: 'navigation.break_the_circle', href: '/break-the-circle' },
  { label: 'Breakfast for a Story', translationKey: 'navigation.breakfast_for_a_story', href: '/breakfast-for-a-story' },
  { label: 'Founder Support', translationKey: 'navigation.founder_support', href: '/founder-support' },
  { label: 'Platform', translationKey: 'navigation.platform', href: '/#platform' },
  { label: 'Roadmap', translationKey: 'navigation.roadmap', href: '/#roadmap' },
  { label: 'Impact', translationKey: 'navigation.impact', href: '/impact' },
  { label: 'Founding Heroes', translationKey: 'navigation.founding_heroes', href: '/founding-heroes' },
  { label: 'Apply', translationKey: 'navigation.apply', href: '/become-a-founding-hero' },
  { label: 'Support', translationKey: 'navigation.support', href: '/support' },
  { label: 'Issues', translationKey: 'navigation.issues', href: '/issues' },
  { label: 'Profile', translationKey: 'navigation.profile', href: '/profile/issues' },
];

export const platformFeatures: FeatureCard[] = [
  {
    translationKey: 'home.platform.features.living_documentary',
    title: 'Living documentary',
    description: 'Follow the honest founder journey from rock bottom to momentum through public updates, media and lessons learned.',
    icon: Video,
  },
  {
    translationKey: 'home.platform.features.founder_journal',
    title: 'Founder journal',
    description: 'Editorial stories turn raw moments, decisions and setbacks into a transparent record of the rebuild.',
    icon: Newspaper,
  },
  {
    translationKey: 'home.platform.features.interactive_journey_map',
    title: 'Interactive journey map',
    description: 'Milestones, setbacks, partnerships and shipped features become a navigable timeline of progress.',
    icon: Map,
  },
  {
    translationKey: 'home.platform.features.community_hub',
    title: 'Community hub',
    description: 'Builders, supporters, designers, writers and hosts can find clear ways to contribute one useful piece at a time.',
    icon: Users,
  },
  {
    translationKey: 'home.platform.features.venture_studio_showcase',
    title: 'Venture studio showcase',
    description: 'Future ventures, collaborations and experiments can be documented as the movement creates new opportunities.',
    icon: Rocket,
  },
  {
    translationKey: 'home.platform.features.giving_back_platform',
    title: 'Giving-back platform',
    description: 'The long-term goal is to help others rebuild through connections, practical support and visible opportunities.',
    icon: HandHeart,
  },
];

export const roadmap: RoadmapItem[] = [
  {
    translationKey: 'home.roadmap.items.foundation',
    phase: 'Foundation',
    title: 'Core website architecture',
    description: 'Establish the responsive application shell, design language, contribution pathways and content structure.',
  },
  {
    translationKey: 'home.roadmap.items.community',
    phase: 'Community',
    title: 'Founding Builders Wall',
    description: 'Recognize meaningful contributors with profile cards, contribution history and permission-first visibility.',
  },
  {
    translationKey: 'home.roadmap.items.storytelling',
    phase: 'Storytelling',
    title: 'Founder stories and media archive',
    description: 'Publish journal entries, documentary assets, gallery moments and transparent updates from the journey.',
  },
  {
    translationKey: 'home.roadmap.items.momentum',
    phase: 'Momentum',
    title: 'Partnership and support flows',
    description: 'Help sponsors, partners, hosts and contributors discover concrete ways to join the mission.',
  },
];

export type FoundingHeroPlaceholder = {
  label: string;
  title: string;
  description: string;
};

export type FoundingHeroRole = {
  title: string;
  description: string;
};

export const foundingHeroPlaceholders: FoundingHeroPlaceholder[] = [
  {
    label: 'Profile slot',
    title: 'Builder story',
    description: 'Reserved for a real contributor profile after permission, context and contribution details are confirmed.',
  },
  {
    label: 'Anonymous option',
    title: 'Quiet recognition',
    description: 'Supports contributors who want their work honored without publishing a full public identity.',
  },
  {
    label: 'Contribution record',
    title: 'What changed',
    description: 'Future profiles can connect recognition to concrete work such as issues, commits, designs or documentation.',
  },
];

export const foundingHeroRoles: FoundingHeroRole[] = [
  {
    title: 'Frontend builders',
    description: 'Ship focused UI, routing, accessibility and responsive improvements through clearly scoped issues.',
  },
  {
    title: 'Story and content contributors',
    description: 'Help turn real progress into clear editorial copy, documentation and public updates.',
  },
  {
    title: 'Quality reviewers',
    description: 'Test routes, keyboard behavior, responsive layouts and honest acceptance criteria before release.',
  },
];
