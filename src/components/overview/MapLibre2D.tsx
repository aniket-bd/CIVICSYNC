import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Project, ProjectType, ProjectStatus } from '../../types/project';
import { getProjectTypeColor } from '../common/TypeIcon';
import { formatINR, formatDepth } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { VisibilityBadge } from '../common/VisibilityBadge';
import { 
  Eye, 
  Box, 
  Filter, 
  Radar, 
  MapPinOff,
  Sparkles
} from 'lucide-react';

interface MapLibre2DProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onOpenIn3D: (project: Project) => void;
  onOpenDetails: (project: Project) => void;
}

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const MapLibre2D: React.FC<MapLibre2DProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenIn3D,
  onOpenDetails
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState<ProjectType | 'All'>('All');
  const [activeFilterStatus, setActiveFilterStatus] = useState<ProjectStatus | 'All'>('All');

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'carto-base': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
              ],
              tileSize: 256,
              attribution: '&copy; CartoDB &copy; OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'carto-base-layer',
              type: 'raster',
              source: 'carto-base',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: [79.0650, 21.1440], // Nagpur Center
        zoom: 13.5,
        pitch: 0,
        bearing: 0
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

      map.on('load', () => {
        setMapLoaded(true);
      });

      mapRef.current = map;
    } catch (err) {
      console.warn('MapLibre initialization warning:', err);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON Lines & Custom Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Filter projects for display
    const visibleProjects = projects.filter(p => {
      const matchType = activeFilterType === 'All' || p.type === activeFilterType;
      const matchStatus = activeFilterStatus === 'All' || p.status === activeFilterStatus;
      const hasCoords = p.latitude && p.longitude && !isNaN(p.latitude) && !isNaN(p.longitude);
      return matchType && matchStatus && hasCoords;
    });

    // 1. Custom Interactive Markers
    visibleProjects.forEach(project => {
      const isSelected = project.id === selectedProjectId;
      const color = isSelected ? '#ff6b00' : getProjectTypeColor(project.type);

      const el = document.createElement('div');
      el.className = 'custom-map-marker';
      el.style.width = isSelected ? '34px' : '26px';
      el.style.height = isSelected ? '34px' : '26px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = isSelected ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.95)';
      el.style.boxShadow = isSelected ? '0 0 20px rgba(255, 107, 0, 0.8), 0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.3)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = '#ffffff';
      el.style.fontWeight = 'bold';
      el.style.fontSize = isSelected ? '12px' : '10.5px';
      el.style.cursor = 'pointer';
      el.innerText = project.type.charAt(0);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectProject(project.id);
      });

      const popupHtml = `
        <div style="padding: 12px; font-family: -apple-system, sans-serif; min-width: 220px; color: #1d1d1f; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border-radius: 12px; box-shadow: 0 8px 24px rgba(255, 149, 0, 0.2); border: 1px solid rgba(255, 149, 0, 0.3);">
          <div style="font-size: 10px; font-weight: 700; color: #ff6b00; text-transform: uppercase; letter-spacing: 0.04em;">
            ${project.type} · ${project.tenderNumber}
          </div>
          <div style="font-size: 13.5px; font-weight: 700; color: #1d1d1f; margin-top: 3px;">
            ${project.name}
          </div>
          <div style="font-size: 11px; color: #515154; margin-top: 2px;">
            ${project.locationName}
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11.5px; border-top: 1px solid rgba(255, 149, 0, 0.2); padding-top: 6px;">
            <span style="color: #86868b;">Budget:</span>
            <strong style="color: #ff6b00; font-family: monospace;">${formatINR(project.budget)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 3px; font-size: 11.5px;">
            <span style="color: #86868b;">Depth:</span>
            <strong style="color: #ff6b00; font-family: monospace;">${formatDepth(project.depthMeters)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 3px; font-size: 11.5px;">
            <span style="color: #86868b;">Status:</span>
            <strong style="color: #1d1d1f;">${project.status}</strong>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 18, closeButton: false })
        .setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([project.longitude, project.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // 2. Render GeoJSON LineString Corridors for route geometry
    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: visibleProjects
        .filter(p => p.routeGeometry && p.routeGeometry.type === 'LineString')
        .map(p => ({
          type: 'Feature',
          properties: {
            id: p.id,
            type: p.type,
            color: p.id === selectedProjectId ? '#ff6b00' : getProjectTypeColor(p.type),
            name: p.name,
            isSelected: p.id === selectedProjectId
          },
          geometry: {
            type: 'LineString',
            coordinates: p.routeGeometry!.coordinates as number[][]
          }
        }))
    };

    if (map.getSource('project-corridors')) {
      (map.getSource('project-corridors') as maplibregl.GeoJSONSource).setData(geojsonData);
    } else {
      map.addSource('project-corridors', {
        type: 'geojson',
        data: geojsonData
      });

      map.addLayer({
        id: 'corridor-glow',
        type: 'line',
        source: 'project-corridors',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'isSelected'], 12, 7],
          'line-opacity': 0.45,
          'line-blur': 3
        }
      });

      map.addLayer({
        id: 'corridor-solid',
        type: 'line',
        source: 'project-corridors',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'isSelected'], 5, 3],
          'line-opacity': 0.95
        }
      });
    }

    // Auto Center on Selected Project
    if (selectedProjectId) {
      const selected = projects.find(p => p.id === selectedProjectId);
      if (selected && selected.latitude && selected.longitude) {
        map.easeTo({
          center: [selected.longitude, selected.latitude],
          zoom: 14.5,
          duration: 800
        });
      }
    }
  }, [projects, selectedProjectId, activeFilterType, activeFilterStatus, mapLoaded]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const hasCoordinates = selectedProject && selectedProject.latitude && selectedProject.longitude;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '440px', overflow: 'hidden', fontFamily: F }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Filter Bar (Top Left) with Frosted Orange Glass */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 247, 237, 0.85) 100%)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        border: '1px solid rgba(255, 149, 0, 0.35)',
        borderRadius: '14px',
        padding: '7px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 10,
        boxShadow: '0 8px 24px -4px rgba(255, 149, 0, 0.15)'
      }}>
        <Filter size={13} color="#ff6b00" />
        <select
          value={activeFilterType}
          onChange={e => setActiveFilterType(e.target.value as any)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ff6b00',
            fontSize: '12px',
            fontWeight: 700,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="All">All Types</option>
          {['Water', 'Drainage', 'Road', 'Telecom', 'Electrical', 'Sewerage', 'Building', 'Bridge'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <span style={{ color: 'rgba(255, 149, 0, 0.3)' }}>|</span>

        <select
          value={activeFilterStatus}
          onChange={e => setActiveFilterStatus(e.target.value as any)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ff6b00',
            fontSize: '12px',
            fontWeight: 700,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="All">All Statuses</option>
          {['Ready', 'Active', 'Approved', 'Pending', 'In Review', 'Uploaded', 'Draft'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Selected Project Card with Liquid Orange Glass */}
      {selectedProject && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          right: '16px',
          maxWidth: '480px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 247, 237, 0.88) 100%)',
          backdropFilter: 'blur(30px) saturate(220%)',
          WebkitBackdropFilter: 'blur(30px) saturate(220%)',
          border: '1.5px solid rgba(255, 149, 0, 0.4)',
          borderRadius: '18px',
          padding: '16px 20px',
          zIndex: 10,
          boxShadow: '0 16px 40px -4px rgba(255, 107, 0, 0.22), 0 4px 16px rgba(0,0,0,0.08)',
          animation: 'fadeInUp 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '10.5px',
                  fontFamily: 'SF Mono, ui-monospace, monospace',
                  color: '#ff6b00',
                  background: 'rgba(255, 149, 0, 0.15)',
                  border: '1px solid rgba(255, 149, 0, 0.3)',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  fontWeight: 700
                }}>
                  {selectedProject.tenderNumber}
                </span>
                <StatusBadge status={selectedProject.status} size="sm" />
                <VisibilityBadge visibility={selectedProject.visibility} size="sm" />
                {selectedProject.gpr && (
                  <span style={{ fontSize: '10.5px', background: 'rgba(255, 149, 0, 0.12)', color: '#ff6b00', border: '1px solid rgba(255, 149, 0, 0.25)', padding: '2px 6px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                    <Radar size={11} /> GPR
                  </span>
                )}
              </div>

              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3 }}>
                {selectedProject.name}
              </div>

              {hasCoordinates ? (
                <div style={{ fontSize: '12px', color: '#515154', marginTop: '3px' }}>
                  {selectedProject.locationName} · Depth: <strong style={{ color: '#ff6b00' }}>{formatDepth(selectedProject.depthMeters)}</strong>
                </div>
              ) : (
                <div style={{ fontSize: '11.5px', color: '#c2411b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPinOff size={13} /> Location not configured
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onOpenIn3D(selectedProject)}
                style={{
                  fontSize: '11.5px',
                  padding: '6px 12px',
                  background: 'linear-gradient(180deg, #ff7a00 0%, #ff5500 100%)',
                  boxShadow: '0 4px 14px rgba(255, 107, 0, 0.35)',
                  border: '1px solid rgba(255, 149, 0, 0.5)'
                }}
              >
                <Box size={13} />
                <span>3D View</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenDetails(selectedProject)}
                style={{ fontSize: '11.5px', padding: '6px 12px' }}
              >
                <Eye size={13} />
                <span>Details</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
