export type SiteLink = {
  id: string;
  label: string;
  translationKey: string;
  href: string;
  showInHeader?: boolean;
  showInFooter?: boolean;
  external?: boolean;
};

export type SiteGroup = {
  id: string;
  label: string;
  translationKey: string;
  header: boolean;
  footer: boolean;
  links: SiteLink[];
};

export const homeLink: SiteLink = {
  id: 'home',
  label: 'Home',
  translationKey: 'navigation.home',
  href: '/#top',
  showInHeader: true,
  showInFooter: true,
};

export const supportCta: SiteLink = {
  id: 'support-mission',
  label: 'Support the Mission',
  translationKey: 'navigation.founder_support',
  href: '/founder-support',
  showInHeader: true,
  showInFooter: true,
};

export const publicSiteGroups: SiteGroup[] = [
  {
    id: 'journey',
    label: 'Our Journey',
    translationKey: 'navigation.group.explore',
    header: true,
    footer: true,
    links: [
      { id: 'journal', label: 'Journal', translationKey: 'navigation.journal', href: '/journal', showInHeader: true, showInFooter: true },
      { id: 'media', label: 'Media Vault', translationKey: 'navigation.media', href: '/media', showInHeader: true, showInFooter: true },
      { id: 'calendar', label: 'Calendar', translationKey: 'navigation.calendar', href: '/calendar', showInHeader: true, showInFooter: true },
      { id: 'break-the-circle', label: 'Break the Circle', translationKey: 'navigation.break_the_circle', href: '/break-the-circle', showInHeader: true, showInFooter: true },
    ],
  },
  {
    id: 'people-story',
    label: 'People & Story',
    translationKey: 'navigation.group.community',
    header: true,
    footer: true,
    links: [
      { id: 'founders', label: 'Founders', translationKey: 'navigation.founders', href: '/founders', showInHeader: true, showInFooter: true },
      { id: 'proof-of-mind', label: 'Proof of Mind', translationKey: 'navigation.proof_of_mind', href: '/proof-of-mind', showInHeader: true, showInFooter: true },
      { id: 'impact', label: 'Impact', translationKey: 'navigation.impact', href: '/impact', showInHeader: true, showInFooter: true },
    ],
  },
  {
    id: 'work-with-us',
    label: 'Work With Us',
    translationKey: 'navigation.group.participate',
    header: true,
    footer: true,
    links: [
      { id: 'offers', label: 'What We Offer', translationKey: 'navigation.what_we_offer', href: '/offers', showInHeader: true, showInFooter: true },
      { id: 'founder-support', label: 'Founder Support', translationKey: 'navigation.founder_support', href: '/founder-support', showInHeader: true, showInFooter: true },
      { id: 'issues', label: 'Open Issues', translationKey: 'navigation.issues', href: '/issues', showInHeader: true, showInFooter: true },
    ],
  },
  {
    id: 'discover',
    label: 'Discover',
    translationKey: 'footer.groups.explore',
    header: false,
    footer: true,
    links: [
      { id: 'story', label: 'Our Story', translationKey: 'navigation.story', href: '/#story', showInFooter: true },
      { id: 'platform', label: 'Platform Vision', translationKey: 'navigation.platform', href: '/#platform', showInFooter: true },
      { id: 'roadmap', label: 'Roadmap', translationKey: 'navigation.roadmap', href: '/#roadmap', showInFooter: true },
    ],
  },
  {
    id: 'legal',
    label: 'Legal & Transparency',
    translationKey: 'footer.groups.legal_transparency',
    header: false,
    footer: true,
    links: [
      { id: 'legal-overview', label: 'Legal Overview', translationKey: 'footer.links.legal_overview', href: '/legal', showInFooter: true },
      { id: 'ownership', label: 'Ownership & IP Notice', translationKey: 'footer.links.ownership_ip_notice', href: '/legal#ownership', showInFooter: true },
      { id: 'terms', label: 'Terms of Use', translationKey: 'footer.links.terms_of_use', href: '/legal#terms', showInFooter: true },
      { id: 'privacy', label: 'Privacy Policy', translationKey: 'footer.links.privacy_policy', href: '/legal#privacy', showInFooter: true },
      { id: 'mission', label: 'Public Mission Statement', translationKey: 'footer.links.public_mission_statement', href: '/legal#mission', showInFooter: true },
      { id: 'github', label: 'Source Repository', translationKey: 'footer.links.source_repository', href: 'https://github.com/MyMindVentures/BankruptTo1Million', showInFooter: true, external: true },
    ],
  },
];

export const headerGroups = publicSiteGroups.filter((group) => group.header);
export const footerGroups = publicSiteGroups.filter((group) => group.footer);

export const legacyRouteAliases: Record<string, string> = {
  '/support': '/founder-support',
  '/founding-heroes': '/impact',
  '/become-a-founding-hero': '/issues',
  '/profile/issues': '/issues',
};
