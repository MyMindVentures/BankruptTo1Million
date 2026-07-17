import { useEffect, useRef, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import type { I18nManifest } from '../lib/i18nManifest';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import {
  AE,
  BG,
  CN,
  CZ,
  DE,
  DK,
  EE,
  ES,
  FI,
  FR,
  GB,
  GR,
  HR,
  HU,
  IE,
  IN,
  IT,
  JP,
  KR,
  LT,
  LV,
  MA,
  MT,
  NL,
  NO,
  PL,
  PT,
  RO,
  RS,
  RU,
  SA,
  SE,
  SI,
  SK,
  TR,
  UA,
} from 'country-flag-icons/react/3x2';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const LANGUAGE_SELECTOR_I18N_MANIFEST = {
  componentKey: 'components.language.selector',
  namespace: 'header',
  translationKeys: [
    'header.language_label',
  ] as const,
} as const satisfies I18nManifest;

type FlagComponent = ComponentType<SVGProps<SVGSVGElement>>;

const FLAG_BY_LANGUAGE: Record<string, FlagComponent> = {
  ar: SA,
  bg: BG,
  cs: CZ,
  da: DK,
  de: DE,
  el: GR,
  en: GB,
  es: ES,
  et: EE,
  fi: FI,
  fr: FR,
  ga: IE,
  hi: IN,
  hr: HR,
  hu: HU,
  it: IT,
  ja: JP,
  ko: KR,
  lt: LT,
  lv: LV,
  mt: MT,
  nl: NL,
  no: NO,
  pl: PL,
  pt: PT,
  ro: RO,
  ru: RU,
  sk: SK,
  sl: SI,
  sr: RS,
  sv: SE,
  tr: TR,
  uk: UA,
  zh: CN,
  'ar-ae': AE,
  'ar-ma': MA,
};

const FLAG_PREFIX = /^(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic})\s*/u;

function normalizeLanguageCode(code: string) {
  return code.trim().toLowerCase().replace('_', '-');
}

function getFlagForLanguage(code: string) {
  const normalized = normalizeLanguageCode(code);
  return FLAG_BY_LANGUAGE[normalized] || FLAG_BY_LANGUAGE[normalized.split('-')[0]];
}

function cleanLanguageLabel(nativeName: string) {
  return nativeName.replace(FLAG_PREFIX, '').trim();
}

function LanguageFlag({ code, label }: { code: string; label: string }) {
  const Flag = getFlagForLanguage(code);

  return (
    <span className="language-selector__flag" aria-hidden="true" data-i18n-ignore="true">
      {Flag ? <Flag className="language-selector__flag-svg" title={label} /> : <Globe2 size={16} />}
    </span>
  );
}

export function LanguageSelector() {
  const { language, languages, setLanguage, t } = useWebsiteI18n();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLanguage = languages.find((item) => item.code === language);
  const languageLabel = t('header.language_label', 'Language');
  const selectedName = selectedLanguage ? cleanLanguageLabel(selectedLanguage.native_name) : languageLabel;

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div className="language-selector" ref={rootRef} title={selectedLanguage?.english_name || languageLabel}>
      <button
        type="button"
        className="language-selector__trigger"
        aria-label={languageLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={languages.length === 0}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Globe2 aria-hidden="true" size={17} />
        <LanguageFlag code={language} label={selectedName} />
        <span className="language-selector__name" data-i18n-ignore="true">
          {selectedName}
        </span>
        <ChevronDown aria-hidden="true" size={15} className="language-selector__chevron" />
      </button>

      {isOpen && (
        <div className="language-selector__menu" role="listbox" aria-label={languageLabel}>
          {languages.map((item) => {
            const optionName = cleanLanguageLabel(item.native_name);
            const isSelected = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                className="language-selector__option"
                onClick={() => {
                  setLanguage(item.code);
                  setIsOpen(false);
                }}
              >
                <LanguageFlag code={item.code} label={optionName} />
                <span className="language-selector__option-name" data-i18n-ignore="true">
                  {optionName}
                </span>
                {isSelected && <Check aria-hidden="true" size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
