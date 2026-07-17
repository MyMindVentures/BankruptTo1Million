import { ChevronDown, Cloud, CloudRain, CloudSun, ExternalLink, Globe, Instagram, LoaderCircle, MapPin, Snowflake, Sun, Wind } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getJournalCurrentWeather,
  getJournalPlaceContext,
  poiHasMapCoordinate,
  type JournalCurrentWeather,
  type JournalPlaceContext,
  weatherConditionKey,
} from '../../lib/journalPlaceContext';
import type { I18nManifest } from '../../lib/i18nManifest';
import { useWebsiteI18n } from '../../lib/websiteI18n';
import { JournalPoiMap } from './JournalPoiMap';
import './JournalPlaceContextSection.css';

export const JOURNAL_PLACE_CONTEXT_I18N_MANIFEST = {
  componentKey: 'journal.place_context.section',
  namespace: 'journal.place_context',
  translationKeys: [
    'journal.place_context.links.google_maps',
    'journal.place_context.links.instagram',
    'journal.place_context.links.website',
    'journal.place_context.section.title',
    'journal.place_context.loading',
    'journal.place_context.error',
    'journal.place_context.place.history_heading',
    'journal.place_context.area.history_heading',
    'journal.place_context.poi.heading',
    'journal.place_context.weather.heading',
    'journal.place_context.weather.loading',
    'journal.place_context.weather.error',
    'journal.place_context.weather.temperature',
    'journal.place_context.weather.feels_like',
    'journal.place_context.weather.wind',
    'journal.place_context.weather.humidity',
  ] as const,
  keyPatterns: [
    'journal.place_context.place_type.*',
    'journal.place_context.area_type.*',
    'journal.place_context.weather.condition.*',
  ] as const,
  entityContent: {
    rpc: 'get_localized_journal_place_context',
    tables: [
      'journal_post_place_context_translations',
      'journal_post_poi_translations',
    ],
  },
} as const satisfies I18nManifest;

type LoadState = 'loading' | 'empty' | 'ready' | 'error';
type WeatherState = 'idle' | 'loading' | 'ready' | 'error';

function WeatherIcon({ code }: { code: number | null }) {
  if (code == null) return <Cloud aria-hidden="true" />;
  if (code === 0) return <Sun aria-hidden="true" />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <Snowflake aria-hidden="true" />;
  if ([61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return <CloudRain aria-hidden="true" />;
  if ([51, 53, 55, 56, 57].includes(code)) return <CloudRain aria-hidden="true" />;
  return <CloudSun aria-hidden="true" />;
}

function placeTypeKey(type: string) {
  return `journal.place_context.place_type.${type}` as const;
}

function areaTypeKey(type: string) {
  return `journal.place_context.area_type.${type}` as const;
}

function ExternalLinkButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <a
      className="journal-place-context__link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
      <ExternalLink size={14} aria-hidden="true" />
    </a>
  );
}

