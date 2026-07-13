import { Globe2 } from 'lucide-react';
import { useWebsiteI18n } from '../lib/websiteI18n';

export function LanguageSelector() {
  const { language, languages, isLoading, setLanguage, t } = useWebsiteI18n();
  const selectedLanguage = languages.find((item) => item.code === language);

  return (
    <label className="language-selector" title={selectedLanguage?.english_name || 'Language'}>
      <span className="sr-only">{t('header.language_label', 'Language')}</span>
      <Globe2 aria-hidden="true" size={17} />
      <select
        aria-label={t('header.language_label', 'Language')}
        value={language}
        disabled={isLoading || languages.length === 0}
        onChange={(event) => setLanguage(event.target.value)}
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.native_name}
          </option>
        ))}
      </select>
    </label>
  );
}
