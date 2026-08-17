import * as THREE from 'three';
import { Project } from '../../types/project';
import { getProjectTypeColor } from '../common/TypeIcon';

export type BasemapStyle = 'street' | 'satellite' | 'cad';

export interface MapSurfaceOptions {
  style: BasemapStyle;
  groundSize?: number; // default 140 (in Three.js world units)
  resolution?: number; // default 2048
  showTrenchCutout?: boolean;
  trenchWidthWorld?: number; // default 4.0
  opacity?: number;
}

export interface MapSurfaceResult {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  lngLatToWorld: (lng: number, lat: number) => { x: number; z: number };
  worldToLngLat: (x: number, z: number) => { lng: number; lat: number };
}

export class MapSurfaceGenerator {
  /**
   * Generates a rich, high-resolution 2D map texture for the Three.js ground surface
   * All basemap styles use warm, light Apple-quality color palettes — NO black/dark backgrounds.
   */
  public static generateTexture(
    project: Project,
    options: MapSurfaceOptions
  ): MapSurfaceResult {
    const size = options.resolution ?? 2048;
    const groundSize = options.groundSize ?? 140;
    const style = options.style ?? 'street';
    const showTrench = options.showTrenchCutout ?? false;
    const trenchWidthPx = Math.max(12, ((options.trenchWidthWorld ?? 4.0) / groundSize) * size);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      const dummyTex = new THREE.CanvasTexture(canvas);
      return {
        texture: dummyTex,
        canvas,
        lngLatToWorld: () => ({ x: 0, z: 0 }),
        worldToLngLat: () => ({ lng: project.longitude, lat: project.latitude })
      };
    }

    // Geographic bounding box: center on project (lat, lng) with span corresponding to groundSize
    const spanDeg = 0.026;
    const minLng = project.longitude - spanDeg / 2;
    const maxLng = project.longitude + spanDeg / 2;
    const minLat = project.latitude - spanDeg / 2;
    const maxLat = project.latitude + spanDeg / 2;

