import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Project } from '../../types/project';
import { getProjectTypeColor } from '../common/TypeIcon';
import { formatINR } from '../../utils/formatters';

interface Project2DMapBoundaryProps {
  project: Project;
  onSwitchTo3D: () => void;
}

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const GLASS_CARD: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.92) 0%, rgba(255, 237, 213, 0.82) 100%)',
  backdropFilter: 'blur(28px) saturate(210%)',
  WebkitBackdropFilter: 'blur(28px) saturate(210%)',
  border: '1.5px solid rgba(255, 149, 0, 0.35)',
  borderRadius: '16px',
  boxShadow: '0 12px 36px -4px rgba(255, 149, 0, 0.16)',
  fontFamily: F,
};

export const Project2DMapBoundary: React.FC<Project2DMapBoundaryProps> = ({ project, onSwitchTo3D }) => {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef  = useRef<maplibregl.Marker[]>([]);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite' | 'street'>('street');
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

  const routeCoords: number[][] = project.routeGeometry?.type === 'LineString'
    ? (project.routeGeometry.coordinates as number[][])
    : [];

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const tileUrl = mapStyle === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : mapStyle === 'street'
        ? 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
        : 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png';

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: { base: { type: 'raster', tiles: [tileUrl], tileSize: 256 } },
        layers:  [{ id: 'base', type: 'raster', source: 'base' }],
      },
      center: [project.longitude, project.latitude],
      zoom: 14.5, pitch: 25, bearing: -8,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      const typeColor = getProjectTypeColor(project.type);

      // Area Mask Outside Boundary
      map.addSource('mask', { type: 'geojson', data: {
        type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: {
          type: 'Polygon', coordinates: [
            [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]],
            polygonCoords,
          ],
        }}],
      }});
      map.addLayer({ id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#000', 'fill-opacity': 0.35 } });

      // Tender Area Polygon
      map.addSource('boundary', { type: 'geojson', data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [polygonCoords] } }] } });
      map.addLayer({ id: 'boundary-fill', type: 'fill',   source: 'boundary', paint: { 'fill-color': typeColor, 'fill-opacity': 0.14 } });
      map.addLayer({ id: 'boundary-line', type: 'line',   source: 'boundary', paint: { 'line-color': typeColor, 'line-width': 2.5, 'line-opacity': 0.95 } });

      // 3–5 KM Route Polyline Corridor
      if (routeCoords.length > 1) {
        map.addSource('route-corridor', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: routeCoords }
            }]
          }
        });

        // Glowing underlayer
        map.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route-corridor',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': typeColor,
            'line-width': 10,
            'line-opacity': 0.4,
            'line-blur': 3
          }
        });

        // Solid route line
        map.addLayer({
          id: 'route-solid',
          type: 'line',
          source: 'route-corridor',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': typeColor,
            'line-width': 4.5,
            'line-opacity': 0.95
          }
        });
      }

      // Station Milestone Markers
      if (project.stations && project.stations.length > 0) {
        project.stations.forEach((st) => {
          const el = document.createElement('div');
          el.style.cssText = `
            background: rgba(15, 23, 42, 0.9);
            color: #ffffff;
            border: 2px solid ${typeColor};
            border-radius: 980px;
            padding: 3px 8px;
            font-size: 10.5px;
            font-weight: 700;
            font-family: monospace;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            white-space: nowrap;
          `;
          el.innerText = `KM ${st.km.toFixed(1)}`;
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([st.lng, st.lat])
            .addTo(map);
          markersRef.current.push(marker);
        });
      } else {
        const el = document.createElement('div');
        el.style.cssText = `width:26px;height:26px;border-radius:50%;background:${typeColor};border:3px solid rgba(255,255,255,1);box-shadow:0 4px 14px rgba(0,0,0,0.35);`;
        const marker = new maplibregl.Marker({ element: el }).setLngLat([project.longitude, project.latitude]).addTo(map);
        markersRef.current.push(marker);
      }
    });

    mapInstance.current = map;
    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapInstance.current = null;
    };
  }, [project.id, mapStyle]);

  const typeColor = getProjectTypeColor(project.type);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* TOP LEFT: Project Info Card */}
      <div style={{ ...GLASS_CARD, position: 'absolute', top: '20px', left: '20px', padding: '16px 18px', maxWidth: '340px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: typeColor, boxShadow: `0 0 8px ${typeColor}` }} />
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {project.type} · {project.tenderNumber}
          </span>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: '6px' }}>
          {project.name}
        </div>
        <div style={{ fontSize: '12px', color: '#515154', marginBottom: '10px' }}>
          {project.locationName}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', padding: '5px 8px', fontSize: '11px', fontFamily: 'monospace', color: '#0071e3', border: '1px solid rgba(0, 113, 227, 0.2)', fontWeight: 600 }}>
            {project.latitude.toFixed(5)}°N · {project.longitude.toFixed(5)}°E
          </div>
          <div style={{ background: 'rgba(0, 113, 227, 0.08)', borderRadius: '8px', padding: '5px 8px', fontSize: '11px', fontFamily: 'monospace', color: '#0071e3', border: '1px solid rgba(0, 113, 227, 0.25)', fontWeight: 700 }}>
            {((project.lengthMeters ?? 3500) / 1000).toFixed(2)} KM Route
          </div>
        </div>
      </div>

      {/* TOP RIGHT: Basemap switcher submenu */}
      <div style={{ ...GLASS_CARD, position: 'absolute', top: '20px', right: '60px', padding: '4px', display: 'flex', gap: '3px', zIndex: 10 }}>
        {(['street', 'satellite', 'dark'] as const).map(s => (
          <button key={s} onClick={() => setMapStyle(s)} style={{
            padding: '6px 14px',
            borderRadius: '12px',
            border: mapStyle === s ? '1px solid rgba(255, 149, 0, 0.5)' : '1px solid transparent',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: mapStyle === s ? 700 : 500,
            fontFamily: F,
            background: mapStyle === s ? 'linear-gradient(180deg, #ff7a00 0%, #ff5500 100%)' : 'transparent',
            color: mapStyle === s ? '#ffffff' : '#515154',
            boxShadow: mapStyle === s ? '0 2px 8px rgba(255, 107, 0, 0.35)' : 'none',
            transition: 'all 0.15s',
            textTransform: 'capitalize',
          }}>
            {s}
          </button>
        ))}
      </div>

      {/* BOTTOM CENTER: Switch to 3D Button */}
      <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <button
          className="btn btn-primary"
          onClick={onSwitchTo3D}
          style={{
            padding: '12px 26px',
            fontSize: '14px',
            background: 'linear-gradient(180deg, #ff7a00 0%, #ff5500 100%)',
            boxShadow: '0 8px 24px rgba(255, 107, 0, 0.45)',
            border: '1px solid rgba(255, 149, 0, 0.5)'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          Launch 3D Spatial Twin
        </button>
      </div>

      {/* BOTTOM LEFT: Quick Specs */}
      <div style={{ ...GLASS_CARD, position: 'absolute', bottom: '24px', left: '20px', padding: '12px 18px', display: 'flex', gap: '22px', zIndex: 10 }}>
        {[
          { label: 'Pipe Depth', value: project.depthMeters ? `–${project.depthMeters}m` : '—', color: '#9a6700' },
          { label: 'Corridor',   value: `${((project.lengthMeters ?? 3500) / 1000).toFixed(1)} km`, color: '#0071e3' },
          { label: 'Budget',     value: formatINR(project.budget), color: '#1a7f37' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: '10.5px', color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', fontFamily: 'SF Mono, ui-monospace, monospace' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
