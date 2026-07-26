export function journalSpeechText(title: string, subtitle: string | undefined, markdown: string | undefined): string {
  const body = String(markdown || '')
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/[>*_~|]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  return [title, subtitle, body]
    .filter((part): part is string => Boolean(part?.trim()))
    .join('. ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitJournalSpeechText(text: string, maximumLength = 220): string[] {
  if (!text.trim()) return [];
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/gu) || [text];
  const chunks: string[] = [];

  for (const sentenceValue of sentences) {
    let sentence = sentenceValue.trim();
    while (sentence.length > maximumLength) {
      const candidate = sentence.slice(0, maximumLength + 1);
      const whitespace = candidate.lastIndexOf(' ');
      const splitAt = whitespace >= Math.floor(maximumLength * 0.6) ? whitespace : maximumLength;
      chunks.push(sentence.slice(0, splitAt).trim());
      sentence = sentence.slice(splitAt).trim();
    }

    if (!sentence) continue;
    const previous = chunks.at(-1);
    if (previous && previous.length + 1 + sentence.length <= maximumLength) chunks[chunks.length - 1] = `${previous} ${sentence}`;
    else chunks.push(sentence);
  }

  return chunks;
}

export function selectJournalVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | null {
  const normalized = language.toLowerCase();
  const base = normalized.split('-')[0];
  return voices.find((voice) => voice.lang.toLowerCase() === normalized)
    || voices.find((voice) => voice.lang.toLowerCase().split('-')[0] === base)
    || null;
}
