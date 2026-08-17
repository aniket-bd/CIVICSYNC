import * as THREE from 'three';
import { Project, ProjectCrossingUtility } from '../../../types/project';

export interface Generated3DResult {
  group: THREE.Group;
  pipeMesh?: THREE.Mesh;
  trenchMesh?: THREE.Mesh | THREE.Group;
  manholes: THREE.Mesh[];
  curve: THREE.CatmullRomCurve3;
  flowParticles?: THREE.Points;
  updateAnimation?: (deltaSeconds: number) => void;
}

export class PipelineGenerator {
  /**
   * Generates a procedural 3D Pipeline following the real 3-5 km Route Geometry beneath the 2D Map Surface
   */
  public static generate(
    project: Project,
    options: {
      mode: 'Existing' | 'Construction' | 'Completed';
      depthSliderMeters: number;
      undergroundOpacity: number;
      showTrench: boolean;
      groundSize?: number;
      lngLatToWorld?: (lng: number, lat: number) => { x: number; z: number };
    }
  ): Generated3DResult {
    const group = new THREE.Group();
    group.name = `Pipeline_${project.id}`;

    const depth = options.depthSliderMeters || project.depthMeters || 5.0;
    const diameterMm = project.diameterMm ?? 600;
    const pipeRadius = Math.max(0.2, (diameterMm / 1000) / 2); // in 3D units (meters)
    const groundSize = options.groundSize ?? 140;

    // ─────────────────────────────────────────────────────────────
    // 1. EXTRACT 3-5 KM ROUTE COORDINATES & BUILD 3D CURVE
    // ─────────────────────────────────────────────────────────────
    const spanDeg = 0.026;
    const minLng = project.longitude - spanDeg / 2;
    const maxLng = project.longitude + spanDeg / 2;
    const minLat = project.latitude - spanDeg / 2;
    const maxLat = project.latitude + spanDeg / 2;

    const defaultLngLatToWorld = (lng: number, lat: number) => {
      const u = (lng - minLng) / (maxLng - minLng);
      const v = (lat - minLat) / (maxLat - minLat);
      const x = (u - 0.5) * groundSize;
      const z = -(v - 0.5) * groundSize;
      return { x, z };
    };

    const toWorld = options.lngLatToWorld || defaultLngLatToWorld;

    const rawCoords: number[][] = project.routeGeometry?.type === 'LineString' && (project.routeGeometry.coordinates as number[][]).length > 1
      ? (project.routeGeometry.coordinates as number[][])
      : [
          [project.longitude - 0.009, project.latitude - 0.008],
          [project.longitude - 0.005, project.latitude - 0.004],
          [project.longitude - 0.001, project.latitude - 0.001],
          [project.longitude + 0.004, project.latitude + 0.003],
          [project.longitude + 0.009, project.latitude + 0.008],
        ];

    const curvePoints: THREE.Vector3[] = rawCoords.map(([lng, lat]) => {
      const { x, z } = toWorld(lng, lat);
      return new THREE.Vector3(x, -depth, z);
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.2);

    // ─────────────────────────────────────────────────────────────
    // 2. EXTRUDED 3D TUBE GEOMETRY ALONG REAL ROUTE
    // ─────────────────────────────────────────────────────────────
    const pipeColor = project.status === 'Delayed' ? 0xf43f5e : project.type === 'Sewerage' ? 0x9333ea : 0x0284c7;
    const tubeGeo = new THREE.TubeGeometry(curve, 180, pipeRadius, 24, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: pipeColor,
      metalness: 0.65,
      roughness: 0.25,
      transparent: true,
      opacity: options.undergroundOpacity,
    });

    const pipeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    pipeMesh.castShadow = true;
    pipeMesh.receiveShadow = true;
    pipeMesh.userData = {
      project,
      objectType: `${project.type} Pipeline (${diameterMm}mm ${project.material || 'Ductile Iron'})`,
      depth,
      length: project.lengthMeters
    };
    group.add(pipeMesh);

    // ─────────────────────────────────────────────────────────────
    // 3. FLANGE COLLAR RINGS ALONG 3-5 KM CURVE
    // ─────────────────────────────────────────────────────────────
    const collarGeo = new THREE.CylinderGeometry(pipeRadius * 1.25, pipeRadius * 1.25, 0.4, 20);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      metalness: 0.85,
      roughness: 0.2,
      transparent: true,
      opacity: options.undergroundOpacity
    });

    const numCollars = 28;
    for (let i = 1; i < numCollars; i++) {
      const t = i / numCollars;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);

      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.position.copy(pt);
      collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      group.add(collar);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. VERTICAL INSPECTION MANHOLES & VALVE SHAFTS
    // ─────────────────────────────────────────────────────────────
    const manholes: THREE.Mesh[] = [];
    const manholeMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Precast concrete gray
      roughness: 0.85,
      transparent: true,
      opacity: options.undergroundOpacity * 0.9
    });
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x48484a, // Cast iron warm gray (Apple system gray)
      metalness: 0.85,
      roughness: 0.35
    });

    // Place manholes at curve waypoints / stations
    curvePoints.forEach((pt, idx) => {
      const shaftHeight = depth;
      const manholeGeo = new THREE.CylinderGeometry(0.85, 0.85, shaftHeight, 20);
      const shaft = new THREE.Mesh(manholeGeo, manholeMat);
      shaft.position.set(pt.x, -shaftHeight / 2, pt.z);
      shaft.userData = {
        project,
        objectType: `Inspection Chamber Shaft #MH-${idx + 1}`,
        depth,
        location: `Station #${idx + 1}`
      };
      group.add(shaft);
      manholes.push(shaft);

      // Cast iron manhole cover on 2D surface (Y = +0.06)
      const coverGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.12, 24);
      const cover = new THREE.Mesh(coverGeo, coverMat);
      cover.position.set(pt.x, 0.06, pt.z);
      cover.userData = {
        project,
        objectType: `Surface Manhole Cover (Station #${idx + 1})`
      };
      group.add(cover);

      // Warning Ring on surface around cover
      const ringGeo = new THREE.RingGeometry(1.05, 1.35, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(pt.x, 0.08, pt.z);
      group.add(ring);
    });

    // ─────────────────────────────────────────────────────────────
    // 5. EXCAVATED TRENCH BEDDING & SAFETY BARRIERS
    // ─────────────────────────────────────────────────────────────
    const trenchGroup = new THREE.Group();
    trenchGroup.name = 'TrenchGroup';

    if (options.mode === 'Construction' || options.showTrench) {
      // Procedural trench bounding channel along the curve
      const trenchMat = new THREE.MeshStandardMaterial({
        color: 0x78350f, // Soil excavation brown
        roughness: 0.95,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide
      });

      const trenchWidth = Math.max(3.2, project.widthMeters ?? 4.0);
      const trenchRibbonGeo = new THREE.TubeGeometry(curve, 120, trenchWidth / 2, 8, false);
      const trenchMesh = new THREE.Mesh(trenchRibbonGeo, trenchMat);
      trenchMesh.scale.set(1, 0.7, 1);
      trenchMesh.position.y = depth * 0.2;
      trenchGroup.add(trenchMesh);

      // Safety Warning Tape Ribbon at 1.0m below 2D surface
      const ribbonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
      const ribbonPoints = curvePoints.map(p => new THREE.Vector3(p.x, -1.0, p.z));
      const ribbonCurve = new THREE.CatmullRomCurve3(ribbonPoints, false, 'catmullrom', 0.2);
      const ribbonGeo = new THREE.TubeGeometry(ribbonCurve, 100, 0.15, 6, false);
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      trenchGroup.add(ribbon);

      // Orange Safety Barricade Cones along surface perimeter
      const coneGeo = new THREE.ConeGeometry(0.35, 0.9, 14);
      const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const pt = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        const coneLeft = new THREE.Mesh(coneGeo, coneMat);
        coneLeft.position.set(pt.x + normal.x * (trenchWidth / 2 + 0.8), 0.45, pt.z + normal.z * (trenchWidth / 2 + 0.8));
        trenchGroup.add(coneLeft);

        const coneRight = new THREE.Mesh(coneGeo, coneMat);
        coneRight.position.set(pt.x - normal.x * (trenchWidth / 2 + 0.8), 0.45, pt.z - normal.z * (trenchWidth / 2 + 0.8));
        trenchGroup.add(coneRight);
      }

      group.add(trenchGroup);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. CROSSING UNDERGROUND UTILITIES
    // ─────────────────────────────────────────────────────────────
    const defaultCrossings: ProjectCrossingUtility[] = project.crossings || [
      {
        id: 'cr-default-1',
        name: '150mm MNGL Gas Distribution Line',
        type: 'Gas Pipeline',
        depthMeters: 1.8,
        clearanceMeters: depth - 1.8,
        lat: project.latitude,
        lng: project.longitude,
        clashStatus: 'Clear'
      },
      {
        id: 'cr-default-2',
        name: '33kV High-Tension Underground Power Cable',
        type: 'Power Cable (11kV/33kV)',
        depthMeters: 1.4,
        clearanceMeters: depth - 1.4,
        lat: project.latitude + 0.002,
        lng: project.longitude + 0.002,
        clashStatus: 'Clear'
      }
    ];

    defaultCrossings.forEach((cross) => {
      const crossDepth = cross.depthMeters || 1.8;
      const crossColor = cross.type === 'Gas Pipeline' ? 0xfacc15 : cross.type.includes('Power') ? 0xef4444 : 0x10b981;

      const crossGeo = new THREE.CylinderGeometry(0.22, 0.22, 28, 16);
      crossGeo.rotateZ(Math.PI / 2);
      const crossMat = new THREE.MeshStandardMaterial({
        color: crossColor,
        metalness: 0.7,
        roughness: 0.3,
        transparent: true,
        opacity: options.undergroundOpacity
      });

      const crossMesh = new THREE.Mesh(crossGeo, crossMat);
      const { x, z } = toWorld(cross.lng, cross.lat);
      crossMesh.position.set(x, -crossDepth, z);
      crossMesh.rotateY(Math.PI / 3); // Crossing angle
      crossMesh.userData = {
        project,
        objectType: `Crossing Utility: ${cross.name}`,
        depth: crossDepth,
        clearance: cross.clearanceMeters,
        status: cross.clashStatus
      };
      group.add(crossMesh);

      // Floating Clash Ring Marker
      const clashColor = cross.clashStatus === 'Critical Collision' ? 0xdc2626 : cross.clashStatus === 'Warning' ? 0xf59e0b : 0x10b981;
      const clashRingGeo = new THREE.TorusGeometry(0.8, 0.08, 12, 24);
      const clashRingMat = new THREE.MeshBasicMaterial({ color: clashColor });
      const clashRing = new THREE.Mesh(clashRingGeo, clashRingMat);
      clashRing.position.set(x, -crossDepth, z);
      group.add(clashRing);
    });

    // ─────────────────────────────────────────────────────────────
    // 7. ANIMATED FLUID FLOW PULSES
    // ─────────────────────────────────────────────────────────────
    const numParticles = 120;
    const particlePositions = new Float32Array(numParticles * 3);
    const particleProgress: number[] = [];

    for (let i = 0; i < numParticles; i++) {
      const t = i / numParticles;
      particleProgress.push(t);
      const pt = curve.getPointAt(t);
      particlePositions[i * 3]     = pt.x;
      particlePositions[i * 3 + 1] = pt.y;
      particlePositions[i * 3 + 2] = pt.z;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.8,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const flowParticles = new THREE.Points(particleGeo, particleMat);
    group.add(flowParticles);

    const updateAnimation = (deltaSeconds: number) => {
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const speed = 0.08 * deltaSeconds;

      for (let i = 0; i < numParticles; i++) {
        particleProgress[i] = (particleProgress[i] + speed) % 1.0;
        const pt = curve.getPointAt(particleProgress[i]);
        posAttr.setXYZ(i, pt.x, pt.y, pt.z);
      }
      posAttr.needsUpdate = true;
    };

    return {
      group,
      pipeMesh,
      trenchMesh: trenchGroup,
      manholes,
      curve,
      flowParticles,
      updateAnimation
    };
  }
}
