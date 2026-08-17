import * as THREE from 'three';
import { Project } from '../../../types/project';

export class BuildingGenerator {
  /**
   * Generates procedural 3D Building Structure with Floors, Facade, Foundation, and Basement
   */
  public static generate(
    project: Project,
    options: {
      mode: 'Existing' | 'Construction' | 'Completed';
      undergroundOpacity: number;
      depthSliderMeters: number;
    }
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `Building_${project.id}`;

    const floors = project.buildingFloors ?? 6;
    const height = project.heightMeters ?? (floors * 4.0); // ~4m per story
    const depth = project.depthMeters ?? 4.8;
    const buildingWidth = 28;
    const buildingDepth = 18;

    // 1. Underground Deep Basement & Raft Foundation (Y: -depth to 0)
    const foundationGeo = new THREE.BoxGeometry(buildingWidth + 2, depth, buildingDepth + 2);
    const foundationMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Concrete foundation gray
      roughness: 0.9,
      transparent: true,
      opacity: options.undergroundOpacity
    });
    const foundationMesh = new THREE.Mesh(foundationGeo, foundationMat);
    foundationMesh.position.set(0, -depth / 2, 0);
    foundationMesh.userData = { project, objectType: 'Basement & Deep Raft Foundation' };
    group.add(foundationMesh);

    // Bored Foundation Piles extending into bedrock (Y: -depth to -depth-6)
    const pileGeo = new THREE.CylinderGeometry(0.6, 0.6, 6, 16);
    const pileMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 });
    [
      { x: -buildingWidth / 2, z: -buildingDepth / 2 },
      { x: buildingWidth / 2, z: -buildingDepth / 2 },
      { x: -buildingWidth / 2, z: buildingDepth / 2 },
      { x: buildingWidth / 2, z: buildingDepth / 2 },
      { x: 0, z: 0 }
    ].forEach(pos => {
      const pile = new THREE.Mesh(pileGeo, pileMat);
      pile.position.set(pos.x, -depth - 3, pos.z);
      group.add(pile);
    });

    // 2. Above-Ground Superstructure (Y: 0 to +height)
    if (options.mode === 'Construction') {
      // In Construction mode: show structural concrete skeleton + crane on roof
      const floorHeight = height / floors;
      for (let f = 0; f < floors; f++) {
        const slabY = (f + 1) * floorHeight;
        const slabGeo = new THREE.BoxGeometry(buildingWidth, 0.4, buildingDepth);
        const slabMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
        const slab = new THREE.Mesh(slabGeo, slabMat);
        slab.position.set(0, slabY, 0);
        group.add(slab);

        // Columns for each floor
        const colGeo = new THREE.BoxGeometry(0.8, floorHeight, 0.8);
        const colMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
        [
          { x: -buildingWidth / 2 + 1, z: -buildingDepth / 2 + 1 },
          { x: buildingWidth / 2 - 1, z: -buildingDepth / 2 + 1 },
          { x: -buildingWidth / 2 + 1, z: buildingDepth / 2 - 1 },
          { x: buildingWidth / 2 - 1, z: buildingDepth / 2 - 1 },
          { x: 0, z: 0 }
        ].forEach(pos => {
          const col = new THREE.Mesh(colGeo, colMat);
          col.position.set(pos.x, slabY - floorHeight / 2, pos.z);
          group.add(col);
        });
      }

      // Tower Crane on top
      const craneTowerGeo = new THREE.BoxGeometry(1.2, 10, 1.2);
      const craneMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b }); // Construction Yellow
      const craneTower = new THREE.Mesh(craneTowerGeo, craneMat);
      craneTower.position.set(0, height + 5, 0);
      group.add(craneTower);

      const craneJibGeo = new THREE.BoxGeometry(22, 0.8, 0.8);
      const craneJib = new THREE.Mesh(craneJibGeo, craneMat);
      craneJib.position.set(6, height + 10, 0);
      group.add(craneJib);
    } else {
      // Completed / Proposed Mode: Modern Glass & Composite Facade
      const mainBuildingGeo = new THREE.BoxGeometry(buildingWidth, height, buildingDepth);
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Cyan-blue architectural glass
        metalness: 0.85,
        roughness: 0.15,
        transparent: true,
        opacity: 0.85
      });
      const buildingMesh = new THREE.Mesh(mainBuildingGeo, glassMat);
      buildingMesh.position.set(0, height / 2, 0);
      buildingMesh.userData = { project, objectType: `Proposed Institutional Complex (${floors} Floors, ${height}m Height)` };
      buildingMesh.castShadow = true;
      buildingMesh.receiveShadow = true;
      group.add(buildingMesh);

      // Floor Band Accents (Horizontal architectural mullions)
      const floorHeight = height / floors;
      for (let f = 1; f <= floors; f++) {
        const bandGeo = new THREE.BoxGeometry(buildingWidth + 0.3, 0.25, buildingDepth + 0.3);
        const bandMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.set(0, f * floorHeight, 0);
        group.add(band);
      }

      // Rooftop MEP & Solar Canopy
      const roofMepGeo = new THREE.BoxGeometry(buildingWidth * 0.4, 2.5, buildingDepth * 0.4);
      const roofMepMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
      const roofMep = new THREE.Mesh(roofMepGeo, roofMepMat);
      roofMep.position.set(0, height + 1.25, 0);
      group.add(roofMep);
    }

    return group;
  }
}
