export function slugifyJournalFootageName(input: string) {
  const normalized = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized ? normalized.slice(0, 80) : '';
}

export function resolveJournalFootageNameBase(title: string | null | undefined, slug: string) {
  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle || /^Journal event /i.test(trimmedTitle)) return slug;
  return slugifyJournalFootageName(trimmedTitle) || slug;
}

export function parseFootageFileNumber(fileName: string, nameBase: string, extension: string) {
  const pattern = new RegExp(`^${nameBase.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}-(\\d+)\\.${extension.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}$`, 'i');
  const match = fileName.match(pattern);
  return match ? Number(match[1]) : 0;
}

export function nextFootageFileNumber(existingFileNames: string[], nameBase: string, extension: string) {
  const max = existingFileNames.reduce((current, fileName) => {
    const parsed = parseFootageFileNumber(fileName, nameBase, extension);
    return Math.max(current, parsed);
  }, 0);
  return max + 1;
}

export function buildFootageStorageFileName(nameBase: string, number: number, extension: string) {
  return `${nameBase}-${number}.${extension.replace(/^\./, '').toLowerCase()}`;
}
