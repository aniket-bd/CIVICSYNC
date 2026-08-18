import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Project } from '../../types/project';
import { store } from '../../db/store';
import { PipelineGenerator } from './generators/PipelineGenerator';
import { RoadGenerator } from './generators/RoadGenerator';
import { DrainageGenerator } from './generators/DrainageGenerator';
import { CableGenerator } from './generators/CableGenerator';
import { BuildingGenerator } from './generators/BuildingGenerator';
import { BridgeGenerator } from './generators/BridgeGenerator';
import { Project2DMapBoundary } from './Project2DMapBoundary';
import { getProjectTypeColor } from '../common/TypeIcon';
import { formatINR } from '../../utils/formatters';
import { DEMO_25_PROJECTS } from './demoProjects25';
import {
  MAP_PLANE_SIZE,
  MapTileBounds,
  buildTenderRegionVolume,
  loadTenderMapTexture,
  getProjectPolygonMetrics,
  getCalibratedProjectDimensions,
} from './tenderMapGround';

export type ViewStateMode = 'Existing' | 'Construction' | 'Completed';
export type ActiveVisualizationView = '2d' | '3d' | 'split';

interface Procedural3DViewerProps {
  initialProjectId?: string;
  onNavigateTo2D: (project: Project) => void;
}

const F = 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const toolbarStyle: React.CSSProperties = {
  height: '56px',
  background: 'rgba(255, 255, 255, 0.38)',
  backdropFilter: 'blur(42px) saturate(220%)',
  WebkitBackdropFilter: 'blur(42px) saturate(220%)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.55)',
  boxShadow: '0 10px 40px -18px rgba(15, 23, 42, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 22px',
  gap: '14px',
  fontFamily: F,
  flexShrink: 0,
  position: 'relative',
  zIndex: 40,
};

const segmentedStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 16px',
  borderRadius: '980px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: active ? 600 : 450,
  fontFamily: F,
  letterSpacing: '-0.01em',
  background: active ? '#1d1d1f' : 'transparent',
  color: active ? '#f5f5f7' : '#1d1d1f',
  boxShadow: active ? '0 1px 3px rgba(0, 0, 0, 0.18)' : 'none',
  transition: 'all 0.22s cubic-bezier(0.25, 0.1, 0.25, 1)',
});

const glassPanelStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.54)',
  backdropFilter: 'blur(40px) saturate(220%)',
  WebkitBackdropFilter: 'blur(40px) saturate(220%)',
  border: '1px solid rgba(255, 255, 255, 0.72)',
  borderRadius: '18px',
  boxShadow: '0 20px 50px -14px rgba(15, 23, 42, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.88)',
  fontFamily: F,
};

const sectionLabel: React.CSSProperties = {
  fontSize: '10.5px',
  fontWeight: 700,
  color: '#86868b',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '8px',
};

const CLEAN_PREFIXES = ['Pipeline_', 'Road_', 'Drainage_', 'Cable_', 'Building_', 'Bridge_', 'Boundary_3D_', 'GPR_', 'Region_3D_'];

