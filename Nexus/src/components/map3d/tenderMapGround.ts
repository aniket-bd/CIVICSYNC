import * as THREE from 'three';
import { Project } from '../../types/project';

export const MAP_PLANE_SIZE = 78;

export interface MapTileBounds {
  west: number;
  east: number;
  north: number;
  south: number;
  planeSize: number;
}

export function getProjectPolygon(project: Project): number[][] {
  if (project.areaPolygon?.type === 'Polygon') {
    return (project.areaPolygon.coordinates as number[][][])[0];
  }
  const offset = 0.0035;
  return [
    [project.longitude - offset, project.latitude - offset * 0.7],
    [project.longitude + offset, project.latitude - offset * 0.7],
    [project.longitude + offset, project.latitude + offset * 0.7],
    [project.longitude - offset, project.latitude + offset * 0.7],
    [project.longitude - offset, project.latitude - offset * 0.7],
  ];
}

export function lngLatToScene(lng: number, lat: number, bounds: MapTileBounds): { x: number; z: number } {
  const { west, east, north, south, planeSize } = bounds;
  const x = ((lng - west) / Math.max(0.000001, east - west) - 0.5) * planeSize;
  const z = (0.5 - (lat - south) / Math.max(0.000001, north - south)) * planeSize;
  return { x, z };
}

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

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
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

