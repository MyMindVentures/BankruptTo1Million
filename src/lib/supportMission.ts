import { supabase } from './supabase';

export type SupportCategory = {
  id: string;
  title: string;
  marker: string;
  summary: string;
  whyItMatters: string;
  needs: string[];
  cta: string;
  privacyNote?: string;
};

export type SupportOpportunity = {
  id: string;
  title: string;
  summary: string;
  categoryId: string;
  status: string;
  applicationUrl?: string;
};

export type SupportOffer = {
  name: string;
  email: string;
  categoryId: string;
  message: string;
  consentToContact: boolean;
  consentToPublicRecognition: boolean;
};

export const supportCategories: SupportCategory[] = [
  { id: 'founding-hero', title: 'Become a Founding Hero', marker: '01', summary: 'Contribute early, meaningfully and permission-first to the foundation of the movement.', whyItMatters: 'Founding Heroes turn belief into proof through useful early work, introductions and practical support.', needs: ['Focused feature contributors', 'Trusted launch support', 'Permission-based public recognition stories'], cta: 'Apply' },
  { id: 'technology-ai', title: 'Technology & AI', marker: '02', summary: 'Frontend, backend, mobile, AI agents, MCP integrations, automation, DevOps and QA.', whyItMatters: 'The platform needs reliable product builders who can turn public mission needs into accessible shipped systems.', needs: ['Frontend and backend development', 'AI engineering, agents and MCP integrations', 'QA, testing, automation and DevOps'], cta: 'View Opportunities' },
  { id: 'design-creative', title: 'Design & Creative', marker: '03', summary: 'UI/UX, branding, illustration, video editing, motion design and photography.', whyItMatters: 'Premium storytelling requires design that feels human, cinematic and trustworthy without manipulation.', needs: ['UI/UX systems', 'Brand and illustration support', 'Video, motion and photography help'], cta: 'Help Us' },
  { id: 'business-entrepreneurship', title: 'Business & Entrepreneurship', marker: '04', summary: 'Co-founders, venture studios, angel investors, launch partners, sponsors and mentors.', whyItMatters: 'Mission momentum depends on business relationships that create durable opportunities rather than one-off attention.', needs: ['Launch partners and sponsors', 'Founder and venture studio conversations', 'Business mentors and strategic introductions'], cta: 'Become a Partner' },
  { id: 'mental-wellbeing', title: 'Mental Wellbeing', marker: '05', summary: 'ADHD, RSD-aware, executive function, accountability and wellbeing support represented respectfully.', whyItMatters: 'Rebuilding is human work. Support must be dignified, private by default and never presented as a replacement for medical care; coaches and therapists do not replace licensed medical care.', needs: ['ADHD and executive function coaching', 'RSD-aware or wellbeing mentors', 'Accountability support with clear boundaries'], cta: 'Learn More', privacyNote: 'Applications are private by default. Public copy stays general and does not expose health details.' },
  { id: 'storytelling-community', title: 'Storytelling & Community', marker: '06', summary: 'Writers, translators, podcasters, journalists, social media support and community managers.', whyItMatters: 'The right stories help supporters understand the mission honestly and invite people in without hype.', needs: ['Editorial writing and translations', 'Podcast and media conversations', 'Community moderation and social support'], cta: 'Help Us' },
  { id: 'practical-support', title: 'Practical Support', marker: '07', summary: 'Hosting, accommodation, coworking, travel support, local introductions, events and equipment.', whyItMatters: 'Practical resources can remove immediate friction and help the mission keep moving in the real world.', needs: ['Coworking or event spaces', 'Travel and local introductions', 'Equipment and operational help'], cta: 'Offer Support' },
  { id: 'financial-resource-support', title: 'Financial & Resource Support', marker: '08', summary: 'Donations, sponsorships, cloud credits, AI credits, software licenses and equipment.', whyItMatters: 'Funding and resources keep infrastructure, tools and public work sustainable while the platform grows.', needs: ['Sponsorships and donations', 'Cloud, AI and software credits', 'Equipment support'], cta: 'Become a Sponsor' },
  { id: 'share-the-mission', title: 'Share the Mission', marker: '09', summary: 'Share stories, comment, participate, introduce relevant people and help spread the mission.', whyItMatters: 'Warm introductions and thoughtful sharing help the right people discover where they can contribute.', needs: ['Share journal posts', 'Introduce relevant supporters', 'Participate in comments and community moments'], cta: 'Share the Mission' },
];

function normalize(value?: unknown) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export function categoryById(id: string) { return supportCategories.find((category) => category.id === id); }

export function categoryForOpportunity(row: Record<string, unknown>): string {
  const candidates = [row.support_category, row.support_category_id, row.category, row.discipline, row.issue_type, row.role_type, row.title, row.summary].map(normalize);
  return supportCategories.find((category) => candidates.some((value) => value.includes(category.id) || category.id.includes(value)))?.id || 'technology-ai';
}

export function mapOpenRoleToOpportunity(row: Record<string, unknown>): SupportOpportunity {
  const title = text(row.title) || text(row.role_title) || 'Open support opportunity';
  return {
    id: String(row.id || title),
    title,
    summary: text(row.summary) || text(row.description) || 'A concrete way to support the mission is open now.',
    categoryId: categoryForOpportunity(row),
    status: text(row.status) || text(row.state) || 'active',
    applicationUrl: text(row.application_url) || text(row.url),
  };
}

export function opportunitiesForCategory(opportunities: SupportOpportunity[], categoryId: string) {
  return opportunities.filter((opportunity) => opportunity.categoryId === categoryId && !['paused', 'archived', 'closed'].includes(normalize(opportunity.status)));
}

export async function getSupportOpportunities(): Promise<SupportOpportunity[]> {
  const response = await supabase.from('open_roles').request({ query: 'select=*&order=created_at.desc' });
  if (!response.ok) throw new Error('Support opportunities are temporarily unavailable.');
  const rows = await response.json() as Record<string, unknown>[];
  return rows.map(mapOpenRoleToOpportunity);
}

export async function submitSupportOffer(offer: SupportOffer): Promise<void> {
  const response = await supabase.from('applications').request({
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      application_type: offer.categoryId === 'another-kind' ? 'general_support_offer' : 'support_offer',
      support_category: offer.categoryId,
      display_name: offer.name,
      email: offer.email,
      motivation: offer.message,
      consent_to_contact: offer.consentToContact,
      consent_to_public_recognition: offer.consentToPublicRecognition,
      public_recognition_allowed: false,
    },
  });
  if (!response.ok) throw new Error('Your support offer could not be submitted. Please try again later.');
}