export const Procedural3DViewer: React.FC<Procedural3DViewerProps> = ({
  initialProjectId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef     = useRef<THREE.Scene | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef     = useRef<number | null>(null);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const mapBoundsRef  = useRef<MapTileBounds | null>(null);
  const mapTextureRef = useRef<THREE.CanvasTexture | null>(null);

  const [projects, setProjects]     = useState<Project[]>(store.getProjects());
  const [selectedId, setSelectedId] = useState<string>(
    initialProjectId || store.getSelectedProjectId() || 'TND-005'
  );

  useEffect(() => store.subscribe(() => {
    setProjects(store.getProjects());
    const s = store.getSelectedProjectId();
    if (s && s !== selectedId) setSelectedId(s);
  }), [selectedId]);

  const handleSelect = (id: string) => { setSelectedId(id); store.setSelectedProjectId(id); };

  const [viewMode, setViewMode]   = useState<ActiveVisualizationView>('split');
  const [stateMode, setStateMode] = useState<ViewStateMode>('Construction');
  const [depthM, setDepthM]       = useState(4.8);
  const [heightM, setHeightM]     = useState(28.0);
  const [ugOpacity, setUgOpacity] = useState(0.85);
  const [showUG, setShowUG]       = useState(true);
  const [showBoundary, setShowBoundary]   = useState(true);
  const [showSuper, setShowSuper]         = useState(true);
  const [showContext, setShowContext]     = useState(true);
  const [showGPR, setShowGPR]           = useState(true);
  const [showLayers, setShowLayers]     = useState(false);
  const [showDetails, setShowDetails]   = useState(false);
  const [mapBasemap, setMapBasemap]     = useState<'satellite' | 'map'>('satellite');
  const [mapLoading, setMapLoading]     = useState(true);
  const [mapEpoch, setMapEpoch]         = useState(0);
  const [inspected, setInspected]       = useState<{ name: string; project?: Project; type: string; depth?: number; height?: number } | null>(null);

  const project = projects.find(p => p.id === selectedId) || projects[0] || DEMO_25_PROJECTS[4];
  const show3D = viewMode === '3d' || viewMode === 'split';
  const show2D = viewMode === '2d' || viewMode === 'split';

  const isDragging = useRef(false);
  const prevMouse  = useRef({ x: 0, y: 0 });
  const sph        = useRef({ radius: 48, theta: Math.PI / 4.2, phi: Math.PI / 3.15 });
  const target     = useRef(new THREE.Vector3(0, -1.6, 0));

  useEffect(() => {
    if (project?.depthMeters)   setDepthM(project.depthMeters);
    if (project?.heightMeters)  setHeightM(project.heightMeters);
  }, [selectedId]);

  const moveCam = () => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = sph.current;
    const t = target.current;
    cameraRef.current.position.set(
      t.x + radius * Math.sin(phi) * Math.sin(theta),
      t.y + radius * Math.cos(phi),
      t.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    cameraRef.current.lookAt(t);
  };

  useEffect(() => {
    if (!show3D || !containerRef.current) return;
    const W = containerRef.current.clientWidth || 800;
    const H = containerRef.current.clientHeight || 600;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(46, W / H, 0.4, 1200);
    cameraRef.current = camera;
    moveCam();

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.88));
    const key = new THREE.DirectionalLight(0xfff6ea, 1.4);
    key.position.set(42, 70, 28); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 4; key.shadow.camera.far = 160;
    key.shadow.camera.left = -50; key.shadow.camera.right = 50;
    key.shadow.camera.top = 50; key.shadow.camera.bottom = -50;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x93c5fd, 0.65);
    rim.position.set(-36, 24, -30); scene.add(rim);
    const ug = new THREE.PointLight(0xfbbf24, 1.8, 52);
    ug.position.set(0, -4, 0); scene.add(ug);
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x334155, 0.5);
    scene.add(hemi);

    // Floating spatial pedestal container for terrain
    const pedestalGroup = new THREE.Group();
    pedestalGroup.name = 'Pedestal_Base';

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_PLANE_SIZE, MAP_PLANE_SIZE, 1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xd5dce3, roughness: 0.94, metalness: 0.04 })
    );
    ground.name = 'Ground_Map';
    ground.receiveShadow = true;
    pedestalGroup.add(ground);
    groundMeshRef.current = ground;

    // Glass pedestal base underneath
    const pedestalBase = new THREE.Mesh(
      new THREE.BoxGeometry(MAP_PLANE_SIZE + 0.6, 1.0, MAP_PLANE_SIZE + 0.6),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.25,
        metalness: 0.75,
        transparent: true,
        opacity: 0.65,
      })
    );
    pedestalBase.position.y = -0.52;
    pedestalBase.receiveShadow = true;
    pedestalGroup.add(pedestalBase);

    scene.add(pedestalGroup);

    if (mapTextureRef.current) {
      const mat = ground.material as THREE.MeshStandardMaterial;
      mat.map = mapTextureRef.current;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    }

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const dom = renderer.domElement;
    const onDown = (e: MouseEvent) => { isDragging.current = true; prevMouse.current = { x: e.clientX, y: e.clientY }; };
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      sph.current.theta -= dx * 0.007;
      sph.current.phi = Math.max(0.12, Math.min(Math.PI / 2 + 0.28, sph.current.phi - dy * 0.007));
      moveCam();
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onUp   = () => { isDragging.current = false; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); sph.current.radius = Math.max(14, Math.min(110, sph.current.radius + e.deltaY * 0.04)); moveCam(); };
    const onClick = (e: MouseEvent) => {
      if (!cameraRef.current || !sceneRef.current) return;
      const rect = dom.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, cameraRef.current);
      const hits = ray.intersectObjects(sceneRef.current.children, true);
      if (hits.length > 0) {
        const obj = hits[0].object;
        if (obj.userData?.objectType || obj.userData?.project) {
          setInspected({ name: obj.userData.project?.name || obj.userData.objectType || 'Infrastructure Element', project: obj.userData.project, type: obj.userData.objectType || obj.userData.project?.type || 'Element', depth: obj.userData.project?.depthMeters ?? obj.userData.depth, height: obj.userData.project?.heightMeters });
        }
      }
    };
    const onResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth; const h = containerRef.current.clientHeight;
      if (w < 8 || h < 8) return;
      cameraRef.current.aspect = w / h; cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    dom.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      dom.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      groundMeshRef.current = null;
    };
  }, [show3D]);

  useEffect(() => {
    if (!show3D) return;
    const id = requestAnimationFrame(() => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w < 8 || h < 8) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    });
    return () => cancelAnimationFrame(id);
  }, [viewMode, show3D]);

  useEffect(() => {
    let cancelled = false;
    setMapLoading(true);
    loadTenderMapTexture({
      lat: project.latitude,
      lng: project.longitude,
      style: mapBasemap,
    }).then(({ texture, bounds }) => {
      if (cancelled) {
        texture.dispose();
        return;
      }
      mapTextureRef.current?.dispose();
      mapTextureRef.current = texture;
      mapBoundsRef.current = bounds;
      const mesh = groundMeshRef.current;
      if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.map = texture;
        mesh.material.color.set(0xffffff);
        mesh.material.needsUpdate = true;
      }
      setMapEpoch(e => e + 1);
      setMapLoading(false);
    }).catch(() => {
      if (!cancelled) setMapLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedId, mapBasemap, project.latitude, project.longitude]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const rm: THREE.Object3D[] = [];
    scene.children.forEach(c => {
      if (CLEAN_PREFIXES.some(p => c.name.startsWith(p))) rm.push(c);
    });
    rm.forEach(o => {
      o.traverse(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => m.dispose());
        }
      });
      scene.remove(o);
    });

    const opacity = showUG ? ugOpacity : 0.05;
    const bounds = mapBoundsRef.current ?? {
      west: project.longitude - 0.006,
      east: project.longitude + 0.006,
      north: project.latitude + 0.006,
      south: project.latitude - 0.006,
      planeSize: MAP_PLANE_SIZE,
    };

    const metrics = getProjectPolygonMetrics(project, bounds);
    const dims = getCalibratedProjectDimensions(project, metrics);

    // Target polygon centroid
    target.current.set(metrics.centerX, -1.0, metrics.centerZ);
    moveCam();

    scene.add(buildTenderRegionVolume(
      project,
      bounds,
      depthM,
      getProjectTypeColor(project.type),
      { showBoundary, showExcavation: showUG, showContext }
    ));

    if (project.type === 'Building' && showSuper) {
      scene.add(BuildingGenerator.generate({ ...project, depthMeters: depthM, heightMeters: heightM }, { mode: stateMode, undergroundOpacity: opacity, depthSliderMeters: depthM, bounds }));
    } else if (project.type === 'Bridge') {
      scene.add(BridgeGenerator.generate({ ...project, depthMeters: depthM }, { mode: stateMode, undergroundOpacity: opacity, bounds }));
    } else if (['Water', 'Sewerage'].includes(project.type)) {
      scene.add(PipelineGenerator.generate({ ...project, depthMeters: depthM }, { mode: stateMode, depthSliderMeters: depthM, undergroundOpacity: opacity, showTrench: stateMode === 'Construction', bounds }).group);
    } else if (project.type === 'Road') {
      scene.add(RoadGenerator.generate(project, { mode: stateMode, undergroundOpacity: opacity, bounds }));
    } else if (project.type === 'Drainage') {
      scene.add(DrainageGenerator.generate({ ...project, depthMeters: project.depthMeters ?? 3.2 }, { mode: stateMode, undergroundOpacity: opacity, bounds }));
    } else if (['Telecom', 'Electrical', 'Cable'].includes(project.type)) {
      scene.add(CableGenerator.generate({ ...project, depthMeters: project.depthMeters ?? 1.5 }, { mode: stateMode, undergroundOpacity: opacity, bounds }));
    } else {
      scene.add(PipelineGenerator.generate({ ...project, depthMeters: depthM }, { mode: stateMode, depthSliderMeters: depthM, undergroundOpacity: opacity, showTrench: false, bounds }).group);
    }

    if (showGPR) {
      store.getGPRSurveys().forEach(s => s.anomalies.forEach((a, i) => {
        const g = new THREE.Group(); g.name = `GPR_${a.id}`;
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshStandardMaterial({ color: 0xbf5af2, emissive: 0x6025b5, emissiveIntensity: 0.5, roughness: 0.2 }));
        m.position.set(metrics.centerX + (i - 1) * 4, -a.depthMeters, metrics.centerZ); m.userData = { objectType: `GPR: ${a.name}`, depth: a.depthMeters }; g.add(m); scene.add(g);
      }));
    }
  }, [selectedId, stateMode, depthM, heightM, ugOpacity, showUG, showBoundary, showSuper, showGPR, showContext, show3D, mapEpoch]);

  const setCamPreset = (p: 'iso' | 'top' | 'cut' | 'street') => {
    const curBounds = mapBoundsRef.current ?? {
      west: project.longitude - 0.006,
      east: project.longitude + 0.006,
      north: project.latitude + 0.006,
      south: project.latitude - 0.006,
      planeSize: MAP_PLANE_SIZE,
    };
    const curMetrics = getProjectPolygonMetrics(project, curBounds);
    const presets = {
      iso:    { radius: 42, theta: Math.PI/4.2,  phi: Math.PI/3.15, ty: -1.0 },
      top:    { radius: 52, theta: 0,             phi: 0.06,         ty: 0  },
      cut:    { radius: 32, theta: 0,             phi: Math.PI/2.05, ty: -depthM / 2 },
      street: { radius: 18, theta: Math.PI/6,     phi: Math.PI/2.25, ty: 1.5 },
    }[p];
    sph.current = { radius: presets.radius, theta: presets.theta, phi: presets.phi };
    target.current.set(curMetrics.centerX, presets.ty, curMetrics.centerZ);
    moveCam();
  };

  const typeColor = getProjectTypeColor(project.type);
  const statusColor = project.status === 'Active' ? '#1a7f37' : project.status === 'Approved' ? '#0071e3' : project.status === 'Completed' ? '#5856d6' : project.status === 'Delayed' ? '#c2411b' : '#9a6700';

  const currentBounds = mapBoundsRef.current ?? {
    west: project.longitude - 0.006,
    east: project.longitude + 0.006,
    north: project.latitude + 0.006,
    south: project.latitude - 0.006,
    planeSize: MAP_PLANE_SIZE,
  };
  const activeMetrics = getProjectPolygonMetrics(project, currentBounds);
  const activeDims = getCalibratedProjectDimensions(project, activeMetrics);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', fontFamily: F, position: 'relative' }}>

      <div style={toolbarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: typeColor, flexShrink: 0, boxShadow: `0 0 10px ${typeColor}` }} />
          <div style={{ minWidth: 0 }}>
            <select
              value={selectedId}
              onChange={e => handleSelect(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13.5px', fontWeight: 600, color: '#1d1d1f', fontFamily: F, cursor: 'pointer', maxWidth: '340px' }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#fff', color: '#1d1d1f' }}>
                  {p.tenderNumber} — {p.name}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '11.5px', color: '#515154', marginTop: '-2px' }}>
              {project.wardOrRegion}
              <span style={{ margin: '0 5px', color: 'rgba(0,0,0,0.2)' }}>·</span>
              {project.locationName}
            </div>
          </div>
        </div>

        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.38)',
          backdropFilter: 'blur(28px) saturate(210%)',
          WebkitBackdropFilter: 'blur(28px) saturate(210%)',
          borderRadius: '980px',
          padding: '4px 5px',
          gap: '3px',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow: '0 8px 28px -8px rgba(0, 0, 0, 0.16), inset 0 1px 0 rgba(255,255,255,0.8)'
        }}>
          {([['2d','2D Region'],['3d','3D Twin'],['split','Map + Depth']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setViewMode(id as ActiveVisualizationView)} style={segmentedStyle(viewMode === id)}>{label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            borderRadius: '980px',
            padding: '3px 4px',
            gap: '2px',
            border: '1px solid rgba(255, 255, 255, 0.7)'
          }}>
            {(['Existing','Construction','Completed'] as ViewStateMode[]).map(m => (
              <button key={m} onClick={() => setStateMode(m)} style={{
                padding: '5px 12px',
                borderRadius: '980px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: stateMode === m ? 700 : 500,
                fontFamily: F,
                background: stateMode === m ? '#1d1d1f' : 'transparent',
                color: stateMode === m ? '#fff' : '#515154',
                transition: 'all 0.15s',
                boxShadow: stateMode === m ? '0 1px 3px rgba(0, 0, 0, 0.18)' : 'none'
              }}>{m}</button>
            ))}
          </div>

          <div style={{ width: '1px', height: '20px', background: 'rgba(0, 0, 0, 0.08)' }} />

          <button onClick={() => setShowLayers(v => !v)} style={{
            padding: '6px 14px',
            borderRadius: '980px',
            border: showLayers ? '1px solid rgba(0, 113, 227, 0.35)' : '1px solid rgba(255, 255, 255, 0.7)',
            background: showLayers ? 'rgba(0, 113, 227, 0.12)' : 'rgba(255, 255, 255, 0.42)',
            color: showLayers ? '#0071e3' : '#1d1d1f',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: F,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
            </svg>
            Layers
          </button>

          <button onClick={() => setShowDetails(v => !v)} style={{
            padding: '6px 14px',
            borderRadius: '980px',
            border: showDetails ? '1px solid rgba(0, 113, 227, 0.35)' : '1px solid rgba(255, 255, 255, 0.7)',
            background: showDetails ? 'rgba(0, 113, 227, 0.12)' : 'rgba(255, 255, 255, 0.42)',
            color: showDetails ? '#0071e3' : '#1d1d1f',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: F,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Details
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {show2D && (
          <div style={{ flex: 1, borderRight: viewMode === 'split' ? '1px solid rgba(255, 255, 255, 0.55)' : 'none', position: 'relative', minWidth: 0 }}>
            <Project2DMapBoundary project={project} onSwitchTo3D={() => setViewMode('3d')} />
          </div>
        )}
        <div
          ref={containerRef}
          style={{
            flex: show3D ? 1 : 0,
            minWidth: show3D ? 0 : 0,
            width: show3D ? undefined : 0,
            display: show3D ? 'block' : 'none',
            cursor: 'grab',
            position: 'relative',
            background: 'radial-gradient(ellipse at 50% 45%, rgba(255, 255, 255, 0.08) 0%, rgba(15, 23, 42, 0.22) 100%)',
          }}
        />

        {show3D && mapLoading && (
          <div style={{
            position: 'absolute',
            top: viewMode === 'split' ? '20px' : '20px',
            left: viewMode === 'split' ? 'calc(50% + 20px)' : '280px',
            ...glassPanelStyle,
            padding: '8px 14px',
            fontSize: '12px',
            color: '#515154',
            zIndex: 35,
            pointerEvents: 'none',
          }}>
            Loading tender region map…
          </div>
        )}

        {show3D && (
          <div style={{ position: 'absolute', top: '20px', left: viewMode === 'split' ? 'calc(50% + 16px)' : '20px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 30, maxWidth: '270px' }}>
            <div style={{ ...glassPanelStyle, padding: '16px 18px' }}>
              <div style={sectionLabel}>Tender Region</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                {project.wardOrRegion}
              </div>
              <div style={{ fontSize: '12px', color: '#515154', marginTop: '4px', lineHeight: 1.4 }}>
                {project.locationName}
              </div>
              <div style={{
                marginTop: '10px',
                background: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(0,113,227,0.18)',
                borderRadius: '10px',
                padding: '7px 10px',
                fontSize: '11px',
                fontFamily: 'SF Mono, ui-monospace, monospace',
                color: '#0071e3',
                fontWeight: 600,
              }}>
                {project.latitude.toFixed(5)}°N · {project.longitude.toFixed(5)}°E
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
                {(['satellite', 'map'] as const).map(s => (
                  <button key={s} onClick={() => setMapBasemap(s)} style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '980px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: mapBasemap === s ? 700 : 500,
                    fontFamily: F,
                    background: mapBasemap === s ? '#1d1d1f' : 'rgba(255,255,255,0.55)',
                    color: mapBasemap === s ? '#fff' : '#1d1d1f',
                    textTransform: 'capitalize',
                  }}>{s}</button>
                ))}
              </div>
            </div>

            <div style={{ ...glassPanelStyle, padding: '16px 18px' }}>
              <div style={sectionLabel}>Subsurface Depth</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12.5px', color: '#1d1d1f', fontWeight: 600 }}>Trench Cut</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#9a6700', fontFamily: 'SF Mono, ui-monospace, monospace' }}>–{depthM.toFixed(1)} m</span>
              </div>
              <input type="range" min="0.5" max="10" step="0.5" value={depthM}
                onChange={e => setDepthM(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#9a6700', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#86868b', marginTop: '4px' }}>
                <span>0.5 m</span><span>10.0 m</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6e6e73', marginTop: '8px', lineHeight: 1.4 }}>
                Depth extrudes the tender polygon into a 3D excavation on the 2D map.
              </div>
            </div>

            <div style={{ ...glassPanelStyle, padding: '16px 18px' }}>
              <div style={sectionLabel}>Proposed Superstructure</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12.5px', color: '#1d1d1f', fontWeight: 600 }}>Height</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1a7f37', fontFamily: 'SF Mono, ui-monospace, monospace' }}>+{heightM.toFixed(1)} m</span>
              </div>
              <input type="range" min="2" max="50" step="1" value={heightM}
                onChange={e => setHeightM(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#1a7f37', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#86868b', marginTop: '4px' }}>
                <span>2 m</span><span>50 m</span>
              </div>
            </div>

            <div style={{ ...glassPanelStyle, padding: '16px 18px' }}>
              <div style={sectionLabel}>Camera Angle</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[['iso','Perspective'],['top','Top View'],['cut','Cross Section'],['street','Street Level']].map(([k, l]) => (
                  <button key={k} onClick={() => setCamPreset(k as 'iso' | 'top' | 'cut' | 'street')} style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.7)',
                    background: 'rgba(255, 255, 255, 0.45)',
                    color: '#1d1d1f',
                    fontSize: '11.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: F,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.78)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.45)')}
                  >{l}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showLayers && (
          <div style={{ position: 'absolute', top: '20px', right: '20px', width: '280px', ...glassPanelStyle, overflow: 'hidden', zIndex: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 12px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>GIS Layers</span>
              <button onClick={() => setShowLayers(false)} style={{ background: 'rgba(0, 0, 0, 0.05)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '11px', color: '#515154', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {[
              { label: 'Project Boundary',   sub: 'Tender region on 2D map', state: showBoundary, set: setShowBoundary, dot: '#0071e3' },
              { label: 'Proposed Structure',  sub: 'Above-ground superstructure', state: showSuper,    set: setShowSuper,    dot: '#1a7f37' },
              { label: 'Underground Utilities', sub: 'Depth-based 3D excavation', state: showUG,       set: setShowUG,       dot: '#9a6700' },
              { label: 'Existing Context',    sub: 'Surrounding built environment', state: showContext,  set: setShowContext,  dot: '#86868b' },
              { label: 'GPR Radar Scan',      sub: 'Subsurface anomaly detection', state: showGPR,      set: setShowGPR,      dot: '#5856d6' },
            ].map((layer, i, arr) => (
              <div key={i} onClick={() => layer.set(!layer.state)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 18px', cursor: 'pointer',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(0, 0, 0, 0.04)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.45)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: layer.dot, opacity: layer.state ? 1 : 0.35, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: layer.state ? '#1d1d1f' : '#86868b' }}>{layer.label}</div>
                    <div style={{ fontSize: '11px', color: '#86868b', marginTop: '1px' }}>{layer.sub}</div>
                  </div>
                </div>
                <div style={{ width: '38px', height: '22px', borderRadius: '11px', background: layer.state ? '#0071e3' : 'rgba(0, 0, 0, 0.15)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: '2px', left: layer.state ? '18px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {showDetails && (
          <div style={{ position: 'absolute', top: '20px', right: showLayers ? '310px' : '20px', width: '290px', ...glassPanelStyle, overflow: 'hidden', zIndex: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 12px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>Project Details</span>
              <button onClick={() => setShowDetails(false)} style={{ background: 'rgba(0, 0, 0, 0.05)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '11px', color: '#515154', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '14px 18px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{project.status}</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.25 }}>{project.name}</div>
            </div>
            {[
              ['Tender', project.tenderNumber],
              ['Type', project.type],
              ['Status', project.status],
              ['Visibility', project.visibility?.type || 'Organization'],
              ['GPR Survey', project.gpr ? `${project.gpr.fileName} (${project.gpr.processingStatus})` : 'Procedural Model'],
              ['Location', project.locationName],
              ['Ward / Region', project.wardOrRegion],
              ['Coordinates', `${project.latitude.toFixed(5)}°N, ${project.longitude.toFixed(5)}°E`],
              ['Depth', `${depthM.toFixed(1)} m`],
              ['Height', `+${heightM.toFixed(1)} m`],
              ['Budget', formatINR(project.budget)],
              ['Contractor', project.contractor],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 18px', borderTop: '1px solid rgba(0, 0, 0, 0.04)' }}>
                <span style={{ fontSize: '12px', color: '#86868b', flexShrink: 0, marginRight: '12px' }}>{k}</span>
                <span style={{ fontSize: '12px', color: '#1d1d1f', textAlign: 'right', wordBreak: 'break-word', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            {project.gpr && (
              <div style={{ margin: '10px 14px 14px', background: 'rgba(0, 113, 227, 0.06)', border: '1px solid rgba(0, 113, 227, 0.15)', borderRadius: '10px', padding: '10px', fontSize: '11px', color: '#515154', lineHeight: 1.4 }}>
                <strong style={{ color: '#0071e3' }}>GPR DATA ATTACHED:</strong> Raw GPR data is attached to this project. Visualization will be available when a compatible GPR processing/decoder is configured.
              </div>
            )}
          </div>
        )}

        <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 24px 18px', pointerEvents: 'none', zIndex: 30 }}>
          <div style={{ ...glassPanelStyle, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '16px', pointerEvents: 'auto' }}>
            <div>
              <div style={{ fontSize: '9.5px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Calibrated Footprint</div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1d1d1f', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
                {activeDims.lengthMeters}m L × {activeDims.widthMeters}m W
              </div>
            </div>
            <div style={{ width: '1px', height: '22px', background: 'rgba(0,0,0,0.08)' }} />
            <div>
              <div style={{ fontSize: '9.5px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profile Height / Depth</div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0071e3', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
                {activeDims.heightMeters > 0 ? `+${activeDims.heightMeters}m` : 'Surface'} · <span style={{ color: '#9a6700' }}>–{depthM.toFixed(1)}m</span>
              </div>
            </div>
            <div style={{ width: '1px', height: '22px', background: 'rgba(0,0,0,0.08)' }} />
            <div>
              <div style={{ fontSize: '9.5px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Parcel Area & Scale</div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1a7f37', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
                {activeMetrics.areaSqMeters.toLocaleString()} m² · 1:1 Scale Calibrated
              </div>
            </div>
          </div>
          {inspected && (
            <div style={{ ...glassPanelStyle, padding: '14px 18px', maxWidth: '440px', pointerEvents: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{inspected.type}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1d1d1f', marginTop: '2px' }}>{inspected.name}</div>
                  {inspected.project && <div style={{ fontSize: '12px', color: '#515154', marginTop: '2px' }}>{inspected.project.locationName} · {inspected.project.contractor}</div>}
                  <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: '12.5px' }}>
                    {inspected.depth !== undefined && <span style={{ color: '#515154' }}>Depth <strong style={{ color: '#9a6700' }}>–{inspected.depth}m</strong></span>}
                    {inspected.height !== undefined && <span style={{ color: '#515154' }}>Height <strong style={{ color: '#1a7f37' }}>+{inspected.height}m</strong></span>}
                    {inspected.project && <span style={{ color: '#515154' }}>Budget <strong style={{ color: '#0071e3' }}>{formatINR(inspected.project.budget)}</strong></span>}
                  </div>
                </div>
                <button onClick={() => setInspected(null)} style={{ background: 'rgba(0, 0, 0, 0.05)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', flexShrink: 0, fontSize: '11px', color: '#515154' }}>✕</button>
              </div>
            </div>
          )}
          <div style={{ ...glassPanelStyle, padding: '6px 12px', fontSize: '11.5px', color: '#515154', pointerEvents: 'auto' }}>
            Drag to Orbit · Scroll to Zoom
          </div>
        </div>
      </div>
    </div>
  );
};
