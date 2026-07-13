import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, LocateFixed, MapPin, Navigation, Route, Sparkles } from 'lucide-react';
import { Badge, Card } from './ui/card';
import { Button, ButtonLink } from './ui/button';
import './PremiumJourneyMap.css';

export type PremiumJourneyPoint = {
  journey_entry_id: string;
  slug: string;
  title: string;
  excerpt?: string;
  occurred_at: string;
  country_name?: string;
  city_name?: string;
  location_name?: string;
  latitude?: number | string;
  longitude?: number | string;
  journey_person: 'kevin' | 'micha' | 'together';
  is_milestone: boolean;
  is_current_location: boolean;
};

function personLabel(person: PremiumJourneyPoint['journey_person']) {
  return person === 'together' ? 'Kevin & Micha' : person === 'kevin' ? 'Kevin' : 'Micha';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function projectPoint(point: PremiumJourneyPoint, all: PremiumJourneyPoint[]) {
  const lats = all.map((item) => Number(item.latitude));
  const lngs = all.map((item) => Number(item.longitude));
  const minLat = Math.min(...lats, 37.8);
  const maxLat = Math.max(...lats, 39.2);
  const minLng = Math.min(...lngs, -1.2);
  const maxLng = Math.max(...lngs, 0.4);
  const x = 12 + ((Number(point.longitude) - minLng) / Math.max(maxLng - minLng, 0.1)) * 76;
  const y = 18 + (1 - (Number(point.latitude) - minLat) / Math.max(maxLat - minLat, 0.1)) * 64;
  return { x, y };
}

export function PremiumJourneyMap({ points, activeId, onSelect }: { points: PremiumJourneyPoint[]; activeId?: string; onSelect: (id: string) => void }) {
  const mapped = points.filter((point) => point.latitude != null && point.longitude != null);
  const active = mapped.find((point) => point.journey_entry_id === activeId) || mapped[0];
  const activeIndex = Math.max(0, mapped.findIndex((point) => point.journey_entry_id === active?.journey_entry_id));
  const previous = mapped[(activeIndex - 1 + mapped.length) % mapped.length];
  const next = mapped[(activeIndex + 1) % mapped.length];

  if (!mapped.length) {
    return <Card className="premium-map-empty"><Route/><h3>The first mapped chapter is coming.</h3><p>Publish a journey location with coordinates to activate the route.</p></Card>;
  }

  const routePoints = mapped.map((point) => {
    const position = projectPoint(point, mapped);
    return `${position.x},${position.y}`;
  }).join(' ');

  return <div className="premium-map-layout">
    <Card className="premium-map-card">
      <div className="premium-map-card__topbar">
        <div><Badge>Interactive route</Badge><span>{mapped.length} mapped chapter{mapped.length === 1 ? '' : 's'}</span></div>
        <Button variant="ghost" size="sm" onClick={() => onSelect(mapped.find((point) => point.is_current_location)?.journey_entry_id || mapped[0].journey_entry_id)}><LocateFixed size={16}/> Current</Button>
      </div>
      <div className="premium-map-stage">
        <svg viewBox="0 0 100 100" role="img" aria-label="Journey route map">
          <defs>
            <radialGradient id="mapGlow" cx="35%" cy="35%" r="70%"><stop offset="0%" stopColor="#19324a" stopOpacity=".7"/><stop offset="100%" stopColor="#071019" stopOpacity="0"/></radialGradient>
            <filter id="routeGlow"><feGaussianBlur stdDeviation=".6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <rect width="100" height="100" fill="#081018"/>
          <rect width="100" height="100" fill="url(#mapGlow)"/>
          <g className="premium-map-grid-lines" aria-hidden="true">
            {[20,40,60,80].map((value)=><line key={`v-${value}`} x1={value} y1="0" x2={value} y2="100"/>)}
            {[20,40,60,80].map((value)=><line key={`h-${value}`} x1="0" y1={value} x2="100" y2={value}/>) }
          </g>
          <path className="premium-map-landmass" d="M10,72 C18,55 24,31 39,22 C50,15 66,18 75,29 C83,39 87,53 82,66 C76,80 57,88 39,85 C25,83 15,79 10,72 Z"/>
          <path className="premium-map-coastline" d="M22,68 C29,55 34,38 44,31 C54,24 66,27 73,37 C78,45 78,56 73,65 C66,76 52,80 39,77 C31,75 25,72 22,68 Z"/>
          <polyline points={routePoints} className="premium-map-route-line" filter="url(#routeGlow)"/>
          {mapped.map((point, index) => {
            const position = projectPoint(point, mapped);
            const selected = active?.journey_entry_id === point.journey_entry_id;
            return <motion.g key={point.journey_entry_id} className="premium-map-marker" onClick={() => onSelect(point.journey_entry_id)} whileHover={{ scale: 1.16 }} animate={{ scale: selected ? 1.18 : 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} style={{ transformOrigin: `${position.x}px ${position.y}px` }}>
              {point.is_current_location ? <circle cx={position.x} cy={position.y} r="4.2" fill="rgba(217,173,99,.18)"/> : null}
              <circle cx={position.x} cy={position.y} r={selected ? 2.4 : 1.9} fill={point.is_current_location ? '#d9ad63' : '#101720'} stroke="#f3d9a3" strokeWidth=".7"/>
              <text x={position.x} y={position.y + .9} textAnchor="middle" fill={point.is_current_location ? '#101010' : '#fff'} fontSize="2.2" fontWeight="800">{index + 1}</text>
            </motion.g>;
          })}
        </svg>
        <div className="premium-map-legend"><span><i className="is-past"/> Past chapter</span><span><i className="is-current"/> Current location</span><span><i className="is-route"/> Journey route</span></div>
      </div>
    </Card>

    <Card className="premium-map-detail-card">
      <div className="premium-map-detail-card__meta"><Badge>{personLabel(active.journey_person)}</Badge>{active.is_current_location ? <Badge className="premium-map-live"><span/> Live location</Badge> : null}</div>
      <div className="premium-map-detail-card__icon">{active.is_current_location ? <Navigation/> : active.is_milestone ? <Sparkles/> : <MapPin/>}</div>
      <time>{formatDate(active.occurred_at)}</time>
      <h3>{active.title}</h3>
      <p className="premium-map-detail-card__location"><MapPin size={16}/>{active.location_name || active.city_name}{active.country_name ? `, ${active.country_name}` : ''}</p>
      <p>{active.excerpt}</p>
      {active.slug ? <ButtonLink href={`/journal/${active.slug}`}>Read this chapter <ChevronRight size={16}/></ButtonLink> : null}
      <div className="premium-map-detail-card__nav"><Button variant="ghost" size="sm" onClick={() => onSelect(previous.journey_entry_id)}><ChevronLeft size={16}/> Previous</Button><Button variant="ghost" size="sm" onClick={() => onSelect(next.journey_entry_id)}>Next <ChevronRight size={16}/></Button></div>
    </Card>
  </div>;
}
