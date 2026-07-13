import { MISSION_BRAND } from '../lib/brandAssets';
import './MissionLogo.css';

type MissionLogoProps = {
  className?: string;
  eager?: boolean;
  decorative?: boolean;
};

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
