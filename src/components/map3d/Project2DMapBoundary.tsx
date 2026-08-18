import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Project } from '../../types/project';
import { getProjectTypeColor } from '../common/TypeIcon';
import { formatINR } from '../../utils/formatters';

interface Project2DMapBoundaryProps {
  project: Project;
  onSwitchTo3D: () => void;
}

const F = 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.42)',
  backdropFilter: 'blur(36px) saturate(220%)',
  WebkitBackdropFilter: 'blur(36px) saturate(220%)',
  border: '1px solid rgba(255, 255, 255, 0.62)',
  borderRadius: '18px',
  boxShadow: '0 18px 50px -14px rgba(15, 23, 42, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.78)',
  fontFamily: F,
};

function calculatePolygonSpanMeters(coords: number[][]): { spanXMeters: number; spanZMeters: number; areaSqMeters: number } {
  if (!coords || coords.length < 3) return { spanXMeters: 0, spanZMeters: 0, areaSqMeters: 0 };
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const midLat = (minLat + maxLat) / 2;

  // Approximate meters conversion
  const metersPerDegLat = 111139;
  const metersPerDegLng = 111139 * Math.cos((midLat * Math.PI) / 180);

  const spanXMeters = Math.round((maxLng - minLng) * metersPerDegLng);
  const spanZMeters = Math.round((maxLat - minLat) * metersPerDegLat);

  // Shoelace area in square meters
  let area = 0;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0] * metersPerDegLng;
    const zi = coords[i][1] * metersPerDegLat;
    const xj = coords[j][0] * metersPerDegLng;
    const zj = coords[j][1] * metersPerDegLat;
    area += (xj + xi) * (zj - zi);
  }
  const areaSqMeters = Math.round(Math.abs(area / 2));

  return { spanXMeters, spanZMeters, areaSqMeters };
}

