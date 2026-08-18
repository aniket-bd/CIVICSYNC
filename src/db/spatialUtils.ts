import { Coordinate, GeoGeometry } from '../types/project';

/**
 * Calculates great-circle distance between two points on Earth in meters using Haversine formula
 */
export function calculateHaversineDistanceMeters(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates the shortest distance between a point and a line segment in meters
 */
export function distancePointToSegmentMeters(
  p: { lat: number; lng: number },
  v: { lat: number; lng: number },
  w: { lat: number; lng: number }
): number {
  const l2 = ((w.lat - v.lat) ** 2) + ((w.lng - v.lng) ** 2);
  if (l2 === 0) return calculateHaversineDistanceMeters(p, v);
  let t = ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = {
    lat: v.lat + t * (w.lat - v.lat),
    lng: v.lng + t * (w.lng - v.lng)
  };
  return calculateHaversineDistanceMeters(p, projection);
}

/**
 * Calculates minimum distance between two GeoJSON geometries or coordinate sets in meters
 */
export function calculateGeometryDistanceMeters(
  geom1?: GeoGeometry | { lat: number; lng: number },
  geom2?: GeoGeometry | { lat: number; lng: number }
): number {
  if (!geom1 || !geom2) return 999999;

  const getPoints = (g: GeoGeometry | { lat: number; lng: number }): { lat: number; lng: number }[] => {
    if ('lat' in g && 'lng' in g) return [{ lat: g.lat, lng: g.lng }];
    if (g.type === 'Point') {
      const coords = g.coordinates as number[];
      return [{ lat: coords[1], lng: coords[0] }];
    }
    if (g.type === 'LineString') {
      const coords = g.coordinates as number[][];
      return coords.map(([lng, lat]) => ({ lat, lng }));
    }
    if (g.type === 'Polygon') {
      const coords = (g.coordinates as number[][][])[0] || [];
      return coords.map(([lng, lat]) => ({ lat, lng }));
    }
    return [];
  };

  const pts1 = getPoints(geom1);
  const pts2 = getPoints(geom2);

  if (pts1.length === 0 || pts2.length === 0) return 999999;

  let minDistance = Infinity;

  // Compare all vertex pairs
  for (const p1 of pts1) {
    for (const p2 of pts2) {
      const d = calculateHaversineDistanceMeters(p1, p2);
      if (d < minDistance) minDistance = d;
    }
  }

  // If both have segments, also test point-to-segment
  if (pts1.length > 1) {
    for (let i = 0; i < pts1.length - 1; i++) {
      for (const p2 of pts2) {
        const d = distancePointToSegmentMeters(p2, pts1[i], pts1[i + 1]);
        if (d < minDistance) minDistance = d;
      }
    }
  }
  if (pts2.length > 1) {
    for (let i = 0; i < pts2.length - 1; i++) {
      for (const p1 of pts1) {
        const d = distancePointToSegmentMeters(p1, pts2[i], pts2[i + 1]);
        if (d < minDistance) minDistance = d;
      }
    }
  }

  return Math.round(minDistance);
}

/**
 * Calculates total route length from GeoJSON coordinates in meters
 */
export function calculateRouteLengthMeters(geometry?: GeoGeometry): number {
  if (!geometry || geometry.type !== 'LineString') return 0;
  const coords = geometry.coordinates as number[][];
  if (!coords || coords.length < 2) return 0;

  let totalMeters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    totalMeters += calculateHaversineDistanceMeters(
      { lat: coords[i][1], lng: coords[i][0] },
      { lat: coords[i + 1][1], lng: coords[i + 1][0] }
    );
  }
  return Math.round(totalMeters);
}

/**
 * Checks overlap in days between two date ranges
 */
export function calculateDateOverlapDays(
  start1Str: string,
  end1Str: string,
  start2Str: string,
  end2Str: string
): number {
  const s1 = new Date(start1Str).getTime();
  const e1 = new Date(end1Str).getTime();
  const s2 = new Date(start2Str).getTime();
  const e2 = new Date(end2Str).getTime();

  const maxStart = Math.max(s1, s2);
  const minEnd = Math.min(e1, e2);

  if (maxStart <= minEnd) {
    const diffTime = Math.abs(minEnd - maxStart);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
}
