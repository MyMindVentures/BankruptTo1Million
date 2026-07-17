import { useEffect, useRef, useState } from 'react';
import type { I18nManifest } from '../lib/i18nManifest';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const LANGUAGE_SELECTOR_I18N_MANIFEST = {
  componentKey: 'components.language.selector',
  namespace: 'header',
  translationKeys: [
    'header.language_label',
  ] as const,
} as const satisfies I18nManifest;

const FLAG_PREFIX = /^(\p{Regional_Indicator}{2})\s*/u;

function splitLanguageLabel(nativeName: string) {
  const match = nativeName.match(FLAG_PREFIX);
  return {
    flag: match?.[1] || '🌐',
    label: nativeName.replace(FLAG_PREFIX, ''),
  };
}

export function LanguageSelector() {
  const { language, languages, setLanguage, t } = useWebsiteI18n();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLanguage = languages.find((item) => item.code === language);
  const selectedLabel = selectedLanguage ? splitLanguageLabel(selectedLanguage.native_name) : null;
  const languageLabel = t('header.language_label', 'Language');

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
        <span className="language-selector__flag" aria-hidden="true" data-i18n-ignore="true">
          {selectedLabel?.flag || '🌐'}
        </span>
        <span className="language-selector__name" data-i18n-ignore="true">
          {selectedLabel?.label || languageLabel}
        </span>
        <ChevronDown aria-hidden="true" size={15} className="language-selector__chevron" />
      </button>

      {isOpen && (
        <div className="language-selector__menu" role="listbox" aria-label={languageLabel}>
          {languages.map((item) => {
            const option = splitLanguageLabel(item.native_name);
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
                <span className="language-selector__flag" aria-hidden="true" data-i18n-ignore="true">
                  {option.flag}
                </span>
                <span className="language-selector__option-name" data-i18n-ignore="true">
                  {option.label}
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