export const Project2DMapBoundary: React.FC<Project2DMapBoundaryProps> = ({ project, onSwitchTo3D }) => {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markerRef   = useRef<maplibregl.Marker | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark'|'satellite'|'street'>('satellite');
  const offset = 0.0035;

  const polygonCoords: number[][] = project.areaPolygon?.type === 'Polygon'
    ? (project.areaPolygon.coordinates as number[][][])[0]
    : [
        [project.longitude - offset,     project.latitude - offset * 0.7],
        [project.longitude + offset,     project.latitude - offset * 0.7],
        [project.longitude + offset,     project.latitude + offset * 0.7],
        [project.longitude - offset,     project.latitude + offset * 0.7],
        [project.longitude - offset,     project.latitude - offset * 0.7],
      ];

  const { spanXMeters, spanZMeters, areaSqMeters } = calculatePolygonSpanMeters(polygonCoords);
  const areaFormatted = areaSqMeters > 10000
    ? `${(areaSqMeters / 10000).toFixed(2)} ha (${areaSqMeters.toLocaleString()} m²)`
    : `${areaSqMeters.toLocaleString()} m²`;

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }

    const tileUrl = mapStyle === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : mapStyle === 'street'
        ? 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
        : 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png';

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: { base: { type: 'raster', tiles: [tileUrl], tileSize: 256 } },
        layers:  [{ id: 'base', type: 'raster', source: 'base' }],
      },
      center: [project.longitude, project.latitude],
      zoom: 15.6, pitch: 28, bearing: -6,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      const typeColor = getProjectTypeColor(project.type);

      map.addSource('mask', { type: 'geojson', data: {
        type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: {
          type: 'Polygon', coordinates: [
            [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]],
            polygonCoords,
          ],
        }}],
      }});
      map.addLayer({ id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#0b1220', 'fill-opacity': mapStyle === 'satellite' ? 0.28 : 0.42 } });

      map.addSource('boundary', { type: 'geojson', data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [polygonCoords] } }] } });
      map.addLayer({ id: 'boundary-fill', type: 'fill',   source: 'boundary', paint: { 'fill-color': typeColor, 'fill-opacity': 0.22 } });
      map.addLayer({ id: 'boundary-line', type: 'line',   source: 'boundary', paint: { 'line-color': typeColor, 'line-width': 3, 'line-opacity': 0.95 } });

      const lats = polygonCoords.map(c => c[1]);
      const lngs = polygonCoords.map(c => c[0]);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 76, duration: 0, pitch: 28, bearing: -6 }
      );

      const el = document.createElement('div');
      el.style.cssText = `width:30px;height:30px;border-radius:50%;background:${typeColor};border:3.5px solid rgba(255,255,255,1);box-shadow:0 6px 18px rgba(0,0,0,0.38);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:12px;`;
      el.innerText = '●';
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([project.longitude, project.latitude]).addTo(map);
    });

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, [project.id, mapStyle]);

  const typeColor = getProjectTypeColor(project.type);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Top Left: Project & Location Info */}
      <div style={{ ...GLASS_CARD, position: 'absolute', top: '20px', left: '20px', padding: '16px 18px', maxWidth: '360px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: typeColor, boxShadow: `0 0 8px ${typeColor}` }} />
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            2D Tender Region · {project.type} · {project.tenderNumber}
          </span>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: '6px' }}>
          {project.name}
        </div>
        <div style={{ fontSize: '12px', color: '#515154', marginBottom: '4px' }}>
          {project.wardOrRegion} · {project.locationName}
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.62)', borderRadius: '10px', padding: '7px 10px', fontSize: '11.5px', fontFamily: 'SF Mono, ui-monospace, monospace', color: '#0071e3', border: '1px solid rgba(0, 113, 227, 0.18)', fontWeight: 600 }}>
          {project.latitude.toFixed(6)}°N · {project.longitude.toFixed(6)}°E
        </div>
      </div>

      {/* Top Right: Basemap Selector */}
      <div style={{ ...GLASS_CARD, position: 'absolute', top: '20px', right: '60px', padding: '4px', display: 'flex', gap: '3px', zIndex: 10 }}>
        {(['dark','satellite','street'] as const).map(s => (
          <button key={s} onClick={() => setMapStyle(s)} style={{
            padding: '6px 14px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: mapStyle === s ? 600 : 400,
            fontFamily: F,
            background: mapStyle === s ? '#1d1d1f' : 'transparent',
            color: mapStyle === s ? '#ffffff' : '#1d1d1f',
            boxShadow: mapStyle === s ? '0 1px 3px rgba(0, 0, 0, 0.18)' : 'none',
            transition: 'all 0.15s',
            textTransform: 'capitalize',
          }}>
            {s === 'dark' ? 'Dark' : s === 'satellite' ? 'Satellite' : 'Street'}
          </button>
        ))}
      </div>

      {/* Center Bottom: Launch 3D Twin CTA */}
      <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <button
          className="btn btn-primary"
          onClick={onSwitchTo3D}
          style={{
            padding: '12px 26px',
            fontSize: '14px',
            background: '#0071e3',
            boxShadow: '0 10px 28px rgba(0, 113, 227, 0.32)',
            border: '1px solid rgba(255,255,255,0.35)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          Open 3D Depth Twin
        </button>
      </div>

      {/* Bottom Left: Calibrated Real Dimensions HUD */}
      <div style={{ ...GLASS_CARD, position: 'absolute', bottom: '24px', left: '20px', padding: '12px 18px', display: 'flex', gap: '20px', zIndex: 10 }}>
        <div>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>2D Parcel Span</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d1d1f', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
            {spanXMeters}m × {spanZMeters}m
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Tender Area</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
            {areaFormatted}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Depth Profile</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#9a6700', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
            {project.depthMeters ? `–${project.depthMeters}m` : '—'}
          </div>
        </div>
        {project.heightMeters ? (
          <div>
            <div style={{ fontSize: '10px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Elevation/Height</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a7f37', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
              +{project.heightMeters}m
            </div>
          </div>
        ) : null}
        <div>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Budget</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
            {formatINR(project.budget)}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Project2DMapBoundary;
