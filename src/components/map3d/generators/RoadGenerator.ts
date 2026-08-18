import * as THREE from 'three';
import { Project } from '../../../types/project';
import {
  MapTileBounds,
  getProjectPolygonMetrics,
  getCalibratedProjectDimensions,
  getProjectCorridorOrientation,
} from '../tenderMapGround';

export class RoadGenerator {
  /**
   * Generates procedural 3D Road with full physical meter calibration,
   * corridor orientation matching the 2D polygon, accurate width (e.g. 5m),
   * and true 5m excavation depth during Construction mode.
   */
  public static generate(
    project: Project,
    options: {
      mode: 'Existing' | 'Construction' | 'Completed';
      undergroundOpacity: number;
      bounds?: MapTileBounds;
    }
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `Road_${project.id}`;

    let centerX = 0;
    let centerZ = 0;
    let length = 24;
    let width = 3.2;
    let depthM = 0.5;
    let angleRad = 0;

    if (options.bounds) {
      const metrics = getProjectPolygonMetrics(project, options.bounds);
      const dims = getCalibratedProjectDimensions(project, metrics);
      const corridor = getProjectCorridorOrientation(metrics, dims.widthScene);

      centerX = corridor.centerX;
      centerZ = corridor.centerZ;
      length = Math.max(dims.lengthScene, corridor.lengthScene);
      width = corridor.widthScene;
      depthM = dims.depthScene;
      angleRad = corridor.angleRad;
    }

    // Corridor transform pivot
    const roadPivot = new THREE.Group();
    roadPivot.position.set(centerX, 0, centerZ);
    roadPivot.rotation.y = -angleRad; // Rotate to match corridor direction

    const asphaltThickness = Math.max(0.12, Math.min(0.35, depthM * 0.15));
    const subBaseThickness = Math.max(0.25, Math.min(0.8, depthM * 0.3));

    // ─────────────────────────────────────────────────────────────────────────
    // 1. CONSTRUCTION MODE: Deep Excavation Trench (-depthM to 0)
    // ─────────────────────────────────────────────────────────────────────────
    if (options.mode === 'Construction') {
      const trenchWidth = width * 1.12;
      const trenchLength = length * 1.01;

      // 1A. Excavation Trench Box Volume
      const trenchGeo = new THREE.BoxGeometry(trenchLength, depthM, trenchWidth);
      const trenchMat = new THREE.MeshStandardMaterial({
        color: 0x78350f, // Deep excavation earth/clay
        roughness: 0.96,
        metalness: 0.05,
        transparent: true,
        opacity: Math.max(0.35, options.undergroundOpacity * 0.7),
        side: THREE.DoubleSide,
      });
      const trenchMesh = new THREE.Mesh(trenchGeo, trenchMat);
      trenchMesh.position.set(0, -depthM / 2, 0);
      trenchMesh.userData = { project, objectType: 'Subsurface Road Excavation Trench', depth: project.depthMeters ?? 5.0 };
      roadPivot.add(trenchMesh);

      // 1B. Trench Bedrock Floor at -depthM
      const floorGeo = new THREE.PlaneGeometry(trenchLength, trenchWidth);
      floorGeo.rotateX(-Math.PI / 2);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 1.0 });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(0, -depthM + 0.02, 0);
      floorMesh.userData = { project, objectType: 'Excavation Subgrade Bedrock Floor', depth: project.depthMeters ?? 5.0 };
      roadPivot.add(floorMesh);

