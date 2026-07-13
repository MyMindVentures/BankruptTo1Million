import type { JournalAuthor, JournalPost } from './journal';

export type JournalPersonRole = 'author' | 'subject' | 'both' | 'editor' | 'contributor';
export type JournalDisplayPerson = Pick<JournalAuthor, 'id' | 'slug' | 'display_name' | 'avatar_url'>;

function orderedLinks(post: JournalPost) {
  return [...(post.journal_post_author_links || [])].sort(
    (a, b) => (a.author_order ?? 0) - (b.author_order ?? 0),
  );
}

export function getJournalPeople(post: JournalPost, roles?: JournalPersonRole[]): JournalDisplayPerson[] {
  const seen = new Set<string>();
  return orderedLinks(post)
    .filter((link) => !roles || roles.includes(link.author_role as JournalPersonRole))
    .map((link) => link.journal_authors)
    .filter((person): person is JournalAuthor => Boolean(person?.is_public))
    .filter((person) => {
      if (seen.has(person.id)) return false;
      seen.add(person.id);
      return true;
    });
}

export function getJournalAuthors(post: JournalPost) {
  return getJournalPeople(post, ['author', 'both']);
}

export function getJournalSubjects(post: JournalPost) {
  return getJournalPeople(post, ['subject', 'both']);
}

/**
 * Visual profile rule used everywhere in the Journal:
 * 1. show who the story is about;
 * 2. otherwise show who authored it;
 * 3. otherwise render the mission fallback.
 */
export function getJournalDisplayPeople(post: JournalPost) {
  const subjects = getJournalSubjects(post);
  return subjects.length ? subjects : getJournalAuthors(post);
}

export function formatJournalPeople(people: JournalDisplayPerson[]) {
  const names = people.map((person) => person.display_name).filter(Boolean);
  if (!names.length) return 'Bankrupt to 1 Million';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}
