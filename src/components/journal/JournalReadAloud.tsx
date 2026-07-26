import { Pause, Play, RotateCcw, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { I18nManifest } from '../../lib/i18nManifest';
import { journalSpeechText, selectJournalVoice, splitJournalSpeechText } from '../../lib/journalReadAloud';
import { useWebsiteI18n } from '../../lib/websiteI18n';
import './JournalReadAloud.css';

export const JOURNAL_READ_ALOUD_I18N_MANIFEST = {
  componentKey: 'journal.read_aloud.controls',
  namespace: 'journal.read_aloud',
  translationKeys: [
    'journal.read_aloud.label',
    'journal.read_aloud.play',
    'journal.read_aloud.pause',
    'journal.read_aloud.resume',
    'journal.read_aloud.stop',
    'journal.read_aloud.speed',
    'journal.read_aloud.unsupported',
    'journal.read_aloud.error',
  ] as const,
  entityContent: { tables: ['journal_posts', 'journal_translations'] },
} as const satisfies I18nManifest;

type ReadAloudState = 'idle' | 'speaking' | 'paused' | 'error';

type JournalReadAloudProps = {
  title: string;
  subtitle?: string;
  body?: string;
  language: string;
};

const RATE_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

export function JournalReadAloud({ title, subtitle, body, language }: JournalReadAloudProps) {
  const { t, formatNumber } = useWebsiteI18n();
  const [state, setState] = useState<ReadAloudState>('idle');
  const [rate, setRate] = useState<number>(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const text = useMemo(() => journalSpeechText(title, subtitle, body), [body, subtitle, title]);

  useEffect(() => {
    if (!supported) return undefined;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    setState('idle');
    return () => {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      chunksRef.current = [];
      chunkIndexRef.current = 0;
    };
  }, [language, supported, text]);

  const speakChunk = (index: number) => {
    const chunk = chunksRef.current[index];
    if (!chunk) {
      utteranceRef.current = null;
      chunksRef.current = [];
      chunkIndexRef.current = 0;
      setState('idle');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = language;
    utterance.rate = rate;
    utterance.voice = selectJournalVoice(window.speechSynthesis.getVoices(), language);
    utterance.onstart = () => { if (utteranceRef.current === utterance) setState('speaking'); };
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      chunkIndexRef.current = index + 1;
      speakChunk(chunkIndexRef.current);
    };
    utterance.onerror = (event) => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setState(event.error === 'canceled' || event.error === 'interrupted' ? 'idle' : 'error');
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const start = () => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    chunksRef.current = splitJournalSpeechText(text);
    chunkIndexRef.current = 0;
    speakChunk(0);
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setState('paused');
  };

  const resume = () => {
    window.speechSynthesis.resume();
    setState('speaking');
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    setState('idle');
  };

  if (!supported) {
    return <p className="journal-read-aloud journal-read-aloud--unsupported" role="status">{t('journal.read_aloud.unsupported', 'Read aloud is not supported by this browser.')}</p>;
  }

  return (
    <section className="journal-read-aloud" aria-label={t('journal.read_aloud.label', 'Listen to this article')}>
      <div className="journal-read-aloud__controls">
        {state === 'idle' || state === 'error' ? (
          <button className="button button--small" type="button" onClick={start}>
            {state === 'error' ? <RotateCcw size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            {t('journal.read_aloud.play', 'Read aloud')}
          </button>
        ) : state === 'paused' ? (
          <button className="button button--small" type="button" onClick={resume}><Play size={16} aria-hidden="true" />{t('journal.read_aloud.resume', 'Resume')}</button>
        ) : (
          <button className="button button--small" type="button" onClick={pause}><Pause size={16} aria-hidden="true" />{t('journal.read_aloud.pause', 'Pause')}</button>
        )}
        {state === 'speaking' || state === 'paused' ? (
          <button className="button button--ghost button--small" type="button" onClick={stop}><Square size={15} aria-hidden="true" />{t('journal.read_aloud.stop', 'Stop')}</button>
        ) : null}
        <label>
          <span>{t('journal.read_aloud.speed', 'Speed')}</span>
          <select value={rate} disabled={state !== 'idle' && state !== 'error'} onChange={(event) => setRate(Number(event.target.value))}>
            {RATE_OPTIONS.map((option) => <option key={option} value={option}>{formatNumber(option)}×</option>)}
          </select>
        </label>
      </div>
      {state === 'error' ? <p className="journal-read-aloud__error" role="alert">{t('journal.read_aloud.error', 'The article could not be read aloud. Please try again.')}</p> : null}
    </section>
  );
}
