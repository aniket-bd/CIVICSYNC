import * as THREE from 'three';
import { Project } from '../../../types/project';
import { MapTileBounds, getProjectPolygonMetrics, getCalibratedProjectDimensions } from '../tenderMapGround';

export class BridgeGenerator {
  /**
   * Generates procedural 3D Bridge / Flyover with Deck, Piers, Foundations, and Railings
   * calibrated strictly to tender bounds, meter dimensions, and map scale.
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
    group.name = `Bridge_${project.id}`;

    let centerX = 0;
    let centerZ = 0;
    let length = 16;
    let deckWidth = 3.6;
    let deckHeight = 4.2;
    let foundationDepth = 2.5;

    if (options.bounds) {
      const metrics = getProjectPolygonMetrics(project, options.bounds);
      const dims = getCalibratedProjectDimensions(project, metrics);
      centerX = metrics.centerX;
      centerZ = metrics.centerZ;
      length = dims.lengthScene;
      deckWidth = dims.widthScene;
      deckHeight = dims.heightScene;
      foundationDepth = dims.depthScene;
    }

    // 1. Elevated Road Deck (Y = +deckHeight)
    const deckGeo = new THREE.BoxGeometry(length, 0.45, deckWidth);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85
    });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.set(centerX, deckHeight, centerZ);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    deckMesh.userData = { project, objectType: 'Prestressed Concrete Flyover Deck', height: project.heightMeters };
    group.add(deckMesh);

    // Safety Railings on left & right of deck
    const railGeo = new THREE.BoxGeometry(length, 0.4, 0.1);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xec4899, metalness: 0.7, roughness: 0.3 });

    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(centerX, deckHeight + 0.3, centerZ + deckWidth / 2 - 0.05);
    group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(centerX, deckHeight + 0.3, centerZ - deckWidth / 2 + 0.05);
    group.add(rightRail);

    // 2. Concrete Pier Columns (Y: 0 to +deckHeight)
    const pierOffsets = [-length * 0.3, 0, length * 0.3];
    const pierGeo = new THREE.CylinderGeometry(0.45, 0.55, deckHeight, 20);
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });

    pierOffsets.forEach(ox => {
      const px = centerX + ox;
      const pier = new THREE.Mesh(pierGeo, pierMat);
      pier.position.set(px, deckHeight / 2, centerZ);
      pier.castShadow = true;
      group.add(pier);

      // Pier Cap Hammerhead
      const capGeo = new THREE.BoxGeometry(1.2, 0.4, deckWidth * 0.9);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(px, deckHeight - 0.2, centerZ);
      group.add(cap);

      // 3. Subsurface Pile Cap Foundation (Y: -foundationDepth to 0)
      const pileCapGeo = new THREE.BoxGeometry(1.8, 0.6, 1.8);
      const pileCapMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.95,
        transparent: true,
        opacity: options.undergroundOpacity
      });
      const pileCap = new THREE.Mesh(pileCapGeo, pileCapMat);
      pileCap.position.set(px, -0.3, centerZ);
      group.add(pileCap);

      // Bored Pile Columns deep into bedrock
      const boredPileGeo = new THREE.CylinderGeometry(0.25, 0.25, foundationDepth * 1.4, 16);
      const boredPile = new THREE.Mesh(boredPileGeo, pileCapMat);
      boredPile.position.set(px, -foundationDepth * 0.7, centerZ);
      group.add(boredPile);
    });

    return group;
  }
}
