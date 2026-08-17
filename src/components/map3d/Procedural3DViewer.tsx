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
import { MapSurfaceGenerator, BasemapStyle } from './MapSurfaceGenerator';
import { Project2DMapBoundary } from './Project2DMapBoundary';
import { getProjectTypeColor } from '../common/TypeIcon';
import { formatINR } from '../../utils/formatters';
import { DEMO_25_PROJECTS } from './demoProjects25';

export type ViewStateMode = 'Existing' | 'Construction' | 'Completed';
export type ActiveVisualizationView = '2d' | '3d' | 'split';

interface Procedural3DViewerProps {
  initialProjectId?: string;
  onNavigateTo2D: (project: Project) => void;
}

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const toolbarStyle: React.CSSProperties = {
  height: '52px',
  background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.92) 0%, rgba(255, 237, 213, 0.80) 100%)',
  backdropFilter: 'blur(30px) saturate(220%)',
  WebkitBackdropFilter: 'blur(30px) saturate(220%)',
  borderBottom: '1.5px solid rgba(255, 149, 0, 0.35)',
  boxShadow: '0 4px 20px -2px rgba(255, 107, 0, 0.12)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 20px',
  gap: '12px',
  fontFamily: F,
  flexShrink: 0,
  position: 'relative',
  zIndex: 40,
};

const segmentedStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: '980px',
  border: active ? '1px solid rgba(255, 149, 0, 0.6)' : '1px solid transparent',
  cursor: 'pointer',
  fontSize: '12.5px',
  fontWeight: active ? 700 : 500,
  fontFamily: F,
  letterSpacing: '-0.01em',
  background: active ? 'linear-gradient(180deg, #ff7a00 0%, #ff5500 100%)' : 'transparent',
  color: active ? '#ffffff' : '#515154',
  boxShadow: active ? '0 4px 14px rgba(255, 107, 0, 0.4)' : 'none',
  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
});

const glassPanelStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.88)',
  backdropFilter: 'blur(28px) saturate(210%)',
  WebkitBackdropFilter: 'blur(28px) saturate(210%)',
  border: '1.5px solid rgba(255, 149, 0, 0.35)',
  borderRadius: '16px',
  boxShadow: '0 12px 36px -4px rgba(255, 149, 0, 0.14), 0 4px 16px -2px rgba(15, 23, 42, 0.06)',
  fontFamily: F,
};

const sectionLabel: React.CSSProperties = {
  fontSize: '10.5px',
  fontWeight: 700,
  color: '#86868b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '8px',
};