    const lngLatToPixel = (lng: number, lat: number) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * size;
      const y = (1 - (lat - minLat) / (maxLat - minLat)) * size;
      return { x, y };
    };

    const lngLatToWorld = (lng: number, lat: number) => {
      const u = (lng - minLng) / (maxLng - minLng);
      const v = (lat - minLat) / (maxLat - minLat);
      const x = (u - 0.5) * groundSize;
      const z = -(v - 0.5) * groundSize; // In Three.js -Z is North
      return { x, z };
    };

    const worldToLngLat = (x: number, z: number) => {
      const u = x / groundSize + 0.5;
      const v = -z / groundSize + 0.5;
      const lng = minLng + u * (maxLng - minLng);
      const lat = minLat + v * (maxLat - minLat);
      return { lng, lat };
    };

    // ─────────────────────────────────────────────────────────────
    // 1. BASE BACKGROUND & TERRAIN TEXTURE (ALL WARM/LIGHT)
    // ─────────────────────────────────────────────────────────────
    if (style === 'satellite') {
      // Warm muted aerial photography — tan/sage/beige earth tones
      const bgGrad = ctx.createLinearGradient(0, 0, size, size);
      bgGrad.addColorStop(0, '#c8c4b8');
      bgGrad.addColorStop(0.3, '#b8bfa8');
      bgGrad.addColorStop(0.6, '#c0b8a0');
      bgGrad.addColorStop(1, '#bcc0b0');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);

      // Building cluster patterns (warm gray rooftops)
      ctx.fillStyle = 'rgba(160, 155, 145, 0.5)';
      for (let i = 0; i < 400; i++) {
        const rx = (Math.sin(i * 99) * 0.5 + 0.5) * size;
        const ry = (Math.cos(i * 33) * 0.5 + 0.5) * size;
        const rw = 20 + (i % 40);
        const rh = 15 + (i % 30);
        ctx.fillRect(rx, ry, rw, rh);
      }

      // Vegetation patches (soft greens)
      ctx.fillStyle = 'rgba(140, 165, 120, 0.3)';
      for (let i = 0; i < 60; i++) {
        const cx = (Math.sin(i * 47 + 7) * 0.5 + 0.5) * size;
        const cy = (Math.cos(i * 23 + 13) * 0.5 + 0.5) * size;
        ctx.beginPath();
        ctx.arc(cx, cy, 15 + (i % 25), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (style === 'cad') {
      // Clean White Technical Blueprint — light blue grid on white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Minor technical grid (very light blue)
      ctx.strokeStyle = 'rgba(0, 113, 227, 0.08)';
      ctx.lineWidth = 0.8;
      const step = size / 32;
      for (let p = 0; p <= size; p += step) {
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
      }

      // Major grid lines (slightly more visible)
      ctx.strokeStyle = 'rgba(0, 113, 227, 0.18)';
      ctx.lineWidth = 1.2;
      const majorStep = size / 8;
      for (let p = 0; p <= size; p += majorStep) {
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
      }

      // Grid coordinate labels at major intersections
      ctx.font = `600 ${Math.round(size * 0.007)}px -apple-system, sans-serif`;
      ctx.fillStyle = 'rgba(0, 113, 227, 0.35)';
      ctx.textAlign = 'left';
      for (let px = majorStep; px < size; px += majorStep) {
        for (let py = majorStep; py < size; py += majorStep) {
          ctx.fillText(`${Math.round(px)}`, px + 3, py - 3);
        }
      }
    } else {
      // Apple-Quality Clean Street Map — warm off-white (#f5f5f7) with cream blocks
      ctx.fillStyle = '#f5f5f7';
      ctx.fillRect(0, 0, size, size);

      // Urban land parcels (warm cream blocks)
      const blockSize = size / 12;
      for (let bx = 0; bx < size; bx += blockSize) {
        for (let by = 0; by < size; by += blockSize) {
          if ((bx + by) % 3 === 0) continue;

          // Alternate between cream and warm light gray
          const shade = ((bx / blockSize + by / blockSize) % 2 === 0) ? '#eaeaef' : '#ededf0';
          ctx.fillStyle = shade;
          ctx.beginPath();
          ctx.roundRect(bx + 6, by + 6, blockSize - 12, blockSize - 12, 4);
          ctx.fill();

          // Subtle building footprints inside blocks
          ctx.fillStyle = '#e0e0e5';
          const innerMargin = blockSize * 0.15;
          const footprintCount = 2 + (Math.floor(bx + by) % 3);
          for (let f = 0; f < footprintCount; f++) {
            const fx = bx + innerMargin + (f * (blockSize - 2 * innerMargin) / footprintCount);
            const fy = by + innerMargin + ((f * 17) % (blockSize - 2 * innerMargin - 20));
            const fw = (blockSize - 2 * innerMargin) / footprintCount - 4;
            const fh = 12 + (f * 7) % 20;
            ctx.fillRect(fx, fy, fw, fh);
          }
        }
      }

      // Park / Green Zones (soft sage green patches)
      ctx.fillStyle = 'rgba(180, 210, 170, 0.45)';
      const parkPositions = [
        [0.15, 0.25, 0.08], [0.72, 0.18, 0.06], [0.35, 0.75, 0.07],
        [0.85, 0.65, 0.05], [0.55, 0.45, 0.04]
      ];
      parkPositions.forEach(([px, py, pr]) => {
        ctx.beginPath();
        ctx.arc(px * size, py * size, pr * size, 0, Math.PI * 2);
        ctx.fill();
        // Park tree dots
        ctx.fillStyle = 'rgba(120, 170, 100, 0.35)';
        for (let t = 0; t < 8; t++) {
          const angle = (t / 8) * Math.PI * 2;
          const tr = (pr * size) * 0.6;
          ctx.beginPath();
          ctx.arc(px * size + Math.cos(angle) * tr, py * size + Math.sin(angle) * tr, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(180, 210, 170, 0.45)';
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. WATER BODIES (Nag River / Lakes) — Warm Blue Tones
    // ─────────────────────────────────────────────────────────────
    const riverColor = style === 'satellite' ? '#7ba8c4' : style === 'cad' ? 'rgba(0, 113, 227, 0.25)' : '#a8d4e6';
    ctx.strokeStyle = riverColor;
    ctx.lineWidth = size * 0.024;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    // Curving river flow across southern/central sector
    ctx.moveTo(0, size * 0.78);
    ctx.bezierCurveTo(size * 0.35, size * 0.72, size * 0.65, size * 0.62, size, size * 0.52);
    ctx.stroke();

    // River bank shadows (subtle)
    ctx.strokeStyle = style === 'cad' ? 'rgba(0, 113, 227, 0.12)' : 'rgba(130, 180, 210, 0.3)';
    ctx.lineWidth = size * 0.035;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.78);
    ctx.bezierCurveTo(size * 0.35, size * 0.72, size * 0.65, size * 0.62, size, size * 0.52);
    ctx.stroke();

    // River label
    ctx.font = `bold ${Math.round(size * 0.011)}px -apple-system, sans-serif`;
    ctx.fillStyle = style === 'cad' ? 'rgba(0, 113, 227, 0.5)' : '#6ba3c0';
    ctx.textAlign = 'center';
    ctx.fillText('〜 NAG RIVER BASIN 〜', size * 0.5, size * 0.66);

    // ─────────────────────────────────────────────────────────────
    // 3. SECONDARY STREET NETWORK & JUNCTIONS
    // ─────────────────────────────────────────────────────────────
    const streetColor = style === 'satellite' ? '#9e9a90' : style === 'cad' ? 'rgba(0, 113, 227, 0.12)' : '#d1d1d6';
    ctx.strokeStyle = streetColor;
    ctx.lineWidth = style === 'cad' ? size * 0.003 : size * 0.012;

    // Cross grid streets
    const gridCols = 8;
    for (let i = 1; i < gridCols; i++) {
      const pos = (i / gridCols) * size;
      ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(size, pos); ctx.stroke();
    }

    // Roundabouts at some intersections
    if (style !== 'cad') {
      ctx.fillStyle = style === 'satellite' ? '#a0a090' : '#e0e0e5';
      ctx.strokeStyle = streetColor;
      ctx.lineWidth = size * 0.004;
      const roundabouts = [[0.25, 0.25], [0.5, 0.5], [0.75, 0.375], [0.375, 0.625]];
      roundabouts.forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx * size, ry * size, size * 0.012, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. MAIN ARTERIAL CORRIDORS (West High Court Rd / Wardha Rd)
    // ─────────────────────────────────────────────────────────────
    const mainRoadColor = style === 'satellite' ? '#8a8578' : style === 'cad' ? 'rgba(0, 113, 227, 0.22)' : '#c7c7cc';
    ctx.strokeStyle = mainRoadColor;
    ctx.lineWidth = style === 'cad' ? size * 0.008 : size * 0.032;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const routeCoords = project.routeGeometry?.type === 'LineString'
      ? (project.routeGeometry.coordinates as number[][])
      : [
          [project.longitude - 0.009, project.latitude - 0.008],
          [project.longitude - 0.004, project.latitude - 0.003],
          [project.longitude,         project.latitude],
          [project.longitude + 0.005, project.latitude + 0.004],
          [project.longitude + 0.009, project.latitude + 0.008],
        ];

    const pixelRoute = routeCoords.map(([lng, lat]) => lngLatToPixel(lng, lat));

    if (pixelRoute.length > 0) {
      ctx.moveTo(pixelRoute[0].x, pixelRoute[0].y);
      for (let i = 1; i < pixelRoute.length; i++) {
        ctx.lineTo(pixelRoute[i].x, pixelRoute[i].y);
      }
    }
    ctx.stroke();

    // Road Pavement Centerlines (Dashed Yellow)
    ctx.strokeStyle = style === 'cad' ? 'rgba(0, 113, 227, 0.4)' : '#e8a830';
    ctx.lineWidth = size * 0.003;
    ctx.setLineDash([size * 0.015, size * 0.012]);
    ctx.beginPath();
    if (pixelRoute.length > 0) {
      ctx.moveTo(pixelRoute[0].x, pixelRoute[0].y);
      for (let i = 1; i < pixelRoute.length; i++) {
        ctx.lineTo(pixelRoute[i].x, pixelRoute[i].y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // ─────────────────────────────────────────────────────────────
    // 5. TENDER BOUNDARY POLYGON (Area Overlay)
    // ─────────────────────────────────────────────────────────────
    const typeColor = getProjectTypeColor(project.type);
    const polyCoords: number[][] = project.areaPolygon?.type === 'Polygon'
      ? (project.areaPolygon.coordinates as number[][][])[0]
      : [
          [project.longitude - 0.006, project.latitude - 0.005],
          [project.longitude + 0.006, project.latitude - 0.005],
          [project.longitude + 0.006, project.latitude + 0.005],
          [project.longitude - 0.006, project.latitude + 0.005],
          [project.longitude - 0.006, project.latitude - 0.005],
        ];

    const pixelPoly = polyCoords.map(([lng, lat]) => lngLatToPixel(lng, lat));

    if (pixelPoly.length > 2) {
      // Area Fill (light tint)
      ctx.fillStyle = `${typeColor}20`;
      ctx.beginPath();
      ctx.moveTo(pixelPoly[0].x, pixelPoly[0].y);
      for (let i = 1; i < pixelPoly.length; i++) {
        ctx.lineTo(pixelPoly[i].x, pixelPoly[i].y);
      }
      ctx.closePath();
      ctx.fill();

      // Border with technical dashes
      ctx.strokeStyle = typeColor;
      ctx.lineWidth = size * 0.004;
      ctx.setLineDash([size * 0.01, size * 0.006]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. REAL 3-5 KM TENDER ROUTE OVERLAY (Glowing Surface Alignment)
    // ─────────────────────────────────────────────────────────────
    // Outer Glow Corridor (softer on light background)
    ctx.strokeStyle = typeColor;
    ctx.lineWidth = size * 0.018;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    if (pixelRoute.length > 0) {
      ctx.moveTo(pixelRoute[0].x, pixelRoute[0].y);
      for (let i = 1; i < pixelRoute.length; i++) {
        ctx.lineTo(pixelRoute[i].x, pixelRoute[i].y);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Solid Route Line (vivid on light background)
    ctx.strokeStyle = typeColor;
    ctx.lineWidth = size * 0.007;
    ctx.beginPath();
    if (pixelRoute.length > 0) {
      ctx.moveTo(pixelRoute[0].x, pixelRoute[0].y);
      for (let i = 1; i < pixelRoute.length; i++) {
        ctx.lineTo(pixelRoute[i].x, pixelRoute[i].y);
      }
    }
    ctx.stroke();

    // ─────────────────────────────────────────────────────────────
    // 7. KILOMETER STATION BADGES ON SURFACE (White pills with dark text)
    // ─────────────────────────────────────────────────────────────
    const stations = project.stations || [
      { km: 0.0, name: 'KM 0.0 · Start Portal', lat: routeCoords[0][1], lng: routeCoords[0][0] },
      { km: Math.round(((project.lengthMeters ?? 3500) / 1000) * 10) / 10, name: `KM ${(project.lengthMeters ?? 3500)/1000} · Terminal End`, lat: routeCoords[routeCoords.length - 1][1], lng: routeCoords[routeCoords.length - 1][0] }
    ];

    stations.forEach((st) => {
      const p = lngLatToPixel(st.lng, st.lat);

      // Station Marker Circle
      ctx.fillStyle = typeColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.01, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = size * 0.003;
      ctx.stroke();

      // Station Badge Pill — White with warm border (Apple style)
      const badgeText = `KM ${st.km.toFixed(1)}`;
      ctx.font = `bold ${Math.round(size * 0.010)}px -apple-system, BlinkMacSystemFont, sans-serif`;
      const txtMetrics = ctx.measureText(badgeText);
      const pillW = txtMetrics.width + size * 0.016;
      const pillH = size * 0.018;

      // White pill background with shadow effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = typeColor;
      ctx.lineWidth = size * 0.002;
      ctx.beginPath();
      ctx.roundRect(p.x - pillW / 2, p.y - size * 0.028, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.stroke();

      // Dark text on white background
      ctx.fillStyle = '#1d1d1f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, p.x, p.y - size * 0.019);

      // Station Name Sub-label (dark on light)
      if (st.name) {
        ctx.font = `600 ${Math.round(size * 0.008)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = '#515154';
        ctx.fillText(st.name.replace(/KM \d+(\.\d+)? · /, ''), p.x, p.y + size * 0.02);
      }
    });

    // ─────────────────────────────────────────────────────────────
    // 8. TRENCH CUTOUT MASK (if showTrenchCutout is active)
    // ─────────────────────────────────────────────────────────────
    if (showTrench && pixelRoute.length > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = trenchWidthPx;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pixelRoute[0].x, pixelRoute[0].y);
      for (let i = 1; i < pixelRoute.length; i++) {
        ctx.lineTo(pixelRoute[i].x, pixelRoute[i].y);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    // ─────────────────────────────────────────────────────────────
    // 9. MAP LABELS & COMPASS (Dark text on light backgrounds)
    // ─────────────────────────────────────────────────────────────
    // Project location name header watermark
    ctx.font = `bold ${Math.round(size * 0.015)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = style === 'cad' ? 'rgba(0, 113, 227, 0.4)' : 'rgba(29, 29, 31, 0.35)';
    ctx.textAlign = 'left';
    ctx.fillText(`${project.tenderNumber} · ${project.locationName.toUpperCase()}`, size * 0.04, size * 0.05);

    // Chainage Distance Badge
    ctx.font = `bold ${Math.round(size * 0.012)}px monospace`;
    ctx.fillStyle = typeColor;
    ctx.fillText(`TOTAL CORRIDOR: ${((project.lengthMeters ?? 3500) / 1000).toFixed(2)} KM · DEPTH: –${project.depthMeters ?? 5.0}m`, size * 0.04, size * 0.075);

    // Named Intersection Labels (only for street/satellite)
    if (style !== 'cad') {
      ctx.font = `600 ${Math.round(size * 0.008)}px -apple-system, sans-serif`;
      ctx.fillStyle = 'rgba(29, 29, 31, 0.3)';
      ctx.textAlign = 'center';
      const labels = [
        [0.3, 0.3, 'Dharampeth'], [0.6, 0.2, 'Ramdaspeth'],
        [0.2, 0.6, 'Shankar Nagar'], [0.7, 0.45, 'Sitabuldi'],
        [0.5, 0.85, 'Cotton Market'], [0.85, 0.3, 'Ravi Nagar']
      ];
      labels.forEach(([lx, ly, name]) => {
        ctx.fillText(name as string, (lx as number) * size, (ly as number) * size);
      });
    }

    // North Arrow Indicator in top right (warm gray)
    const arrowX = size * 0.94;
    const arrowY = size * 0.06;
    ctx.fillStyle = style === 'cad' ? 'rgba(0, 113, 227, 0.5)' : 'rgba(29, 29, 31, 0.5)';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY - size * 0.025);
    ctx.lineTo(arrowX - size * 0.01, arrowY + size * 0.01);
    ctx.lineTo(arrowX + size * 0.01, arrowY + size * 0.01);
    ctx.closePath();
    ctx.fill();

    ctx.font = `bold ${Math.round(size * 0.011)}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('N', arrowX, arrowY + size * 0.025);

    // Scale bar in bottom-left
    const scaleBarX = size * 0.04;
    const scaleBarY = size * 0.95;
    const scaleBarW = size * 0.12;
    ctx.strokeStyle = style === 'cad' ? 'rgba(0, 113, 227, 0.5)' : 'rgba(29, 29, 31, 0.4)';
    ctx.lineWidth = size * 0.002;
    ctx.beginPath();
    ctx.moveTo(scaleBarX, scaleBarY);
    ctx.lineTo(scaleBarX + scaleBarW, scaleBarY);
    // End ticks
    ctx.moveTo(scaleBarX, scaleBarY - size * 0.006);
    ctx.lineTo(scaleBarX, scaleBarY + size * 0.006);
    ctx.moveTo(scaleBarX + scaleBarW, scaleBarY - size * 0.006);
    ctx.lineTo(scaleBarX + scaleBarW, scaleBarY + size * 0.006);
    ctx.stroke();

    ctx.font = `600 ${Math.round(size * 0.008)}px -apple-system, sans-serif`;
    ctx.fillStyle = style === 'cad' ? 'rgba(0, 113, 227, 0.5)' : 'rgba(29, 29, 31, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('500m', scaleBarX + scaleBarW / 2, scaleBarY - size * 0.012);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    return {
      texture,
      canvas,
      lngLatToWorld,
      worldToLngLat
    };
  }
}
