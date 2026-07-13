import { motion } from 'motion/react';
import { ComposableMap, Geographies, Geography, Line, Marker, ZoomableGroup } from 'react-simple-maps';
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

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

function personLabel(person: PremiumJourneyPoint['journey_person']) {
  return person === 'together' ? 'Kevin & Micha' : person === 'kevin' ? 'Kevin' : 'Micha';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
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

  return <div className="premium-map-layout">
    <Card className="premium-map-card">
      <div className="premium-map-card__topbar">
        <div><Badge>Interactive route</Badge><span>{mapped.length} mapped chapter{mapped.length === 1 ? '' : 's'}</span></div>
        <Button variant="ghost" size="sm" onClick={() => onSelect(mapped.find((point) => point.is_current_location)?.journey_entry_id || mapped[0].journey_entry_id)}><LocateFixed size={16}/> Current</Button>
      </div>
      <div className="premium-map-stage">
        <ComposableMap projection="geoMercator" projectionConfig={{ center: [-1.5, 39.5], scale: 1200 }} width={900} height={560}>
          <ZoomableGroup center={[-1.5, 39.5]} zoom={1} minZoom={1} maxZoom={6}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) => geographies.map((geo) => <Geography key={geo.rsmKey} geography={geo} fill="#111923" stroke="rgba(255,255,255,.12)" strokeWidth={0.45} style={{ default: { outline: 'none' }, hover: { fill: '#182332', outline: 'none' }, pressed: { outline: 'none' } }}/>) }
            </Geographies>
            {mapped.slice(0, -1).map((point, index) => {
              const to = mapped[index + 1];
              return <Line key={`${point.journey_entry_id}-${to.journey_entry_id}`} from={[Number(point.longitude), Number(point.latitude)]} to={[Number(to.longitude), Number(to.latitude)]} stroke="#d9ad63" strokeWidth={2.2} strokeLinecap="round" strokeDasharray="5 6"/>;
            })}
            {mapped.map((point, index) => <Marker key={point.journey_entry_id} coordinates={[Number(point.longitude), Number(point.latitude)]} onClick={() => onSelect(point.journey_entry_id)}>
              <motion.g whileHover={{ scale: 1.14 }} animate={{ scale: active?.journey_entry_id === point.journey_entry_id ? 1.16 : 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="premium-map-marker">
                {point.is_current_location ? <circle r={15} fill="rgba(217,173,99,.18)"/> : null}
                <circle r={active?.journey_entry_id === point.journey_entry_id ? 9 : 7} fill={point.is_current_location ? '#d9ad63' : '#101720'} stroke="#f3d9a3" strokeWidth={2}/>
                <text y={3} textAnchor="middle" fill={point.is_current_location ? '#101010' : '#fff'} fontSize="7" fontWeight="800">{index + 1}</text>
              </motion.g>
            </Marker>)}
          </ZoomableGroup>
        </ComposableMap>
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