export function JournalPlaceContextSection({ slug }: { slug: string }) {
  const { language, t, formatNumber } = useWebsiteI18n();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [context, setContext] = useState<JournalPlaceContext | null>(null);
  const [weatherState, setWeatherState] = useState<WeatherState>('idle');
  const [weather, setWeather] = useState<JournalCurrentWeather | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    setContext(null);
    setWeather(null);
    setWeatherState('idle');

    getJournalPlaceContext(slug, language)
      .then((payload) => {
        if (cancelled) return;
        if (!payload) {
          setLoadState('empty');
          return;
        }
        setContext(payload);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [slug, language]);

  useEffect(() => {
    if (!context?.latitude || !context?.longitude) return;
    let cancelled = false;
    setWeatherState('loading');
    setWeather(null);

    getJournalCurrentWeather(Number(context.latitude), Number(context.longitude))
      .then((payload) => {
        if (cancelled) return;
        setWeather(payload);
        setWeatherState('ready');
      })
      .catch(() => {
        if (!cancelled) setWeatherState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [context?.latitude, context?.longitude]);

  const links = useMemo(() => {
    if (!context) return [];
    const rows: Array<{ href: string; label: string; icon: ReactNode }> = [];
    if (context.links.google_maps_url) {
      rows.push({
        href: context.links.google_maps_url,
        label: t('journal.place_context.links.google_maps', 'Google Maps'),
        icon: <MapPin size={16} aria-hidden="true" />,
      });
    }
    if (context.links.instagram_url) {
      rows.push({
        href: context.links.instagram_url,
        label: t('journal.place_context.links.instagram', 'Instagram'),
        icon: <Instagram size={16} aria-hidden="true" />,
      });
    }
    if (context.links.website_url) {
      rows.push({
        href: context.links.website_url,
        label: t('journal.place_context.links.website', 'Website'),
        icon: <Globe size={16} aria-hidden="true" />,
      });
    }
    return rows;
  }, [context, t]);

  if (loadState === 'loading') {
    return (
      <section className="journal-place-context section" aria-busy="true" aria-live="polite">
        <p className="journal-place-context__loading">
          <LoaderCircle className="spin" size={16} aria-hidden="true" />
          {t('journal.place_context.loading', 'Loading place information…')}
        </p>
      </section>
    );
  }

  if (loadState === 'error') {
    return (
      <section className="journal-place-context section" aria-live="polite">
        <p className="journal-place-context__error" role="status">
          {t('journal.place_context.error', 'Place information is temporarily unavailable.')}
        </p>
      </section>
    );
  }

  if (loadState === 'empty' || !context) {
    return null;
  }

  const conditionLabel = t(
    weatherConditionKey(weather?.weather_code ?? null),
    'Current conditions',
  );

  return (
    <section className="journal-place-context section" aria-labelledby="journal-place-context-title">
      <div className="journal-place-context__header">
        <p className="eyebrow">{t('journal.place_context.section.title', 'About this place')}</p>
        <h2 id="journal-place-context-title">{context.place.title}</h2>
      </div>

      <div className="journal-place-context__grid">
        <article className="journal-place-context__panel">
          <p className="journal-place-context__eyebrow">
            {t(placeTypeKey(context.place_type), context.place_type)}
          </p>
          <h3>{context.place.title}</h3>
          <h4>{t('journal.place_context.place.history_heading', 'History & info')}</h4>
          <div className="journal-place-context__prose">{context.place.history}</div>
          {links.length ? (
            <div className="journal-place-context__links">
              {links.map((link) => (
                <ExternalLinkButton key={link.href} href={link.href} label={link.label} icon={link.icon} />
              ))}
            </div>
          ) : null}
        </article>

        <article className="journal-place-context__panel">
          <p className="journal-place-context__eyebrow">
            {t(areaTypeKey(context.area_type), context.area_type)}
          </p>
          <h3>{context.area.title}</h3>
          <h4>{t('journal.place_context.area.history_heading', 'Area history')}</h4>
          <div className="journal-place-context__prose">{context.area.history}</div>

          {context.pois.length ? (
            <div className="journal-place-context__pois">
              <h4>{t('journal.place_context.poi.heading', 'Points of interest nearby')}</h4>
              <div className="journal-place-context__poi-list">
                {context.pois.map((poi, index) => (
                  <details className="journal-place-context__poi" key={`${poi.display_order}-${poi.title}`}>
                    <summary>
                      <span className="journal-place-context__poi-number">{index + 1}</span>
                      <strong>{poi.title}</strong>
                      <ChevronDown className="journal-place-context__poi-chevron" size={18} aria-hidden="true" />
                    </summary>
                    <p>{poi.description}</p>
                  </details>
                ))}
              </div>
              {context.pois.some(poiHasMapCoordinate)
                && context.latitude != null
                && context.longitude != null ? (
                <JournalPoiMap
                  venue={{
                    latitude: Number(context.latitude),
                    longitude: Number(context.longitude),
                    title: context.place.title,
                  }}
                  pois={context.pois}
                />
              ) : null}
            </div>
          ) : null}

          {context.latitude != null && context.longitude != null ? (
            <div className="journal-place-context__weather" aria-live="polite">
              <div className="journal-place-context__weather-head">
                <h4>{t('journal.place_context.weather.heading', 'Current weather')}</h4>
                {weatherState === 'loading' ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : null}
              </div>
              {weatherState === 'loading' ? (
                <p className="journal-place-context__weather-note">
                  {t('journal.place_context.weather.loading', 'Loading current weather…')}
                </p>
              ) : null}
              {weatherState === 'error' ? (
                <p className="journal-place-context__weather-note journal-place-context__weather-note--error">
                  {t('journal.place_context.weather.error', 'Weather is temporarily unavailable.')}
                </p>
              ) : null}
              {weatherState === 'ready' && weather ? (
                <div className="journal-place-context__weather-card">
                  <div className="journal-place-context__weather-icon">
                    <WeatherIcon code={weather.weather_code} />
                  </div>
                  <div>
                    <p className="journal-place-context__weather-condition">{conditionLabel}</p>
                    <dl className="journal-place-context__weather-stats">
                      <div>
                        <dt>{t('journal.place_context.weather.temperature', 'Temperature')}</dt>
                        <dd>
                          {weather.temperature_c == null
                            ? '—'
                            : `${formatNumber(weather.temperature_c, { maximumFractionDigits: 1 })}°C`}
                        </dd>
                      </div>
                      <div>
                        <dt>{t('journal.place_context.weather.feels_like', 'Feels like')}</dt>
                        <dd>
                          {weather.apparent_temperature_c == null
                            ? '—'
                            : `${formatNumber(weather.apparent_temperature_c, { maximumFractionDigits: 1 })}°C`}
                        </dd>
                      </div>
                      <div>
                        <dt>{t('journal.place_context.weather.wind', 'Wind')}</dt>
                        <dd>
                          <Wind size={14} aria-hidden="true" />
                          {weather.wind_speed_kmh == null
                            ? '—'
                            : `${formatNumber(weather.wind_speed_kmh, { maximumFractionDigits: 0 })} km/h`}
                        </dd>
                      </div>
                      <div>
                        <dt>{t('journal.place_context.weather.humidity', 'Humidity')}</dt>
                        <dd>
                          {weather.humidity_percent == null
                            ? '—'
                            : `${formatNumber(weather.humidity_percent, { maximumFractionDigits: 0 })}%`}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
