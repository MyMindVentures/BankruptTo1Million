export type FounderProfile = {
  id: string;
  slug: string;
  full_name: string;
  display_name: string;
  headline: string | null;
  role_title: string;
  short_bio: string | null;
  full_bio: string | null;
  personal_mission: string | null;
  founder_story: string | null;
  core_strengths: string[];
  expertise: string[];
  lived_experience_topics: string[];
  responsibilities: string[];
  values: string[];
  location: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  intro_video_url: string | null;
  website_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  contact_cta_label: string | null;
  contact_cta_url: string | null;
  partnership_cta_label: string | null;
  partnership_cta_url: string | null;
  original_language: string;
  published_post_count: number;
  founder_post_count: number;
  concept_count: number;
  founder_message_count: number;
  journal_author_id: string;
  concept_founder_id: string | null;
};

export type SwatPoint = {
  id: string;
  point_type: 'strength' | 'struggle';
  title: string;
  summary: string;
  evidence: string | null;
  practical_impact: string | null;
  management_strategy: string | null;
  display_order: number;
};

export type TimelineEvent = {
  id: string;
  event_type: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  occurred_at: string;
  ended_at: string | null;
  location_name: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  host_name: string | null;
  host_profile_url: string | null;
  host_thank_you: string | null;
  journal_post_slug: string | null;
  concept_slug: string | null;
  external_url: string | null;
  cover_image_url: string | null;
  icon_key: string | null;
  is_featured: boolean;
  media: Array<{ id: string; media_url: string | null; media_type: string; caption: string | null; alt_text: string | null; is_primary: boolean }>;
};

export type FounderPost = {
  founder_post_id: string;
  post_slug: string;
  post_title: string;
  excerpt: string | null;
  published_at: string;
  concept_slug: string;
  concept_title: string;
};

export type Publication = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string;
  reading_time_minutes: number | null;
};

export type ConceptLink = {
  founder_role: string;
  is_original_creator: boolean;
  proof_of_mind_concepts: {
    id: string;
    slug: string;
    title: string;
    tagline: string | null;
    short_description: string;
    category: string | null;
    concept_status: string;
    cover_image_url: string | null;
    updated_at: string;
  } | null;
};