export const Procedural3DViewer: React.FC<Procedural3DViewerProps> = ({
  initialProjectId,
  onNavigateTo2D: _onNavigateTo2D,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef     = useRef<THREE.Scene | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef     = useRef<number | null>(null);
  const lastTimeRef  = useRef<number>(performance.now());
  const activePipelineAnimRef = useRef<((delta: number) => void) | null>(null);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);

  const [projects, setProjects]     = useState<Project[]>(store.getProjects());
  const [selectedId, setSelectedId] = useState<string>(
    initialProjectId || store.getSelectedProjectId() || 'TND-011'
  );

  useEffect(() => store.subscribe(() => {
    setProjects(store.getProjects());
    const s = store.getSelectedProjectId();
    if (s && s !== selectedId) setSelectedId(s);
  }), [selectedId]);

  const handleSelect = (id: string) => { setSelectedId(id); store.setSelectedProjectId(id); };

  const [viewMode, setViewMode]   = useState<ActiveVisualizationView>('3d');
  const [stateMode, setStateMode] = useState<ViewStateMode>('Construction');
  const [depthM, setDepthM]       = useState(5.0);
  const [heightM, setHeightM]     = useState(28.0);
  const [ugOpacity, setUgOpacity] = useState(0.92);
  const [surfaceOpacity, setSurfaceOpacity] = useState(0.92);
  const [basemapStyle, setBasemapStyle]     = useState<BasemapStyle>('street');
  const [showTrenchCutout, setShowTrenchCutout] = useState(true);
  const [activeStationIndex, setActiveStationIndex] = useState<number | null>(null);

  const [showUG, setShowUG]               = useState(true);
  const [showBoundary, setShowBoundary]   = useState(true);
  const [showSuper, setShowSuper]         = useState(true);
  const [showContext, setShowContext]     = useState(true);
  const [showGPR, setShowGPR]             = useState(true);
  const [showLayers, setShowLayers]       = useState(false);
  const [showDetails, setShowDetails]     = useState(false);
  const [inspected, setInspected]         = useState<{
    name: string;
    project?: Project;
    type: string;
    depth?: number;
    height?: number;
    clearance?: number;
    status?: string;
  } | null>(null);

  const project = projects.find(p => p.id === selectedId) || projects[0] || DEMO_25_PROJECTS[0];

  const isDragging = useRef(false);
  const prevMouse  = useRef({ x: 0, y: 0 });
  const sph        = useRef({ radius: 46, theta: Math.PI / 4, phi: Math.PI / 3 });
  const target     = useRef(new THREE.Vector3(0, -2, 0));

  useEffect(() => {
    if (project?.depthMeters)   setDepthM(project.depthMeters);
    if (project?.heightMeters)  setHeightM(project.heightMeters);
    setActiveStationIndex(null);
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

  // Fly Camera to Specific Station / KM Milestone
  const focusOnStation = (stationIdx: number | null) => {
    setActiveStationIndex(stationIdx);
    if (stationIdx === null || !project.stations || !project.stations[stationIdx]) {
      // Focus on entire corridor center
      sph.current = { radius: 48, theta: Math.PI / 4, phi: Math.PI / 3 };
      target.current.set(0, -2, 0);
      moveCam();
      return;
    }

    const st = project.stations[stationIdx];
    const spanDeg = 0.026;
    const groundSize = 140;
    const minLng = project.longitude - spanDeg / 2;
    const maxLng = project.longitude + spanDeg / 2;
    const minLat = project.latitude - spanDeg / 2;
    const maxLat = project.latitude + spanDeg / 2;

    const u = (st.lng - minLng) / (maxLng - minLng);
    const v = (st.lat - minLat) / (maxLat - minLat);
    const x = (u - 0.5) * groundSize;
    const z = -(v - 0.5) * groundSize;

    target.current.set(x, -(st.depthMeters ?? depthM), z);
    sph.current = { radius: 18, theta: Math.PI / 3, phi: Math.PI / 2.6 };
    moveCam();

    setInspected({
      name: st.name,
      project,
      type: `Station Marker · KM ${st.km.toFixed(1)}`,
      depth: st.depthMeters ?? depthM,
      status: `Invert: ${st.invertLevelMeters ?? 312}m RL · Pressure: ${st.pressureBar ?? 5.5} bar`
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const W = containerRef.current.clientWidth || 800;
    const H = containerRef.current.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f7);
    scene.fog = new THREE.FogExp2(0xf5f5f7, 0.003);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.5, 1200);
    cameraRef.current = camera;
    moveCam();

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Apple Studio Warm Lighting — bright, clean, premium
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xfff7ed, 1.6);
    key.position.set(60, 90, 50); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xfff0e0, 0.6);
    fill.position.set(-50, 60, -50); scene.add(fill);

    const rim = new THREE.DirectionalLight(0xe8e8ed, 0.5);
    rim.position.set(-40, 30, 40); scene.add(rim);

    const ugLight = new THREE.PointLight(0x0284c7, 1.8, 80);
    ugLight.position.set(0, -6, 0); scene.add(ugLight);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (activePipelineAnimRef.current) {
        activePipelineAnimRef.current(delta);
      }

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
      sph.current.phi = Math.max(0.08, Math.min(Math.PI / 2 + 0.38, sph.current.phi - dy * 0.007));
      moveCam();
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onUp   = () => { isDragging.current = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sph.current.radius = Math.max(8, Math.min(120, sph.current.radius + e.deltaY * 0.04));
      moveCam();
    };
    const onClick = (e: MouseEvent) => {
      if (!cameraRef.current || !sceneRef.current) return;
      const rect = dom.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, cameraRef.current);
      const hits = ray.intersectObjects(sceneRef.current.children, true);
      if (hits.length > 0) {
        const obj = hits[0].object;
        if (obj.userData?.objectType || obj.userData?.project) {
          setInspected({
            name: obj.userData.project?.name || obj.userData.objectType || 'Infrastructure Element',
            project: obj.userData.project,
            type: obj.userData.objectType || obj.userData.project?.type || 'Element',
            depth: obj.userData.depth ?? obj.userData.project?.depthMeters,
            height: obj.userData.height ?? obj.userData.project?.heightMeters,
            clearance: obj.userData.clearance,
            status: obj.userData.status
          });
        }
      }
    };
    const onResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth; const h = containerRef.current.clientHeight;
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
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // RE-RENDER 3D SCENE (GROUND 2D MAP SURFACE & REAL ROUTE PIPE)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous objects
    const rm: THREE.Object3D[] = [];
    scene.children.forEach(c => {
      if (['Pipeline_', 'Road_', 'Drainage_', 'Cable_', 'Building_', 'Bridge_', 'Boundary_3D_', 'GPR_', 'Ground2DMap_', 'TrenchGroup'].some(p => c.name.startsWith(p))) {
        rm.push(c);
      }
    });
    rm.forEach(o => scene.remove(o));
    activePipelineAnimRef.current = null;

    const opacity = showUG ? ugOpacity : 0.05;
    const groundSize = 140;

    // 1. GENERATE HIGH-RES 2D MAP SURFACE PLANE
    const mapSurface = MapSurfaceGenerator.generateTexture(project, {
      style: basemapStyle,
      showTrenchCutout: showTrenchCutout && stateMode === 'Construction',
      groundSize,
      resolution: 2048,
      opacity: surfaceOpacity
    });

    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize).rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: mapSurface.texture,
      transparent: true,
      opacity: surfaceOpacity,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.name = `Ground2DMap_${project.id}`;
    groundMesh.position.y = 0;
    groundMesh.receiveShadow = true;
    groundMesh.userData = {
      objectType: `Surface 2D Map (${basemapStyle.toUpperCase()})`,
      project
    };
    scene.add(groundMesh);
    groundMeshRef.current = groundMesh;

    // Subsurface Grid Bedrock Plane at –12m depth (warm Apple gray tones)
    const subGrid = new THREE.GridHelper(groundSize, 35, 0xd2d2d7, 0xe8e8ed);
    subGrid.name = `Ground2DMap_SubGrid`;
    subGrid.position.y = -12;
    scene.add(subGrid);

    // 2. GENERATE PROCEDURAL 3D PIPELINE / INFRASTRUCTURE ALONG ROUTE
    if (project.type === 'Building' && showSuper) {
      scene.add(BuildingGenerator.generate({ ...project, depthMeters: depthM, heightMeters: heightM }, { mode: stateMode, undergroundOpacity: opacity, depthSliderMeters: depthM }));
    } else if (project.type === 'Bridge') {
      scene.add(BridgeGenerator.generate({ ...project, depthMeters: depthM }, { mode: stateMode, undergroundOpacity: opacity }));
    } else if (['Water', 'Sewerage'].includes(project.type)) {
      const result = PipelineGenerator.generate(
        { ...project, depthMeters: depthM },
        {
          mode: stateMode,
          depthSliderMeters: depthM,
          undergroundOpacity: opacity,
          showTrench: showTrenchCutout && stateMode === 'Construction',
          groundSize,
          lngLatToWorld: mapSurface.lngLatToWorld
        }
      );
      scene.add(result.group);
      activePipelineAnimRef.current = result.updateAnimation || null;
    } else if (project.type === 'Road') {
      scene.add(RoadGenerator.generate(project, { mode: stateMode, undergroundOpacity: opacity }));
    } else if (project.type === 'Drainage') {
      scene.add(DrainageGenerator.generate(
        { ...project, depthMeters: project.depthMeters ?? 3.2 },
        { mode: stateMode, undergroundOpacity: opacity, groundSize, lngLatToWorld: mapSurface.lngLatToWorld }
      ));
    } else if (['Telecom', 'Electrical', 'Cable'].includes(project.type)) {
      scene.add(CableGenerator.generate(
        { ...project, depthMeters: project.depthMeters ?? 1.8 },
        { mode: stateMode, undergroundOpacity: opacity, groundSize, lngLatToWorld: mapSurface.lngLatToWorld }
      ));
    } else {
      const result = PipelineGenerator.generate(
        { ...project, depthMeters: depthM },
        {
          mode: stateMode,
          depthSliderMeters: depthM,
          undergroundOpacity: opacity,
          showTrench: false,
          groundSize,
          lngLatToWorld: mapSurface.lngLatToWorld
        }
      );
      scene.add(result.group);
      activePipelineAnimRef.current = result.updateAnimation || null;
    }

    // 3. GPR RADAR ANOMALIES
    if (showGPR) {
      store.getGPRSurveys().forEach(s => s.anomalies.forEach((a, i) => {
        const g = new THREE.Group(); g.name = `GPR_${a.id}`;
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xbf5af2, emissive: 0x6025b5, emissiveIntensity: 0.6, roughness: 0.2 })
        );
        const { x, z } = mapSurface.lngLatToWorld(a.longitude, a.latitude);
        m.position.set(x + (i - 1) * 3, -a.depthMeters, z);
        m.userData = {
          objectType: `GPR Anomaly: ${a.name}`,
          depth: a.depthMeters,
          status: `Confidence: ${a.confidence}%`
        };
        g.add(m);
        scene.add(g);
      }));
    }
  }, [selectedId, stateMode, depthM, heightM, ugOpacity, surfaceOpacity, basemapStyle, showTrenchCutout, showUG, showBoundary, showSuper, showContext, showGPR]);

  const setCamPreset = (p: 'iso' | 'top' | 'cut' | 'street') => {
    const presets = {
      iso:    { radius: 46, theta: Math.PI / 4,  phi: Math.PI / 3,   ty: -2 },
      top:    { radius: 52, theta: 0,            phi: 0.05,          ty: 0  },
      cut:    { radius: 38, theta: 0,            phi: Math.PI / 2,   ty: -4 },
      street: { radius: 24, theta: Math.PI / 6,  phi: Math.PI / 2.2, ty: 1  },
    }[p];
    sph.current = { radius: presets.radius, theta: presets.theta, phi: presets.phi };
    target.current.set(0, presets.ty, 0);
    moveCam();
  };

  const typeColor = getProjectTypeColor(project.type);
  const statusColor = project.status === 'Active' ? '#1a7f37' : project.status === 'Approved' ? '#0071e3' : project.status === 'Completed' ? '#5856d6' : project.status === 'Delayed' ? '#c2411b' : '#9a6700';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', fontFamily: F, position: 'relative' }}>

      {/* ── TOP FROSTED TOOLBAR ── */}
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
              {project.locationName}
              <span style={{ margin: '0 5px', color: 'rgba(0,0,0,0.2)' }}>·</span>
              <span style={{ fontFamily: 'SF Mono, ui-monospace, monospace', color: '#0071e3' }}>
                {project.latitude.toFixed(5)}°N {project.longitude.toFixed(5)}°E
              </span>
              <span style={{ margin: '0 5px', color: 'rgba(0,0,0,0.2)' }}>·</span>
              <span style={{ color: '#ff6b00', fontWeight: 600 }}>
                {((project.lengthMeters ?? 3500) / 1000).toFixed(1)} km corridor
              </span>
            </div>
          </div>
        </div>

        {/* Center: Segmented Control (Orange Glass) */}
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.88) 0%, rgba(255, 237, 213, 0.75) 100%)',
          backdropFilter: 'blur(28px) saturate(210%)',
          WebkitBackdropFilter: 'blur(28px) saturate(210%)',
          borderRadius: '980px',
          padding: '4px 5px',
          gap: '3px',
          border: '1.5px solid rgba(255, 149, 0, 0.35)',
          boxShadow: '0 6px 24px -2px rgba(255, 107, 0, 0.16)'
        }}>
          {([['2d','2D Map'],['3d','3D Spatial Twin'],['split','Split View']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setViewMode(id as any)} style={segmentedStyle(viewMode === id)}>{label}</button>
          ))}
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          <div style={{
            display: 'flex',
            background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.9) 0%, rgba(255, 237, 213, 0.75) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '980px',
            padding: '3px 4px',
            gap: '2px',
            border: '1.5px solid rgba(255, 149, 0, 0.35)'
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
                background: stateMode === m ? 'linear-gradient(180deg, #ff7a00 0%, #ff5500 100%)' : 'transparent',
                color: stateMode === m ? '#fff' : '#515154',
                transition: 'all 0.15s',
                boxShadow: stateMode === m ? '0 2px 8px rgba(255, 107, 0, 0.4)' : 'none'
              }}>{m}</button>
            ))}
          </div>

          <div style={{ width: '1px', height: '20px', background: 'rgba(255, 149, 0, 0.3)' }} />

          <button onClick={() => setShowLayers(v => !v)} style={{
            padding: '6px 14px',
            borderRadius: '980px',
            border: showLayers ? '1.5px solid #ff6b00' : '1px solid rgba(255, 149, 0, 0.3)',
            background: showLayers ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 255, 255, 0.85)',
            color: showLayers ? '#ff6b00' : '#1d1d1f',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: F,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(255, 149, 0, 0.08)'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
            </svg>
            Layers
          </button>

          <button onClick={() => setShowDetails(v => !v)} style={{
            padding: '6px 14px',
            borderRadius: '980px',
            border: showDetails ? '1.5px solid #ff6b00' : '1px solid rgba(255, 149, 0, 0.3)',
            background: showDetails ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 255, 255, 0.85)',
            color: showDetails ? '#ff6b00' : '#1d1d1f',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: F,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(255, 149, 0, 0.08)'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Details
          </button>
        </div>
      </div>

      {/* ── MAIN VIEWPORT AREA ── */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {(viewMode === '2d' || viewMode === 'split') && (
          <div style={{ flex: 1, borderRight: viewMode === 'split' ? '1px solid rgba(255, 255, 255, 0.8)' : 'none', position: 'relative' }}>
            <Project2DMapBoundary project={project} onSwitchTo3D={() => setViewMode('3d')} />
          </div>
        )}
        {(viewMode === '3d' || viewMode === 'split') && (
          <div ref={containerRef} style={{ flex: 1, cursor: 'grab' }} />
        )}

        {/* ── LEFT FROSTED SIDEBAR: 2D Surface Map & Subsurface Pipe Controls ── */}
        {(viewMode === '3d' || viewMode === 'split') && (
          <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 30, maxHeight: 'calc(100% - 32px)', overflowY: 'auto', paddingRight: '4px' }}>

            {/* 1. 2D Map Surface Theme & X-Ray Cutout */}
            <div style={{ ...glassPanelStyle, padding: '14px 16px', minWidth: '260px' }}>
              <div style={sectionLabel}>2D Ground Surface Map</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '10px' }}>
                {(['street', 'satellite', 'cad'] as BasemapStyle[]).map(style => (
                  <button
                    key={style}
                    onClick={() => setBasemapStyle(style)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '8px',
                      border: basemapStyle === style ? '1.5px solid #ff6b00' : '1px solid rgba(0,0,0,0.08)',
                      background: basemapStyle === style ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 255, 255, 0.75)',
                      color: basemapStyle === style ? '#ff6b00' : '#1d1d1f',
                      fontSize: '11px',
                      fontWeight: basemapStyle === style ? 700 : 500,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {style === 'cad' ? 'CAD Grid' : style}
                  </button>
                ))}
              </div>

              {/* Surface Opacity Slider */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#1d1d1f', fontWeight: 600 }}>Surface Opacity</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0071e3', fontFamily: 'monospace' }}>
                  {Math.round(surfaceOpacity * 100)}%
                </span>
              </div>
              <input
                type="range" min="0.0" max="1.0" step="0.05" value={surfaceOpacity}
                onChange={e => setSurfaceOpacity(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#0071e3', cursor: 'pointer' }}
              />

              {/* Trench Cutout Button */}
              <button
                onClick={() => setShowTrenchCutout(v => !v)}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: showTrenchCutout ? '1px solid #16a34a' : '1px solid rgba(0,0,0,0.1)',
                  background: showTrenchCutout ? 'rgba(22, 163, 74, 0.12)' : 'rgba(255, 255, 255, 0.75)',
                  color: showTrenchCutout ? '#15803d' : '#515154',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: showTrenchCutout ? '#16a34a' : '#86868b' }} />
                {showTrenchCutout ? 'Trench Cutout Opened' : 'Trench Cutout Closed'}
              </button>
            </div>

            {/* 2. Subsurface Depth Slider */}
            <div style={{ ...glassPanelStyle, padding: '14px 16px', minWidth: '260px' }}>
              <div style={sectionLabel}>Subsurface Pipe Depth</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#1d1d1f', fontWeight: 600 }}>Trench Invert</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#9a6700', fontFamily: 'SF Mono, ui-monospace, monospace' }}>–{depthM.toFixed(1)} m</span>
              </div>
              <input type="range" min="1.0" max="10" step="0.5" value={depthM}
                onChange={e => setDepthM(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#9a6700', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#86868b', marginTop: '2px' }}>
                <span>1.0 m (Shallow)</span><span>10.0 m (Deep Piles)</span>
              </div>
            </div>

            {/* 3. Real 3–5 KM Route Chainage Navigator & Fly-Through */}
            {project.stations && project.stations.length > 0 && (
              <div style={{ ...glassPanelStyle, padding: '14px 16px', minWidth: '260px' }}>
                <div style={sectionLabel}>3–5 KM Route Fly-Through</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  <button
                    onClick={() => focusOnStation(null)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: activeStationIndex === null ? '1px solid #ff6b00' : '1px solid rgba(0,0,0,0.08)',
                      background: activeStationIndex === null ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 255, 255, 0.75)',
                      color: activeStationIndex === null ? '#ff6b00' : '#1d1d1f',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Full Corridor
                  </button>
                  {project.stations.map((st, idx) => (
                    <button
                      key={idx}
                      onClick={() => focusOnStation(idx)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: activeStationIndex === idx ? '1px solid #ff6b00' : '1px solid rgba(0,0,0,0.08)',
                        background: activeStationIndex === idx ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 255, 255, 0.75)',
                        color: activeStationIndex === idx ? '#ff6b00' : '#1d1d1f',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      KM {st.km.toFixed(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Camera Angle Presets */}
            <div style={{ ...glassPanelStyle, padding: '14px 16px' }}>
              <div style={sectionLabel}>Camera Angle</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                {[['iso','Perspective'],['top','Top View'],['cut','Cross Section'],['street','Street Level']].map(([k, l]) => (
                  <button key={k} onClick={() => setCamPreset(k as any)} style={{
                    padding: '7px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    background: 'rgba(255, 255, 255, 0.75)',
                    color: '#1d1d1f',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: F,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)')}
                  >{l}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── RIGHT DRAWER: Layers ── */}
        {showLayers && (
          <div style={{ position: 'absolute', top: '20px', right: '20px', width: '280px', ...glassPanelStyle, overflow: 'hidden', zIndex: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 12px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>GIS Layers</span>
              <button onClick={() => setShowLayers(false)} style={{ background: 'rgba(0, 0, 0, 0.05)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '11px', color: '#515154', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {[
              { label: '2D Map Surface',      sub: 'Cartographic ground texture', state: surfaceOpacity > 0, set: () => setSurfaceOpacity(v => v > 0 ? 0 : 0.92), dot: '#ff6b00' },
              { label: 'Project Boundary',   sub: 'Geographic polygon cutout', state: showBoundary, set: setShowBoundary, dot: '#0071e3' },
              { label: 'Underground Pipeline', sub: 'Extruded 3–5 km tube',      state: showUG,       set: setShowUG,       dot: '#0284c7' },
              { label: 'Trench Excavation',   sub: 'Open cutaway & safety tape', state: showTrenchCutout, set: setShowTrenchCutout, dot: '#d97706' },
              { label: 'Proposed Superstructure', sub: 'Above-ground elements', state: showSuper,    set: setShowSuper,    dot: '#1a7f37' },
              { label: 'Crossing Utilities',  sub: 'Gas, power & fiber clearances', state: showContext, set: setShowContext, dot: '#dc2626' },
              { label: 'GPR Radar Scan',      sub: 'Subsurface anomaly detection', state: showGPR,      set: setShowGPR,      dot: '#5856d6' },
            ].map((layer, i, arr) => (
              <div key={i} onClick={() => layer.set(!layer.state)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', cursor: 'pointer',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(0, 0, 0, 0.04)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: layer.dot, opacity: layer.state ? 1 : 0.35, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 500, color: layer.state ? '#1d1d1f' : '#86868b' }}>{layer.label}</div>
                    <div style={{ fontSize: '10.5px', color: '#86868b', marginTop: '1px' }}>{layer.sub}</div>
                  </div>
                </div>
                <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: layer.state ? '#ff6b00' : 'rgba(0, 0, 0, 0.15)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: '2px', left: layer.state ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RIGHT DRAWER: Details ── */}
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
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.25 }}>{project.name}</div>
            </div>
            {[
              ['Tender', project.tenderNumber],
              ['Corridor Length', `${((project.lengthMeters ?? 3500) / 1000).toFixed(2)} km`],
              ['Type', project.type],
              ['Diameter', project.diameterMm ? `${project.diameterMm} mm` : '—'],
              ['Material', project.material || 'Ductile Iron (K9)'],
              ['Depth', project.depthMeters ? `${project.depthMeters} m` : '—'],
              ['Budget', formatINR(project.budget)],
              ['Contractor', project.contractor],
              ['Location', project.locationName],
              ['Ward', project.wardOrRegion],
              ['Coordinates', `${project.latitude.toFixed(5)}°N, ${project.longitude.toFixed(5)}°E`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 18px', borderTop: '1px solid rgba(0, 0, 0, 0.04)' }}>
                <span style={{ fontSize: '11.5px', color: '#86868b', flexShrink: 0, marginRight: '10px' }}>{k}</span>
                <span style={{ fontSize: '11.5px', color: '#1d1d1f', textAlign: 'right', wordBreak: 'break-word', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── BOTTOM HUD & SUBSURFACE TELEMETRY ── */}
        <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 20px 16px', pointerEvents: 'none', zIndex: 30 }}>
          
          {/* Left Telemetry Status */}
          <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
            <div style={{ ...glassPanelStyle, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '9.5px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase' }}>Surface Basemap</div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#ff6b00', textTransform: 'capitalize' }}>{basemapStyle} Layer</div>
              </div>
              <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.08)' }} />
              <div>
                <div style={{ fontSize: '9.5px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase' }}>Route Alignment</div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0071e3', fontFamily: 'monospace' }}>
                  {((project.lengthMeters ?? 3500) / 1000).toFixed(2)} KM Under 2D Map
                </div>
              </div>
              <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.08)' }} />
              <div>
                <div style={{ fontSize: '9.5px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase' }}>Excavation Invert</div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#15803d', fontFamily: 'monospace' }}>–{depthM.toFixed(1)}m</div>
              </div>
            </div>
          </div>

          {/* Inspected Element Modal */}
          {inspected && (
            <div style={{ ...glassPanelStyle, padding: '14px 18px', maxWidth: '440px', pointerEvents: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{inspected.type}</div>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#1d1d1f', marginTop: '2px' }}>{inspected.name}</div>
                  {inspected.status && <div style={{ fontSize: '11.5px', color: '#515154', marginTop: '3px' }}>{inspected.status}</div>}
                  <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: '12px' }}>
                    {inspected.depth !== undefined && <span style={{ color: '#515154' }}>Depth <strong style={{ color: '#9a6700' }}>–{inspected.depth}m</strong></span>}
                    {inspected.clearance !== undefined && <span style={{ color: '#515154' }}>Clearance <strong style={{ color: '#15803d' }}>+{inspected.clearance.toFixed(1)}m</strong></span>}
                    {inspected.project && <span style={{ color: '#515154' }}>Budget <strong style={{ color: '#0071e3' }}>{formatINR(inspected.project.budget)}</strong></span>}
                  </div>
                </div>
                <button onClick={() => setInspected(null)} style={{ background: 'rgba(0, 0, 0, 0.05)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', flexShrink: 0, fontSize: '11px', color: '#515154', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            </div>
          )}

          <div style={{ fontSize: '11.5px', color: '#515154', background: 'rgba(255, 255, 255, 0.85)', padding: '5px 12px', borderRadius: '8px', backdropFilter: 'blur(20px)', border: '1px solid rgba(0, 0, 0, 0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            Drag to Orbit · Scroll to Zoom · Click Pipe / Stations to Inspect
          </div>
        </div>
      </div>
    </div>
  );
};
