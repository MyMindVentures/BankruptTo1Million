import { useEffect, useRef, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import type { I18nManifest } from '../lib/i18nManifest';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import AE from 'country-flag-icons/react/3x2/AE';
import BG from 'country-flag-icons/react/3x2/BG';
import CN from 'country-flag-icons/react/3x2/CN';
import CZ from 'country-flag-icons/react/3x2/CZ';
import DE from 'country-flag-icons/react/3x2/DE';
import DK from 'country-flag-icons/react/3x2/DK';
import EE from 'country-flag-icons/react/3x2/EE';
import ES from 'country-flag-icons/react/3x2/ES';
import FI from 'country-flag-icons/react/3x2/FI';
import FR from 'country-flag-icons/react/3x2/FR';
import GB from 'country-flag-icons/react/3x2/GB';
import GR from 'country-flag-icons/react/3x2/GR';
import HR from 'country-flag-icons/react/3x2/HR';
import HU from 'country-flag-icons/react/3x2/HU';
import IE from 'country-flag-icons/react/3x2/IE';
import IN from 'country-flag-icons/react/3x2/IN';
import IT from 'country-flag-icons/react/3x2/IT';
import JP from 'country-flag-icons/react/3x2/JP';
import KR from 'country-flag-icons/react/3x2/KR';
import LT from 'country-flag-icons/react/3x2/LT';
import LV from 'country-flag-icons/react/3x2/LV';
import MA from 'country-flag-icons/react/3x2/MA';
import MT from 'country-flag-icons/react/3x2/MT';
import NL from 'country-flag-icons/react/3x2/NL';
import NO from 'country-flag-icons/react/3x2/NO';
import PL from 'country-flag-icons/react/3x2/PL';
import PT from 'country-flag-icons/react/3x2/PT';
import RO from 'country-flag-icons/react/3x2/RO';
import RS from 'country-flag-icons/react/3x2/RS';
import RU from 'country-flag-icons/react/3x2/RU';
import SA from 'country-flag-icons/react/3x2/SA';
import SE from 'country-flag-icons/react/3x2/SE';
import SI from 'country-flag-icons/react/3x2/SI';
import SK from 'country-flag-icons/react/3x2/SK';
import TR from 'country-flag-icons/react/3x2/TR';
import UA from 'country-flag-icons/react/3x2/UA';
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

function LanguageFlag({ code }: { code: string }) {
  const Flag = getFlagForLanguage(code);

  return (
    <span className="language-selector__flag" aria-hidden="true" data-i18n-ignore="true">
      {Flag ? <Flag className="language-selector__flag-svg" /> : <Globe2 size={16} />}
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
        <LanguageFlag code={language} />
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
                <LanguageFlag code={item.code} />
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
