import type { I18nManifest } from '../lib/i18nManifest';
import { MISSION_BRAND } from '../lib/brandAssets';
import './MissionLogo.css';

type MissionLogoProps = {
  className?: string;
  eager?: boolean;
  decorative?: boolean;
};

export const MISSION_LOGO_I18N_MANIFEST = {
  componentKey: 'components.mission.logo',
  namespace: 'ui',
  translationKeys: [
  ] as const,
} as const satisfies I18nManifest;

export function MissionLogo({ className = '', eager = false, decorative = false }: MissionLogoProps) {
  return <img
    className={`mission-logo ${className}`.trim()}
    src={MISSION_BRAND.logoUrl}
    alt={decorative ? '' : `${MISSION_BRAND.name} logo`}
    aria-hidden={decorative || undefined}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    fetchPriority={eager ? 'high' : 'auto'}
  />;
}
