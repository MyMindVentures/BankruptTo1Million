export type MapNavPoint = {
  journey_entry_id: string;
  occurred_at: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

export function isMapCoordinatePoint(point: MapNavPoint): boolean {
  const lat = point.latitude;
  const lng = point.longitude;
  if (lat == null || lng == null || lat === '' || lng === '') return false;
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

export function sortMapPointsChronologically<T extends MapNavPoint>(points: readonly T[]): T[] {
  return [...points]
    .filter(isMapCoordinatePoint)
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime() || a.journey_entry_id.localeCompare(b.journey_entry_id));
}

export function newestMapPoint<T extends MapNavPoint>(points: readonly T[]): T | undefined {
  const mapped = sortMapPointsChronologically(points);
  return mapped[mapped.length - 1];
}

export function resolveMapActivePoint<T extends MapNavPoint>(mapped: readonly T[], activeId?: string): T | undefined {
  if (!mapped.length) return undefined;
  if (!activeId) return mapped[mapped.length - 1];
  return mapped.find((point) => point.journey_entry_id === activeId);
}

export function getMapNavigation<T extends MapNavPoint>(points: readonly T[], activeId?: string) {
  const mapped = sortMapPointsChronologically(points);
  const active = resolveMapActivePoint(mapped, activeId) ?? mapped[mapped.length - 1];
  const activeIndex = active ? mapped.findIndex((point) => point.journey_entry_id === active.journey_entry_id) : -1;
  const safeIndex = Math.max(0, activeIndex);

  return {
    mapped,
    active,
    activeIndex: safeIndex,
    previous: safeIndex > 0 ? mapped[safeIndex - 1] : undefined,
    next: safeIndex >= 0 && safeIndex < mapped.length - 1 ? mapped[safeIndex + 1] : undefined,
    isActiveIdValid: Boolean(activeId && mapped.some((point) => point.journey_entry_id === activeId)),
  };
}
