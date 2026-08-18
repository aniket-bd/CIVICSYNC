import * as THREE from 'three';
import { Project } from '../../../types/project';
import { MapTileBounds, getProjectPolygonMetrics, getCalibratedProjectDimensions } from '../tenderMapGround';

export class BuildingGenerator {
  /**
   * Generates procedural 3D Building Structure with Floors, Facade, Foundation, and Basement
   * calibrated strictly to the project's tender polygon boundary and physical meter metrics.
   */
  public static generate(
    project: Project,
    options: {
      mode: 'Existing' | 'Construction' | 'Completed';
      undergroundOpacity: number;
      depthSliderMeters: number;
      bounds?: MapTileBounds;
    }
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `Building_${project.id}`;

    let centerX = 0;
    let centerZ = 0;
    let bWidth = 6.5;
    let bDepth = 5.2;
    let excavationDepth = Math.max(1.0, (project.depthMeters ?? 4.8) * 0.5);
    let totalHeight = 8.5;
    const floors = project.buildingFloors ?? Math.max(3, Math.round((project.heightMeters ?? 24) / 4));

    if (options.bounds) {
      const metrics = getProjectPolygonMetrics(project, options.bounds);
      const dims = getCalibratedProjectDimensions(project, metrics);
      centerX = metrics.centerX;
      centerZ = metrics.centerZ;
      bWidth = dims.widthScene;
      bDepth = dims.lengthScene;
      totalHeight = dims.heightScene;
      excavationDepth = dims.depthScene;
    }

    const floorHeight = totalHeight / floors;

    // ── 1. Underground Basement & Deep Foundation (Y: -excavationDepth to 0) ──
    const foundationGeo = new THREE.BoxGeometry(bWidth + 0.6, excavationDepth, bDepth + 0.6);
    const foundationMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.92,
      metalness: 0.1,
      transparent: true,
      opacity: options.undergroundOpacity,
    });
    const foundationMesh = new THREE.Mesh(foundationGeo, foundationMat);
    foundationMesh.position.set(centerX, -excavationDepth / 2, centerZ);
    foundationMesh.userData = { project, objectType: 'Basement & Deep Raft Foundation', depth: project.depthMeters };
    group.add(foundationMesh);

    // Bored Foundation Piles extending into bedrock
    const pileGeo = new THREE.CylinderGeometry(0.35, 0.35, 3.5, 16);
    const pileMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 });
    [
      { x: -bWidth / 2 + 0.2, z: -bDepth / 2 + 0.2 },
      { x: bWidth / 2 - 0.2,  z: -bDepth / 2 + 0.2 },
      { x: -bWidth / 2 + 0.2, z: bDepth / 2 - 0.2 },
      { x: bWidth / 2 - 0.2,  z: bDepth / 2 - 0.2 },
      { x: 0, z: 0 },
    ].forEach(pos => {
      const pile = new THREE.Mesh(pileGeo, pileMat);
      pile.position.set(centerX + pos.x, -excavationDepth - 1.75, centerZ + pos.z);
      group.add(pile);
    });

    // ── 2. Above-Ground Superstructure ──
    if (options.mode === 'Construction') {
      // Construction Mode: Concrete structural skeleton, slabs, columns, and rooftop tower crane
      for (let f = 0; f < floors; f++) {
        const slabY = (f + 1) * floorHeight;
        const slabGeo = new THREE.BoxGeometry(bWidth, 0.22, bDepth);
        const slabMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
        const slab = new THREE.Mesh(slabGeo, slabMat);
        slab.position.set(centerX, slabY, centerZ);
        group.add(slab);

        // Columns for this floor
        const colGeo = new THREE.BoxGeometry(0.4, floorHeight, 0.4);
        const colMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
        [
          { x: -bWidth / 2 + 0.3, z: -bDepth / 2 + 0.3 },
          { x: bWidth / 2 - 0.3,  z: -bDepth / 2 + 0.3 },
          { x: -bWidth / 2 + 0.3, z: bDepth / 2 - 0.3 },
          { x: bWidth / 2 - 0.3,  z: bDepth / 2 - 0.3 },
          { x: 0, z: 0 },
        ].forEach(pos => {
          const col = new THREE.Mesh(colGeo, colMat);
          col.position.set(centerX + pos.x, slabY - floorHeight / 2, centerZ + pos.z);
          group.add(col);
        });

        // Safety perimeter netting on active upper floors
        if (f >= floors - 2) {
          const netGeo = new THREE.BoxGeometry(bWidth + 0.1, floorHeight * 0.8, bDepth + 0.1);
          const netMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true, transparent: true, opacity: 0.35 });
          const net = new THREE.Mesh(netGeo, netMat);
          net.position.set(centerX, slabY - floorHeight / 2, centerZ);
          group.add(net);
        }
      }

      // Proportional Tower Crane on rooftop
      const craneHeight = 4.5;
      const craneTowerGeo = new THREE.BoxGeometry(0.5, craneHeight, 0.5);
      const craneMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
      const craneTower = new THREE.Mesh(craneTowerGeo, craneMat);
      craneTower.position.set(centerX, totalHeight + craneHeight / 2, centerZ);
      group.add(craneTower);

      const jibLength = bWidth * 1.1;
      const craneJibGeo = new THREE.BoxGeometry(jibLength, 0.35, 0.35);
      const craneJib = new THREE.Mesh(craneJibGeo, craneMat);
      craneJib.position.set(centerX + jibLength * 0.2, totalHeight + craneHeight, centerZ);
      group.add(craneJib);
    } else {
      // Completed / Proposed Mode: Architectural Glass Facade with mullions and rooftop features
      const mainBuildingGeo = new THREE.BoxGeometry(bWidth, totalHeight, bDepth);
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Architectural Cyan-Blue Glass
        metalness: 0.88,
        roughness: 0.12,
        transparent: true,
        opacity: 0.82,
      });
      const buildingMesh = new THREE.Mesh(mainBuildingGeo, glassMat);
      buildingMesh.position.set(centerX, totalHeight / 2, centerZ);
      buildingMesh.userData = {
        project,
        objectType: `Proposed Institutional Complex (${floors} Floors, ${project.heightMeters ?? 28}m)`,
        height: project.heightMeters,
        depth: project.depthMeters,
      };
      buildingMesh.castShadow = true;
      buildingMesh.receiveShadow = true;
      group.add(buildingMesh);

      // Floor Band Accents (Horizontal architectural mullions)
      for (let f = 1; f <= floors; f++) {
        const bandGeo = new THREE.BoxGeometry(bWidth + 0.12, 0.16, bDepth + 0.12);
        const bandMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.set(centerX, f * floorHeight, centerZ);
        group.add(band);
      }

      // Vertical architectural fins on front & back facades
      const finCount = 5;
      const finMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 });
      for (let i = 0; i <= finCount; i++) {
        const fx = -bWidth / 2 + (i / finCount) * bWidth;
        const finGeo = new THREE.BoxGeometry(0.1, totalHeight, 0.18);
        const finF = new THREE.Mesh(finGeo, finMat);
        finF.position.set(centerX + fx, totalHeight / 2, centerZ + bDepth / 2 + 0.04);
        const finB = new THREE.Mesh(finGeo, finMat);
        finB.position.set(centerX + fx, totalHeight / 2, centerZ - bDepth / 2 - 0.04);
        group.add(finF, finB);
      }

      // Ground Floor Entrance Canopy / Portico
      const canopyGeo = new THREE.BoxGeometry(bWidth * 0.45, 0.15, 1.4);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(centerX, 1.2, centerZ + bDepth / 2 + 0.7);
      group.add(canopy);

      // Rooftop MEP & Solar PV Canopy
      const roofMepGeo = new THREE.BoxGeometry(bWidth * 0.5, 1.0, bDepth * 0.5);
      const roofMepMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
      const roofMep = new THREE.Mesh(roofMepGeo, roofMepMat);
      roofMep.position.set(centerX, totalHeight + 0.5, centerZ);
      group.add(roofMep);

      const solarCanopyGeo = new THREE.PlaneGeometry(bWidth * 0.45, bDepth * 0.4);
      solarCanopyGeo.rotateX(-Math.PI / 2.3);
      const solarMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.9, roughness: 0.1 });
      const solarCanopy = new THREE.Mesh(solarCanopyGeo, solarMat);
      solarCanopy.position.set(centerX, totalHeight + 1.2, centerZ);
      group.add(solarCanopy);
    }

    return group;
  }
}
