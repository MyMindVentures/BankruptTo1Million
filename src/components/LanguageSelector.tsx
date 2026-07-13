import { Globe2 } from 'lucide-react';
import { useWebsiteI18n } from '../lib/websiteI18n';

export function LanguageSelector() {
  const { language, languages, setLanguage } = useWebsiteI18n();

  return (
    <label className="language-selector">
      <span className="sr-only">Language</span>
      <Globe2 aria-hidden="true" size={16} />
      <select
        aria-label="Language"
        value={language}
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
