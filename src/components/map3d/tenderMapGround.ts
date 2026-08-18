import * as THREE from 'three';
import { Project } from '../../types/project';

// ─────────────────────────────────────────────────────────────────────────────
// SCALE AUTHORITY
// The 3D plane is always MAP_PLANE_SIZE units wide.
// Every spatial conversion must use the bounds that were computed for the
// CURRENT project — do not mix bounds from different zoom levels.
// ─────────────────────────────────────────────────────────────────────────────
export const MAP_PLANE_SIZE = 78; // Three.js scene units

export interface MapTileBounds {
  west: number;
  east: number;
  north: number;
  south: number;
  planeSize: number;
  /** Exact meters spanned by the full MAP_PLANE_SIZE at mid-latitude */
  totalMetersEW: number;
  totalMetersNS: number;
  /** How many scene-units equal 1 real metre (the same in both axes at mid-lat) */
  unitsPerMeter: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile math helpers
// ─────────────────────────────────────────────────────────────────────────────
function lng2tile(lng: number, z: number) {
  return ((lng + 180) / 360) * 2 ** z;
}
function lat2tile(lat: number, z: number) {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z;
}
function tile2lng(x: number, z: number) {
  return (x / 2 ** z) * 360 - 180;
}
function tile2lat(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Compute the tile zoom level so that the project's actual geographic footprint
// fits comfortably within the MAP_PLANE_SIZE tile grid.
// ─────────────────────────────────────────────────────────────────────────────
export function computeProjectTileZoom(project: Project, grid = 4): number {
  // Get the project's real bounding box in degrees
  let dLng: number;
  let dLat: number;

  if (project.areaPolygon?.type === 'Polygon') {
    const coords = (project.areaPolygon.coordinates as number[][][])[0];
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    dLng = Math.max(...lngs) - Math.min(...lngs);
    dLat = Math.max(...lats) - Math.min(...lats);
  } else {
    // Fall back to meter-based extents converted to degrees
    const lenM = project.lengthMeters ?? 500;
    const wM = project.widthMeters ?? 20;
    const midLat = project.latitude;
    const metersPerDegLat = 111139;
    const metersPerDegLng = 111139 * Math.cos((midLat * Math.PI) / 180);
    dLng = (Math.max(lenM, wM) / metersPerDegLng) * 1.8;
    dLat = (Math.max(lenM, wM) / metersPerDegLat) * 1.8;
  }

  // We want the tile grid (grid × grid tiles at zoom z) to cover dLng / dLat with ~30% margin
  // One tile at zoom z covers 360/2^z degrees longitude
  // We want: grid tiles to span at least (dLng or dLat) * 1.6
  const targetSpanLng = Math.max(dLng, 0.001) * 1.6;
  const targetSpanLat = Math.max(dLat, 0.001) * 1.6;

  // tile degree span at zoom z:  360 / 2^z  (lng)
  // We need:  grid * (360 / 2^z) >= targetSpan
  // => 2^z <= grid * 360 / targetSpan
  // => z <= log2(grid * 360 / targetSpan)
  const zByLng = Math.log2((grid * 360) / targetSpanLng);

  // For lat the tile size is roughly equal to lng at mid latitudes for our purposes
  const zByLat = Math.log2((grid * 180) / targetSpanLat);

  const zIdeal = Math.min(zByLng, zByLat);
  // Clamp: zoom 8 (country) … 18 (street)
  return Math.max(8, Math.min(18, Math.floor(zIdeal)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Build MapTileBounds from a tile grid, fully enriched with scale info
// ─────────────────────────────────────────────────────────────────────────────
function buildBoundsFromGrid(startX: number, startY: number, grid: number, zoom: number): MapTileBounds {
  const west  = tile2lng(startX,        zoom);
  const east  = tile2lng(startX + grid, zoom);
  const north = tile2lat(startY,        zoom);
  const south = tile2lat(startY + grid, zoom);

  const midLat = (north + south) / 2;
  const metersPerDegLat = 111139;
  const metersPerDegLng = 111139 * Math.cos((midLat * Math.PI) / 180);

  const totalMetersEW = Math.max(1, (east  - west)  * metersPerDegLng);
  const totalMetersNS = Math.max(1, (north - south) * metersPerDegLat);

  // scene units per metre — use NS span (generally more square)
  const unitsPerMeter = MAP_PLANE_SIZE / totalMetersNS;

  return { west, east, north, south, planeSize: MAP_PLANE_SIZE, totalMetersEW, totalMetersNS, unitsPerMeter };
}

// ─────────────────────────────────────────────────────────────────────────────
// Derive a *fast* (no tile fetch) bounds object for a given project + zoom
// Used by generators when the async map texture hasn't loaded yet.
// ─────────────────────────────────────────────────────────────────────────────
export function deriveProjectBounds(project: Project, zoom?: number, grid = 4): MapTileBounds {
  const z = zoom ?? computeProjectTileZoom(project, grid);
  const startX = Math.floor(lng2tile(project.longitude, z)) - Math.floor(grid / 2);
  const startY = Math.floor(lat2tile(project.latitude,  z)) - Math.floor(grid / 2);
  return buildBoundsFromGrid(startX, startY, grid, z);
}

// ─────────────────────────────────────────────────────────────────────────────
// Return the project's raw polygon ring (or a fallback rectangle scaled to the
// project's actual physical dimensions)
// ─────────────────────────────────────────────────────────────────────────────
export function getProjectPolygon(project: Project, bounds?: MapTileBounds): number[][] {
  if (project.areaPolygon?.type === 'Polygon') {
    return (project.areaPolygon.coordinates as number[][][])[0];
  }

  // No polygon — build one from physical dimensions (length × width)
  const lenM  = project.lengthMeters ?? 500;
  const widM  = project.widthMeters  ?? 20;
  const midLat = project.latitude;
  const midLng = project.longitude;
  const metersPerDegLat = 111139;
  const metersPerDegLng = 111139 * Math.cos((midLat * Math.PI) / 180);

  const halfLatDeg = (lenM / 2) / metersPerDegLat;
  const halfLngDeg = (widM / 2) / metersPerDegLng;

  return [
    [midLng - halfLngDeg, midLat - halfLatDeg],
    [midLng + halfLngDeg, midLat - halfLatDeg],
    [midLng + halfLngDeg, midLat + halfLatDeg],
    [midLng - halfLngDeg, midLat + halfLatDeg],
    [midLng - halfLngDeg, midLat - halfLatDeg],
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Project [lng, lat] → Three.js [x, z] using the tile bounds
// ─────────────────────────────────────────────────────────────────────────────
export function lngLatToScene(lng: number, lat: number, bounds: MapTileBounds): { x: number; z: number } {
  const { west, east, north, south, planeSize } = bounds;
  const x = ((lng - west)  / Math.max(0.000001, east  - west))  * planeSize - planeSize / 2;
  const z = ((north - lat) / Math.max(0.000001, north - south)) * planeSize - planeSize / 2;
  return { x, z };
}

// ─────────────────────────────────────────────────────────────────────────────
// Polygon metrics in scene space — including true physical span in metres
// ─────────────────────────────────────────────────────────────────────────────
export interface TenderPolygonMetrics {
  pts: { x: number; z: number }[];
  minX: number; maxX: number;
  minZ: number; maxZ: number;
  centerX: number; centerZ: number;
  spanX: number; spanZ: number;
  /** Physical span of the polygon in metres (east-west) */
  spanXMeters: number;
  /** Physical span of the polygon in metres (north-south) */
  spanZMeters: number;
  area: number;
  areaSqMeters: number;
  /** Scene units per real metre */
  unitsPerMeter: number;
}

export function computePolygonAreaSqMeters(pts: { x: number; z: number }[], unitsPerMeter: number): number {
  if (pts.length < 3) return 0;
  let area = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    area += (pts[j].x + pts[i].x) * (pts[j].z - pts[i].z);
  }
  const sceneArea = Math.abs(area / 2);
  return Math.round(sceneArea / Math.max(0.00001, unitsPerMeter * unitsPerMeter));
}

export function getProjectPolygonMetrics(project: Project, bounds: MapTileBounds): TenderPolygonMetrics {
  const ring = getProjectPolygon(project, bounds);
  const pts  = ring.map(([lng, lat]) => lngLatToScene(lng, lat, bounds));
  const xs   = pts.map(p => p.x);
  const zs   = pts.map(p => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const spanX   = Math.max(0.1, maxX - minX);
  const spanZ   = Math.max(0.1, maxZ - minZ);

  const { unitsPerMeter } = bounds;
  const spanXMeters = Math.round(spanX / unitsPerMeter);
  const spanZMeters = Math.round(spanZ / unitsPerMeter);
  const areaSqMeters = computePolygonAreaSqMeters(pts, unitsPerMeter);

  return {
    pts, minX, maxX, minZ, maxZ,
    centerX, centerZ,
    spanX, spanZ,
    spanXMeters, spanZMeters,
    area: spanX * spanZ,
    areaSqMeters,
    unitsPerMeter,
  };
}

export interface CorridorOrientation {
  centerX: number;
  centerZ: number;
  lengthScene: number;
  widthScene: number;
  angleRad: number;
  startPt: { x: number; z: number };
  endPt: { x: number; z: number };
}

export function getProjectCorridorOrientation(
  metrics: TenderPolygonMetrics,
  calibratedWidthScene?: number
): CorridorOrientation {
  const pts = metrics.pts;
  if (!pts || pts.length < 2) {
    return {
      centerX: metrics.centerX,
      centerZ: metrics.centerZ,
      lengthScene: metrics.spanX,
      widthScene: calibratedWidthScene ?? metrics.spanZ,
      angleRad: 0,
      startPt: { x: metrics.minX, z: metrics.centerZ },
      endPt: { x: metrics.maxX, z: metrics.centerZ },
    };
  }

  // Find the two farthest vertices in the polygon to determine true major corridor axis
  let maxDistSq = 0;
  let pA = pts[0];
  let pB = pts[1];

  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[j].x - pts[i].x;
      const dz = pts[j].z - pts[i].z;
      const dsq = dx * dx + dz * dz;
      if (dsq > maxDistSq) {
        maxDistSq = dsq;
        pA = pts[i];
        pB = pts[j];
      }
    }
  }

  const lengthScene = Math.max(1.0, Math.sqrt(maxDistSq));
  const angleRad = Math.atan2(pB.z - pA.z, pB.x - pA.x);
  const centerX = (pA.x + pB.x) / 2;
  const centerZ = (pA.z + pB.z) / 2;

  // Calculate perpendicular cross-width
  const nx = -Math.sin(angleRad);
  const nz = Math.cos(angleRad);
  let minProj = Infinity;
  let maxProj = -Infinity;

  pts.forEach(p => {
    const proj = (p.x - centerX) * nx + (p.z - centerZ) * nz;
    if (proj < minProj) minProj = proj;
    if (proj > maxProj) maxProj = proj;
  });

  const polyCrossWidth = Math.max(0.2, maxProj - minProj);
  const widthScene = calibratedWidthScene !== undefined ? Math.min(calibratedWidthScene, polyCrossWidth * 1.2) : Math.max(0.6, polyCrossWidth);

  return {
    centerX,
    centerZ,
    lengthScene,
    widthScene,
    angleRad,
    startPt: pA,
    endPt: pB,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATED 3D DIMENSIONS
//
// Strategy: convert the project's *actual* physical metres into scene units
// using the shared `unitsPerMeter` from the bounds.  This means:
//   - A 200 km road gets 200 000 m × upm scene units for length (≈ the whole plane)
//   - A 5 m wide road gets 5 × upm scene units — correctly narrow relative to map
//   - We then clamp to the polygon span so the 3D object never overflows the parcel
//
// For visibility: we apply a minimum readable size in scene units so thin
// features (like 0.3m-wide pipes) are still visible in the 3D view.
// ─────────────────────────────────────────────────────────────────────────────
export interface Calibrated3DDimensions {
  lengthScene: number;   // along X axis
  widthScene: number;    // along Z axis
  heightScene: number;   // above ground (Y+)
  depthScene: number;    // below ground (Y-)
  lengthMeters: number;
  widthMeters: number;
  heightMeters: number;
  depthMeters: number;
  coverageRatio: number;
}

/** Minimum visible sizes in scene units to keep thin infrastructure visible */
const MIN_VISIBLE: Record<string, { length: number; width: number; height: number; depth: number }> = {
  Road:      { length: 6.0, width: 0.8,  height: 0.15, depth: 0.3  },
  Bridge:    { length: 5.0, width: 1.0,  height: 1.5,  depth: 0.8  },
  Building:  { length: 3.0, width: 3.0,  height: 2.0,  depth: 0.5  },
  Water:     { length: 5.0, width: 0.5,  height: 0.1,  depth: 0.5  },
  Sewerage:  { length: 5.0, width: 0.5,  height: 0.1,  depth: 0.5  },
  Drainage:  { length: 5.0, width: 0.6,  height: 0.1,  depth: 0.5  },
  Telecom:   { length: 5.0, width: 0.3,  height: 0.1,  depth: 0.3  },
  Electrical:{ length: 5.0, width: 0.3,  height: 0.1,  depth: 0.3  },
  Cable:     { length: 5.0, width: 0.3,  height: 0.1,  depth: 0.3  },
};
const DEFAULT_MIN = { length: 5.0, width: 0.6, height: 0.2, depth: 0.4 };

export function getCalibratedProjectDimensions(
  project: Project,
  metrics: TenderPolygonMetrics
): Calibrated3DDimensions {
  const { spanX, spanZ, unitsPerMeter } = metrics;
  const type = project.type;
  const mn = MIN_VISIBLE[type] ?? DEFAULT_MIN;

  // ── Physical metres from project data (with sensible type-specific fallbacks)
  let lengthMeters: number;
  let widthMeters: number;
  let heightMeters: number;
  let depthMeters: number;

  switch (type) {
    case 'Road':
      lengthMeters = project.lengthMeters ?? 1000;
      widthMeters  = project.widthMeters  ?? 10;
      heightMeters = 0;
      depthMeters  = project.depthMeters  ?? 0.5;
      break;
    case 'Bridge':
      lengthMeters = project.lengthMeters ?? 500;
      widthMeters  = project.widthMeters  ?? 12;
      heightMeters = project.heightMeters ?? 8;
      depthMeters  = project.depthMeters  ?? 6;
      break;
    case 'Building':
      lengthMeters = project.lengthMeters ?? 40;
      widthMeters  = project.widthMeters  ?? 30;
      heightMeters = project.heightMeters ?? (((project.buildingFloors ?? 4) * 3.5));
      depthMeters  = project.depthMeters  ?? 3;
      break;
    case 'Water':
    case 'Sewerage':
      lengthMeters = project.lengthMeters ?? 800;
      widthMeters  = project.widthMeters  ?? (project.diameterMm ? project.diameterMm / 1000 : 0.6);
      heightMeters = 0;
      depthMeters  = project.depthMeters  ?? 3;
      break;
    case 'Drainage':
      lengthMeters = project.lengthMeters ?? 600;
      widthMeters  = project.widthMeters  ?? 1.2;
      heightMeters = 0;
      depthMeters  = project.depthMeters  ?? 2.5;
      break;
    default: // Telecom, Electrical, Cable, Other
      lengthMeters = project.lengthMeters ?? 500;
      widthMeters  = project.widthMeters  ?? 0.3;
      heightMeters = project.heightMeters ?? 0;
      depthMeters  = project.depthMeters  ?? 1.5;
  }

  // ── Convert to scene units using true scale
  // We clamp against the polygon span so the model never escapes its parcel.
  // We also enforce the minimum visible size for readability.
  const rawLength = lengthMeters * unitsPerMeter;
  const rawWidth  = widthMeters  * unitsPerMeter;

  const lengthScene = Math.max(mn.length, Math.min(spanX * 0.98, rawLength));
  const widthScene  = Math.max(mn.width,  Math.min(spanZ * 0.98, rawWidth));

  // Height and depth use the same scale but are clamped generously
  // (they extend above/below ground so no polygon constraint needed)
  let heightScene: number;
  let depthScene: number;

  if (type === 'Building') {
    // Buildings: scale height to look proportional relative to footprint.
    // Real 3.5 m/floor × N floors, boosted slightly for 3D visibility.
    const rawH = heightMeters * unitsPerMeter;
    heightScene = Math.max(mn.height, Math.min(rawH * 1.6, 24));
    depthScene  = Math.max(mn.depth,  depthMeters * unitsPerMeter * 1.4);
  } else if (type === 'Bridge') {
    const rawH = heightMeters * unitsPerMeter;
    heightScene = Math.max(mn.height, Math.min(rawH * 1.4, 12));
    depthScene  = Math.max(mn.depth,  depthMeters * unitsPerMeter * 1.2);
  } else {
    // Subsurface types — depth is below ground
    heightScene = mn.height;
    // For visibility: at zoom 17 (≈400m view), 5m = ~0.975 scene units which is tiny.
    // Apply a perceptual boost: log-scale boost so deeper features stay visible
    const rawD = depthMeters * unitsPerMeter;
    const boost = Math.max(1.0, 1.5 / Math.max(0.01, rawD));
    depthScene = Math.max(mn.depth, rawD * Math.min(boost, 4.0));
  }

  const footprintArea = widthScene * lengthScene;
  const parcelArea    = spanX * spanZ;
  const coverageRatio = Math.min(1.0, footprintArea / Math.max(0.01, parcelArea));

  return {
    lengthScene, widthScene, heightScene, depthScene,
    lengthMeters, widthMeters, heightMeters, depthMeters,
    coverageRatio,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Image tile loading
// ─────────────────────────────────────────────────────────────────────────────
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function tileUrl(style: 'satellite' | 'map', z: number, x: number, y: number): string {
  if (style === 'satellite') {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  }
  const host = ['a', 'b', 'c', 'd'][(x + y) % 4];
  return `https://${host}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}@2x.png`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main tile texture loader — auto-selects zoom to match project's footprint
// ─────────────────────────────────────────────────────────────────────────────
export async function loadTenderMapTexture(opts: {
  lat: number;
  lng: number;
  style: 'satellite' | 'map';
  zoom?: number;
  grid?: number;
  project?: Project;
}): Promise<{ texture: THREE.CanvasTexture; bounds: MapTileBounds }> {
  const grid = opts.grid ?? 4;
  const TILE = 256;

  // Determine zoom: project-aware auto-zoom if project provided, else use specified or 17
  let zoom: number;
  if (opts.zoom !== undefined) {
    zoom = opts.zoom;
  } else if (opts.project) {
    zoom = computeProjectTileZoom(opts.project, grid);
  } else {
    zoom = 17;
  }

  const startX = Math.floor(lng2tile(opts.lng, zoom)) - Math.floor(grid / 2);
  const startY = Math.floor(lat2tile(opts.lat, zoom)) - Math.floor(grid / 2);

  const canvas = document.createElement('canvas');
  canvas.width  = grid * TILE;
  canvas.height = grid * TILE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#cfd6de';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await Promise.all(
    Array.from({ length: grid * grid }, (_, i) => {
      const col = i % grid;
      const row = Math.floor(i / grid);
      const x   = startX + col;
      const y   = startY + row;
      return loadImage(tileUrl(opts.style, zoom, x, y)).then(async img => {
        let tile = img;
        if (!tile && opts.style === 'satellite') {
          tile = await loadImage(tileUrl('map', zoom, x, y));
        }
        if (tile) ctx.drawImage(tile, col * TILE, row * TILE, TILE, TILE);
      });
    })
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  const bounds = buildBoundsFromGrid(startX, startY, grid, zoom);

  return { texture, bounds };
}

// ─────────────────────────────────────────────────────────────────────────────
// Region volume (boundary outline + excavation fill) rendered on the 3D map
// ─────────────────────────────────────────────────────────────────────────────
function polygonToShape(pts: { x: number; z: number }[]): THREE.Shape {
  const shape = new THREE.Shape();
  pts.forEach((p, i) => {
    if (i === 0) shape.moveTo(p.x, p.z);
    else shape.lineTo(p.x, p.z);
  });
  shape.closePath();
  return shape;
}

function pointInRing(x: number, z: number, ring: { x: number; z: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].x, zi = ring[i].z;
    const xj = ring[j].x, zj = ring[j].z;
    const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function buildTenderRegionVolume(
  project: Project,
  bounds: MapTileBounds,
  depthM: number,
  typeColorHex: string,
  options: { showBoundary: boolean; showExcavation: boolean; showContext: boolean }
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Region_3D_${project.id}`;

  const metrics = getProjectPolygonMetrics(project, bounds);
  const { pts, centerX, centerZ } = metrics;
  const color = new THREE.Color(typeColorHex);

  if (options.showBoundary && pts.length > 1) {
    const loop    = pts.map(p => new THREE.Vector3(p.x, 0.12, p.z));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(loop);
    const line    = new THREE.LineLoop(lineGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
    group.add(line);

    const glow = new THREE.LineLoop(lineGeo.clone(), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28, linewidth: 2 }));
    glow.position.y = 0.04;
    group.add(glow);

    const fill = new THREE.Mesh(
      new THREE.ShapeGeometry(polygonToShape(pts)).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })
    );
    fill.position.y = 0.06;
    fill.userData   = { project, objectType: 'Tender Region' };
    group.add(fill);
  }

  // Convert depthM (real metres) to scene units
  const depthScene = Math.max(0.4, depthM * bounds.unitsPerMeter * Math.min(4.0, 1.5 / Math.max(0.01, depthM * bounds.unitsPerMeter)));

  if (options.showExcavation && depthM > 0.15 && pts.length > 2) {
    const shape   = polygonToShape(pts);
    const extrude = new THREE.ExtrudeGeometry(shape, { depth: depthScene, bevelEnabled: false, steps: 1 });
    extrude.rotateX(Math.PI / 2);

    const volume = new THREE.Mesh(extrude, new THREE.MeshStandardMaterial({
      color: 0xc2410c, roughness: 0.42, metalness: 0.08,
      transparent: true, opacity: 0.30, side: THREE.DoubleSide, depthWrite: false,
    }));
    volume.userData = { project, objectType: 'Excavation Volume', depth: depthM };
    group.add(volume);

    const floor = new THREE.Mesh(
      new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 1, metalness: 0 })
    );
    floor.position.y = -depthScene + 0.03;
    floor.userData   = { project, objectType: 'Trench Floor', depth: depthM };
    group.add(floor);

    const tickCount = Math.max(2, Math.min(8, Math.round(depthM)));
    for (let i = 1; i <= tickCount; i++) {
      const y       = -(depthScene * i) / tickCount;
      const tickPts = pts.map(p => new THREE.Vector3(p.x, y, p.z));
      const tick    = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(tickPts),
        new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.22 })
      );
      group.add(tick);
    }
  }

  if (options.showContext) {
    const seed = project.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
    const rand = (n: number) => {
      const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    const facade = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65, metalness: 0.1 });
    const roof   = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });

    for (let i = 0; i < 18; i++) {
      const x = (rand(i)      - 0.5) * MAP_PLANE_SIZE * 0.84;
      const z = (rand(i + 40) - 0.5) * MAP_PLANE_SIZE * 0.84;
      if (pointInRing(x, z, pts)) continue;
      const w = 1.8 + rand(i + 80)  * 3.2;
      const d = 1.8 + rand(i + 120) * 3.2;
      const h = 2.0 + rand(i + 160) * 7.5;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facade);
      box.position.set(x, h / 2, z);
      box.castShadow = true; box.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.2, d + 0.15), roof);
      cap.position.set(x, h + 0.1, z);
      group.add(box, cap);
    }
  }

  return group;
}
