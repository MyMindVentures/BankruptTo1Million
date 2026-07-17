begin;

-- Keep the language selector database-driven while adding a clear visual cue.
-- LanguageSelector already renders site_languages.native_name, so the display
-- label remains sourced from the canonical language table without introducing
-- a second frontend language/flag map.
update public.site_languages as sl
set native_name = v.display_name
from (
  values
    ('en', '🇬🇧 English'),
    ('es', '🇪🇸 Español'),
    ('nl', '🇳🇱 Nederlands'),
    ('fr', '🇫🇷 Français'),
    ('de', '🇩🇪 Deutsch'),
    ('it', '🇮🇹 Italiano'),
    ('pt', '🇵🇹 Português'),
    ('pl', '🇵🇱 Polski'),
    ('ro', '🇷🇴 Română'),
    ('uk', '🇺🇦 Українська'),
    ('ru', '🇷🇺 Русский'),
    ('sv', '🇸🇪 Svenska'),
    ('no', '🇳🇴 Norsk'),
    ('da', '🇩🇰 Dansk'),
    ('fi', '🇫🇮 Suomi'),
    ('el', '🇬🇷 Ελληνικά'),
    ('cs', '🇨🇿 Čeština'),
    ('sk', '🇸🇰 Slovenčina'),
    ('sl', '🇸🇮 Slovenščina'),
    ('hu', '🇭🇺 Magyar'),
    ('hr', '🇭🇷 Hrvatski'),
    ('sr', '🇷🇸 Српски'),
    ('bg', '🇧🇬 Български'),
    ('lt', '🇱🇹 Lietuvių'),
    ('lv', '🇱🇻 Latviešu'),
    ('et', '🇪🇪 Eesti'),
    ('tr', '🇹🇷 Türkçe'),
    ('ar', '🇸🇦 العربية'),
    ('zh', '🇨🇳 中文'),
    ('hi', '🇮🇳 हिन्दी'),
    ('ja', '🇯🇵 日本語'),
    ('ko', '🇰🇷 한국어')
) as v(code, display_name)
where sl.code = v.code;

commit;
