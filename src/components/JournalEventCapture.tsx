import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Crosshair, FileVideo2, MapPin, Plus, Search, UserPlus, Users, X } from 'lucide-react';
import { createJourneyPerson, type EventTypeOption, type FounderOption, type JournalEventPayload, type JourneyPerson } from '../lib/journalAdminApi';

declare global { interface Window { L?: any } }

const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
function encodePlusCode(latitude: number, longitude: number, length = 10) {
  let lat = Math.min(90, Math.max(-90, latitude)) + 90;
  let lng = ((longitude + 180) % 360 + 360) % 360;
  const placeValues = [20, 1, .05, .0025, .000125];
  let code = '';
  for (let i = 0; i < 5; i += 1) {
    const latDigit = Math.floor(lat / placeValues[i]);
    const lngDigit = Math.floor(lng / placeValues[i]);
    lat -= latDigit * placeValues[i]; lng -= lngDigit * placeValues[i];
    code += CODE_ALPHABET[latDigit] + CODE_ALPHABET[lngDigit];
    if (code.length === 8) code += '+';
  }
  return code.slice(0, length + 1);
}

function LeafletPicker({ latitude, longitude, onPick }: { latitude: string; longitude: string; onPick: (lat: number, lng: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; link.dataset.leaflet = 'true'; document.head.appendChild(link);
      }
      if (!window.L) await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[data-leaflet]') as HTMLScriptElement | null;
        if (existing) { existing.addEventListener('load', () => resolve(), { once: true }); return; }
        const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.dataset.leaflet = 'true'; script.onload = () => resolve(); script.onerror = () => reject(new Error('Map failed to load')); document.body.appendChild(script);
      });
      if (!active || !ref.current || !window.L || mapRef.current) return;
      const lat = Number(latitude) || 36.7213; const lng = Number(longitude) || -4.4214;
      const map = window.L.map(ref.current, { zoomControl: true }).setView([lat, lng], Number(latitude) ? 14 : 7);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      const marker = window.L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => { const point = marker.getLatLng(); onPick(point.lat, point.lng); });
      map.on('click', (event: any) => { marker.setLatLng(event.latlng); onPick(event.latlng.lat, event.latlng.lng); });
      mapRef.current = map; markerRef.current = marker;
    }
    void load();
    return () => { active = false; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  useEffect(() => {
    const lat = Number(latitude); const lng = Number(longitude);
    if (markerRef.current && Number.isFinite(lat) && Number.isFinite(lng)) { markerRef.current.setLatLng([lat, lng]); mapRef.current?.panTo([lat, lng]); }
  }, [latitude, longitude]);

  return <div ref={ref} className="event-map-canvas" />;
}

