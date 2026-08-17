import * as THREE from 'three';
import { Project } from '../../../types/project';

export class BridgeGenerator {
  /**
   * Generates procedural 3D Bridge / Flyover with Deck, Piers, Foundations, and Railings
   */
  public static generate(
    project: Project,
    options: {
      mode: 'Existing' | 'Construction' | 'Completed';
      undergroundOpacity: number;
    }
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `Bridge_${project.id}`;

    const length = Math.min(60, (project.lengthMeters ?? 620) / 10);
    const deckWidth = 14;
    const deckHeight = 8.5; // elevated deck 8.5m above ground
    const foundationDepth = project.depthMeters ?? 4.5;

    // 1. Elevated Road Deck (Y = +deckHeight)
    const deckGeo = new THREE.BoxGeometry(length, 1.2, deckWidth);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85
    });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.set(0, deckHeight, 0);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    deckMesh.userData = { project, objectType: 'Prestressed Concrete Flyover Deck' };
    group.add(deckMesh);

    // Safety Railings on left & right of deck
    const railGeo = new THREE.BoxGeometry(length, 1.1, 0.3);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xec4899, metalness: 0.7, roughness: 0.3 });

    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(0, deckHeight + 0.9, deckWidth / 2 - 0.15);
    group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(0, deckHeight + 0.9, -deckWidth / 2 + 0.15);
    group.add(rightRail);

    // 2. Concrete Pier Columns (Y: 0 to +deckHeight)
    const pierPositions = [-length / 3, 0, length / 3];
    const pierGeo = new THREE.CylinderGeometry(1.4, 1.6, deckHeight, 24);
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });

    pierPositions.forEach(x => {
      const pier = new THREE.Mesh(pierGeo, pierMat);
      pier.position.set(x, deckHeight / 2, 0);
      pier.castShadow = true;
      group.add(pier);

      // Pier Cap Hammerhead
      const capGeo = new THREE.BoxGeometry(3.5, 1.2, deckWidth * 0.9);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(x, deckHeight - 0.6, 0);
      group.add(cap);

      // 3. Subsurface Pile Cap Foundation (Y: -foundationDepth to 0)
      const pileCapGeo = new THREE.BoxGeometry(5.0, 1.8, 5.0);
      const pileCapMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.95,
        transparent: true,
        opacity: options.undergroundOpacity
      });
      const pileCap = new THREE.Mesh(pileCapGeo, pileCapMat);
      pileCap.position.set(x, -0.9, 0);
      group.add(pileCap);

      // Bored Pile Columns deep into bedrock
      const boredPileGeo = new THREE.CylinderGeometry(0.8, 0.8, foundationDepth * 1.5, 16);
      const boredPile = new THREE.Mesh(boredPileGeo, pileCapMat);
      boredPile.position.set(x, -foundationDepth, 0);
      group.add(boredPile);
    });

    return group;
  }
}