      // 1C. Steel Sheet Piling & Shoring Side Walls
      const shoringMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.75, roughness: 0.35 });
      const leftShoring = new THREE.Mesh(new THREE.BoxGeometry(trenchLength, depthM, 0.1), shoringMat);
      leftShoring.position.set(0, -depthM / 2, trenchWidth / 2);
      roadPivot.add(leftShoring);

      const rightShoring = new THREE.Mesh(new THREE.BoxGeometry(trenchLength, depthM, 0.1), shoringMat);
      rightShoring.position.set(0, -depthM / 2, -trenchWidth / 2);
      roadPivot.add(rightShoring);

      // 1D. Subsurface Multi-Utility Ducts & Sleeves at -depthM (5m deep)
      const ductMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
      const ductGeo = new THREE.CylinderGeometry(0.18, 0.18, trenchLength, 16);
      ductGeo.rotateZ(Math.PI / 2);

      const duct1 = new THREE.Mesh(ductGeo, ductMat);
      duct1.position.set(0, -depthM * 0.85, width * 0.25);
      duct1.userData = { project, objectType: '5m Depth Storm & Utility Duct Sleeve' };
      roadPivot.add(duct1);

      const duct2 = new THREE.Mesh(ductGeo, ductMat);
      duct2.position.set(0, -depthM * 0.85, -width * 0.25);
      duct2.userData = { project, objectType: '5m Depth High-Voltage Power Conduit' };
      roadPivot.add(duct2);

      // 1E. Compacted Granular Sub-Base (GSB) Layer
      const gsbGeo = new THREE.BoxGeometry(length * 0.7, subBaseThickness, width);
      const gsbMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.9 });
      const gsbMesh = new THREE.Mesh(gsbGeo, gsbMat);
      gsbMesh.position.set(-length * 0.12, -asphaltThickness - subBaseThickness / 2, 0);
      roadPivot.add(gsbMesh);

      // 1F. Milled / Partially Paved Asphalt Section
      const partialAsphaltGeo = new THREE.BoxGeometry(length * 0.5, asphaltThickness, width);
      const partialAsphaltMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85 });
      const partialAsphaltMesh = new THREE.Mesh(partialAsphaltGeo, partialAsphaltMat);
      partialAsphaltMesh.position.set(-length * 0.22, -asphaltThickness / 2, 0);
      roadPivot.add(partialAsphaltMesh);

      // 1G. Construction Safety Barricades & Cones
      const coneMat = new THREE.MeshStandardMaterial({ color: 0xea580c }); // Safety orange
      const coneGeo = new THREE.ConeGeometry(0.2, 0.55, 12);

      const step = Math.max(2.5, length / 12);
      for (let x = -length / 2 + 1; x <= length / 2 - 1; x += step) {
        const c1 = new THREE.Mesh(coneGeo, coneMat);
        c1.position.set(x, 0.28, width / 2 + 0.35);
        roadPivot.add(c1);

        const c2 = new THREE.Mesh(coneGeo, coneMat);
        c2.position.set(x, 0.28, -width / 2 - 0.35);
        roadPivot.add(c2);
      }

      // 1H. Road Paver / Heavy Roller Equipment Marker
      const paverBody = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.4, width * 0.85),
        new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.5 }) // CAT Yellow
      );
      paverBody.position.set(length * 0.15, 0.7, 0);
      paverBody.userData = { project, objectType: 'Vögele Super Asphalt Paver Machine' };
      roadPivot.add(paverBody);

      const rollerDrum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, width * 0.8, 16),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 })
      );
      rollerDrum.rotateX(Math.PI / 2);
      rollerDrum.position.set(length * 0.15 + 1.4, 0.45, 0);
      roadPivot.add(rollerDrum);
    } else {
      // ─────────────────────────────────────────────────────────────────────────
      // 2. COMPLETED / EXISTING MODE: Finished Pavement Surface & Markings
      // ─────────────────────────────────────────────────────────────────────────
      const asphaltGeo = new THREE.BoxGeometry(length, asphaltThickness, width);
      const asphaltMat = new THREE.MeshStandardMaterial({
        color: options.mode === 'Completed' ? 0x18181b : 0x3f3f46,
        roughness: 0.88,
        metalness: 0.12,
      });

      const asphaltMesh = new THREE.Mesh(asphaltGeo, asphaltMat);
      asphaltMesh.position.set(0, -asphaltThickness / 2, 0);
      asphaltMesh.receiveShadow = true;
      asphaltMesh.userData = { project, objectType: 'Bituminous Carriageway Pavement', width: project.widthMeters ?? 5.0 };
      roadPivot.add(asphaltMesh);

      // Sub-base beneath finished road
      const subBaseGeo = new THREE.BoxGeometry(length, subBaseThickness, width * 1.05);
      const subBaseMat = new THREE.MeshStandardMaterial({
        color: 0x713f12,
        roughness: 0.95,
        transparent: true,
        opacity: options.undergroundOpacity,
      });
      const subBaseMesh = new THREE.Mesh(subBaseGeo, subBaseMat);
      subBaseMesh.position.set(0, -asphaltThickness - subBaseThickness / 2, 0);
      roadPivot.add(subBaseMesh);

      // Raised Concrete Curbs
      const curbGeo = new THREE.BoxGeometry(length, 0.2, 0.18);
      const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });

      const leftCurb = new THREE.Mesh(curbGeo, curbMat);
      leftCurb.position.set(0, 0.09, width / 2 + 0.09);
      roadPivot.add(leftCurb);

      const rightCurb = new THREE.Mesh(curbGeo, curbMat);
      rightCurb.position.set(0, 0.09, -width / 2 - 0.09);
      roadPivot.add(rightCurb);

      // Dashed Centerline Markings (Traffic Yellow)
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const dashStep = 3.5;
      for (let x = -length / 2 + 1.5; x < length / 2; x += dashStep) {
        const lineGeo = new THREE.PlaneGeometry(1.8, Math.min(0.18, width * 0.04));
        lineGeo.rotateX(-Math.PI / 2);
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(x, 0.02, 0);
        roadPivot.add(line);
      }

      // Continuous White Edge Lines
      const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const leftEdgeGeo = new THREE.PlaneGeometry(length, Math.min(0.15, width * 0.035));
      leftEdgeGeo.rotateX(-Math.PI / 2);
      const leftEdge = new THREE.Mesh(leftEdgeGeo, edgeMat);
      leftEdge.position.set(0, 0.02, width / 2 - 0.2);
      roadPivot.add(leftEdge);

      const rightEdge = new THREE.Mesh(leftEdgeGeo.clone(), edgeMat);
      rightEdge.position.set(0, 0.02, -width / 2 + 0.2);
      roadPivot.add(rightEdge);

      // Subsurface Utility Conduit Vault at -depthM
      if (depthM > 0.6) {
        const pipeGeo = new THREE.CylinderGeometry(0.2, 0.2, length, 16);
        pipeGeo.rotateZ(Math.PI / 2);
        const pipeMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          metalness: 0.8,
          roughness: 0.25,
          transparent: true,
          opacity: options.undergroundOpacity,
        });
        const pipe = new THREE.Mesh(pipeGeo, pipeMat);
        pipe.position.set(0, -depthM, 0);
        pipe.userData = { project, objectType: 'Subsurface Utility Corridor Conduit', depth: project.depthMeters ?? 5.0 };
        roadPivot.add(pipe);
      }
    }

    group.add(roadPivot);
    return group;
  }
}