export function JournalEventCapture({ value, onChange, founders, people, eventTypes, files, onFilesChange, onPeopleRefresh }: {
  value: JournalEventPayload;
  onChange: (next: JournalEventPayload) => void;
  founders: FounderOption[];
  people: JourneyPerson[];
  eventTypes: EventTypeOption[];
  files: File[];
  onFilesChange: (files: File[]) => void;
  onPeopleRefresh: (person: JourneyPerson) => void;
}) {
  const [peopleQuery, setPeopleQuery] = useState('');
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ display_name: '', full_name: '', email: '', phone: '', person_type: 'guest', location: '' });
  const captureRef = useRef<HTMLInputElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const filteredPeople = useMemo(() => people.filter((person) => `${person.display_name} ${person.full_name || ''} ${person.email || ''}`.toLowerCase().includes(peopleQuery.toLowerCase())).slice(0, 12), [people, peopleQuery]);
  const selectedPeople = people.filter((person) => value.person_ids.includes(person.id));

  async function reverseLookup(lat: number, lng: number) {
    onChange({ ...value, latitude: lat.toFixed(6), longitude: lng.toFixed(6), plus_code: encodePlusCode(lat, lng) });
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const result = await response.json() as { display_name?: string; name?: string; address?: { city?: string; town?: string; village?: string } };
      onChange({ ...value, latitude: lat.toFixed(6), longitude: lng.toFixed(6), plus_code: encodePlusCode(lat, lng), location_name: result.name || result.address?.city || result.address?.town || result.address?.village || value.location_name, address_text: result.display_name || value.address_text });
    } catch { /* Coordinates remain valid when reverse geocoding is unavailable. */ }
  }

  function useDeviceLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => void reverseLookup(position.coords.latitude, position.coords.longitude), () => undefined, { enableHighAccuracy: true, timeout: 15000 });
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)].filter((file, index, all) => all.findIndex((item) => item.name === file.name && item.size === file.size) === index);
    onFilesChange(next);
  }

  async function createContact() {
    setCreatingContact(true);
    try {
      const person = await createJourneyPerson(contactForm);
      onPeopleRefresh(person);
      onChange({ ...value, person_ids: [...value.person_ids, person.id] });
      setNewContactOpen(false); setContactForm({ display_name: '', full_name: '', email: '', phone: '', person_type: 'guest', location: '' });
    } finally { setCreatingContact(false); }
  }

  return <div className="event-capture-stack">
    <section className="event-panel event-panel-subject"><div className="event-panel-heading"><span>01</span><div><h3>Who is this story about?</h3><p>Select Kevin, Micha, or both.</p></div></div><div className="founder-choice-grid">{founders.map((founder) => { const selected = value.subject_founder_ids.includes(founder.id); return <button type="button" key={founder.id} className={selected ? 'selected' : ''} onClick={() => onChange({ ...value, subject_founder_ids: selected ? value.subject_founder_ids.filter((id) => id !== founder.id) : [...value.subject_founder_ids, founder.id], journey_person: founder.slug.includes('kevin') ? 'kevin' : founder.slug.includes('micha') ? 'micha' : 'together' })}><div>{founder.label.slice(0, 1)}</div><span><strong>{founder.label}</strong><small>Founder journey</small></span>{selected && <Check size={17} />}</button>; })}</div></section>

    <section className="event-panel"><div className="event-panel-heading"><span>02</span><div><h3>When and what happened?</h3><p>Define the event moment and story type.</p></div></div><div className="event-two-column"><label>Event date and time<input type="datetime-local" required value={value.occurred_at} onChange={(e) => onChange({ ...value, occurred_at: e.target.value })} /></label><label>Event type<select value={value.event_type} onChange={(e) => onChange({ ...value, event_type: e.target.value })}>{eventTypes.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}</select></label></div><label>Event description<textarea rows={5} required value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} placeholder="Describe what happened, why it mattered, and the human context…" /></label></section>

    <section className="event-panel"><div className="event-panel-heading"><span>03</span><div><h3>Where did it happen?</h3><p>Drop a pin or capture the current device location.</p></div></div><div className="event-location-actions"><button type="button" onClick={useDeviceLocation}><Crosshair size={17} />Use current location</button><div><MapPin size={15} /><span>{value.plus_code || 'Google Plus Code will appear here'}</span></div></div><LeafletPicker latitude={value.latitude} longitude={value.longitude} onPick={(lat, lng) => void reverseLookup(lat, lng)} /><div className="event-two-column"><label>Location name<input value={value.location_name} onChange={(e) => onChange({ ...value, location_name: e.target.value })} placeholder="Finca, beach, town, venue…" /></label><label>Google Plus Code<input value={value.plus_code} onChange={(e) => onChange({ ...value, plus_code: e.target.value })} /></label></div><label>Address<input value={value.address_text} onChange={(e) => onChange({ ...value, address_text: e.target.value })} /></label></section>

    <section className="event-panel"><div className="event-panel-heading"><span>04</span><div><h3>Who was there?</h3><p>Search existing contacts or create a new person.</p></div><button type="button" className="event-add-contact" onClick={() => setNewContactOpen(true)}><UserPlus size={16} />New contact</button></div><div className="people-search"><Search size={17} /><input value={peopleQuery} onChange={(e) => setPeopleQuery(e.target.value)} placeholder="Fast search by name or email…" /></div>{selectedPeople.length > 0 && <div className="selected-people">{selectedPeople.map((person) => <button type="button" key={person.id} onClick={() => onChange({ ...value, person_ids: value.person_ids.filter((id) => id !== person.id) })}>{person.display_name}<X size={13} /></button>)}</div>}<div className="people-results">{filteredPeople.map((person) => { const selected = value.person_ids.includes(person.id); return <button type="button" key={person.id} className={selected ? 'selected' : ''} onClick={() => onChange({ ...value, person_ids: selected ? value.person_ids.filter((id) => id !== person.id) : [...value.person_ids, person.id] })}><div><Users size={16} /></div><span><strong>{person.display_name}</strong><small>{person.email || person.person_type}</small></span>{selected && <Check size={16} />}</button>; })}</div></section>

    <section className="event-panel"><div className="event-panel-heading"><span>05</span><div><h3>Capture or upload footage</h3><p>Photos and videos are uploaded to the Media Vault and linked to this journal post.</p></div></div><div className="footage-actions"><button type="button" onClick={() => captureRef.current?.click()}><Camera size={21} /><strong>Capture footage</strong><span>Open device camera</span></button><button type="button" onClick={() => uploadRef.current?.click()}><FileVideo2 size={21} /><strong>Upload footage</strong><span>Select from device</span></button></div><input ref={captureRef} hidden type="file" accept="image/*,video/*" capture="environment" multiple onChange={(e) => addFiles(e.target.files)} /><input ref={uploadRef} hidden type="file" accept="image/*,video/*" multiple onChange={(e) => addFiles(e.target.files)} />{files.length > 0 && <div className="footage-queue">{files.map((file, index) => <div key={`${file.name}-${index}`}><span>{file.type.startsWith('video/') ? <FileVideo2 size={16} /> : <Camera size={16} />}</span><p><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></p><button type="button" onClick={() => onFilesChange(files.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></button></div>)}</div>}</section>

    {newContactOpen && <div className="contact-modal-backdrop"><div className="contact-modal"><header><div><p>NEW JOURNEY CONTACT</p><h3>Add a person</h3></div><button type="button" onClick={() => setNewContactOpen(false)}><X /></button></header><div><label>Display name<input required value={contactForm.display_name} onChange={(e) => setContactForm({ ...contactForm, display_name: e.target.value })} /></label><label>Full name<input value={contactForm.full_name} onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })} /></label><label>Email<input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} /></label><label>Phone<input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} /></label><label>Person type<select value={contactForm.person_type} onChange={(e) => setContactForm({ ...contactForm, person_type: e.target.value })}><option value="guest">Guest</option><option value="host">Host</option><option value="supporter">Supporter</option><option value="partner">Partner</option><option value="interviewee">Interviewee</option></select></label><label>Location<input value={contactForm.location} onChange={(e) => setContactForm({ ...contactForm, location: e.target.value })} /></label></div><footer><button type="button" onClick={() => setNewContactOpen(false)}>Cancel</button><button type="button" className="primary" disabled={!contactForm.display_name || creatingContact} onClick={() => void createContact()}><Plus size={16} />{creatingContact ? 'Creating…' : 'Create contact'}</button></footer></div></div>}
  </div>;
}