export async function loadTenderMapTexture(opts: {
  lat: number;
  lng: number;
  style: 'satellite' | 'map';
  zoom?: number;
  grid?: number;
}): Promise<{ texture: THREE.CanvasTexture; bounds: MapTileBounds }> {
  const zoom = opts.zoom ?? 17;
  const grid = opts.grid ?? 4;
  const TILE = 256;

  const startX = Math.floor(lng2tile(opts.lng, zoom)) - Math.floor(grid / 2);
  const startY = Math.floor(lat2tile(opts.lat, zoom)) - Math.floor(grid / 2);

  const canvas = document.createElement('canvas');
  canvas.width = grid * TILE;
  canvas.height = grid * TILE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#cfd6de';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await Promise.all(
    Array.from({ length: grid * grid }, (_, i) => {
      const col = i % grid;
      const row = Math.floor(i / grid);
      const x = startX + col;
      const y = startY + row;
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

  return {
    texture,
    bounds: {
      west: tile2lng(startX, zoom),
      east: tile2lng(startX + grid, zoom),
      north: tile2lat(startY, zoom),
      south: tile2lat(startY + grid, zoom),
      planeSize: MAP_PLANE_SIZE,
    },
  };
}

export interface TenderPolygonMetrics {
  pts: { x: number; z: number }[];
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  spanX: number;
  spanZ: number;
  spanXMeters: number;
  spanZMeters: number;
  area: number;
  areaSqMeters: number;
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
  const ring = getProjectPolygon(project);
  const pts = ring.map(([lng, lat]) => lngLatToScene(lng, lat, bounds));
  const xs = pts.map(p => p.x);
  const zs = pts.map(p => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const spanX = Math.max(0.5, maxX - minX);
  const spanZ = Math.max(0.5, maxZ - minZ);

  // Real geographic meter scale
  const latSpanDeg = Math.abs(bounds.north - bounds.south);
  const totalMetersZ = Math.max(1, latSpanDeg * 111139);
  const unitsPerMeter = bounds.planeSize / totalMetersZ;

  const spanXMeters = Math.round(spanX / unitsPerMeter);
  const spanZMeters = Math.round(spanZ / unitsPerMeter);
  const areaSqMeters = computePolygonAreaSqMeters(pts, unitsPerMeter);

  return {
    pts,
    minX,
    maxX,
    minZ,
    maxZ,
    centerX,
    centerZ,
    spanX,
    spanZ,
    spanXMeters,
    spanZMeters,
    area: spanX * spanZ,
    areaSqMeters,
    unitsPerMeter,
  };
}

export interface Calibrated3DDimensions {
  lengthScene: number;
  widthScene: number;
  heightScene: number;
  depthScene: number;
  lengthMeters: number;
  widthMeters: number;
  heightMeters: number;
  depthMeters: number;
  coverageRatio: number;
}

export function getCalibratedProjectDimensions(
  project: Project,
  metrics: TenderPolygonMetrics
): Calibrated3DDimensions {
  const { spanX, spanZ, unitsPerMeter } = metrics;
  const type = project.type;

  let lengthMeters = project.lengthMeters ?? 100;
  let widthMeters = project.widthMeters ?? 12;
  let heightMeters = project.heightMeters ?? 0;
  let depthMeters = project.depthMeters ?? 2.0;

  // Calibrate scene dimensions bounded by the 2D polygon footprint
  let lengthScene: number;
  let widthScene: number;
  let heightScene: number;
  let depthScene: number;

  if (type === 'Building') {
    // Building ground footprint: takes approx 45-60% of parcel footprint with realistic setbacks
    widthScene = Math.max(3.2, Math.min(spanX * 0.58, (project.widthMeters ? project.widthMeters * unitsPerMeter * 1.5 : spanX * 0.55)));
    lengthScene = Math.max(3.0, Math.min(spanZ * 0.58, (project.lengthMeters ? project.lengthMeters * unitsPerMeter * 0.25 : spanZ * 0.55)));
    
    // Story & superstructure height: scaled with a modest ~2.0-2.5x vertical factor for 3D visibility
    const floors = project.buildingFloors ?? Math.max(2, Math.round((project.heightMeters ?? 24) / 4.0));
    heightMeters = project.heightMeters ?? (floors * 3.8);
    heightScene = Math.max(2.8, Math.min(16.0, heightMeters * unitsPerMeter * 2.2));
    depthScene = Math.max(1.0, Math.min(4.5, depthMeters * unitsPerMeter * 2.2));
  } else if (type === 'Bridge') {
    // Bridge spans across the polygon length
    lengthScene = Math.max(8.0, Math.min(spanX * 0.92, (lengthMeters * unitsPerMeter * 0.5)));
    widthScene = Math.max(2.2, Math.min(spanZ * 0.45, (widthMeters * unitsPerMeter * 2.0)));
    heightMeters = project.heightMeters ?? 10.0;
    heightScene = Math.max(3.0, Math.min(6.5, heightMeters * unitsPerMeter * 2.4));
    depthScene = Math.max(1.2, depthMeters * unitsPerMeter * 2.0);
  } else if (type === 'Road') {
    // Road corridor extends along polygon span
    lengthScene = Math.max(8.0, Math.min(spanX * 0.94, (lengthMeters * unitsPerMeter * 0.35)));
    widthScene = Math.max(2.2, Math.min(spanZ * 0.45, (widthMeters * unitsPerMeter * 1.8)));
    heightScene = 0.3;
    depthScene = Math.max(0.4, (depthMeters ?? 0.5) * 0.8);
  } else if (['Water', 'Sewerage'].includes(type)) {
    // Pipeline corridor
    lengthScene = Math.max(8.0, Math.min(spanX * 0.90, (lengthMeters * unitsPerMeter * 0.35)));
    widthScene = Math.max(1.6, Math.min(spanZ * 0.35, (widthMeters * unitsPerMeter * 1.5)));
    heightScene = 0.2;
    depthScene = Math.max(1.2, depthMeters * unitsPerMeter * 2.2);
  } else if (type === 'Drainage') {
    // Box culvert corridor
    lengthScene = Math.max(8.0, Math.min(spanX * 0.90, (lengthMeters * unitsPerMeter * 0.35)));
    widthScene = Math.max(1.4, Math.min(spanZ * 0.30, (widthMeters * unitsPerMeter * 1.5)));
    heightScene = 0.2;
    depthScene = Math.max(1.0, depthMeters * unitsPerMeter * 2.2);
  } else {
    // Cable / Electrical / Telecom conduit
    lengthScene = Math.max(8.0, Math.min(spanX * 0.90, (lengthMeters * unitsPerMeter * 0.35)));
    widthScene = Math.max(1.2, Math.min(spanZ * 0.25, (widthMeters * unitsPerMeter * 1.5)));
    heightScene = 0.2;
    depthScene = Math.max(0.8, depthMeters * unitsPerMeter * 2.0);
  }

  const footprintArea = widthScene * lengthScene;
  const parcelArea = spanX * spanZ;
  const coverageRatio = Math.min(1.0, footprintArea / Math.max(0.01, parcelArea));

  return {
    lengthScene,
    widthScene,
    heightScene,
    depthScene,
    lengthMeters,
    widthMeters,
    heightMeters,
    depthMeters,
    coverageRatio,
  };
}

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
    const loop = pts.map(p => new THREE.Vector3(p.x, 0.12, p.z));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(loop);
    const line = new THREE.LineLoop(
      lineGeo,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 })
    );
    group.add(line);

    const glow = new THREE.LineLoop(
      lineGeo.clone(),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28, linewidth: 2 })
    );
    glow.position.y = 0.04;
    group.add(glow);

    const fill = new THREE.Mesh(
      new THREE.ShapeGeometry(polygonToShape(pts)).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    fill.position.y = 0.06;
    fill.userData = { project, objectType: 'Tender Region' };
    group.add(fill);
  }

  if (options.showExcavation && depthM > 0.15 && pts.length > 2) {
    const shape = polygonToShape(pts);
    const extrude = new THREE.ExtrudeGeometry(shape, {
      depth: depthM,
      bevelEnabled: false,
      steps: 1,
    });
    extrude.rotateX(Math.PI / 2);

    const volume = new THREE.Mesh(
      extrude,
      new THREE.MeshStandardMaterial({
        color: 0xc2410c,
        roughness: 0.42,
        metalness: 0.08,
        transparent: true,
        opacity: 0.30,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    volume.userData = { project, objectType: 'Excavation Volume', depth: depthM };
    group.add(volume);

    const floor = new THREE.Mesh(
      new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 1, metalness: 0 })
    );
    floor.position.y = -depthM + 0.03;
    floor.userData = { project, objectType: 'Trench Floor', depth: depthM };
    group.add(floor);

    const tickCount = Math.max(2, Math.min(8, Math.round(depthM)));
    for (let i = 1; i <= tickCount; i++) {
      const y = -(depthM * i) / tickCount;
      const tickPts = pts.map(p => new THREE.Vector3(p.x, y, p.z));
      const tick = new THREE.LineLoop(
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
    const roof = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });

    for (let i = 0; i < 18; i++) {
      const x = (rand(i) - 0.5) * MAP_PLANE_SIZE * 0.84;
      const z = (rand(i + 40) - 0.5) * MAP_PLANE_SIZE * 0.84;
      if (pointInRing(x, z, pts)) continue;
      // Proportional ambient buildings
      const w = 1.8 + rand(i + 80) * 3.2;
      const d = 1.8 + rand(i + 120) * 3.2;
      const h = 2.0 + rand(i + 160) * 7.5;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facade);
      box.position.set(x, h / 2, z);
      box.castShadow = true;
      box.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.2, d + 0.15), roof);
      cap.position.set(x, h + 0.1, z);
      group.add(box, cap);
    }
  }

  return group;
}
