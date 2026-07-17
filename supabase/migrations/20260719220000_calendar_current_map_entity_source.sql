-- CurrentLocationMap now pins journey_calendar_entries (admin stop coords), not journal map points.

update public.website_ui_components
set
  entity_content = '{"tables":["journey_calendar_entries"]}'::jsonb,
  updated_at = now()
where component_key = 'components.journey.calendar.current_map';
