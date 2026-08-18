import * as THREE from 'three';
import { Project } from '../../../types/project';
import { MapTileBounds, getProjectPolygonMetrics, getCalibratedProjectDimensions } from '../tenderMapGround';

export class CableGenerator {
  /**
   * Generates procedural 3D Multi-duct Telecom / Electrical Conduits & Splice Vaults
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
    group.name = `Cable_${project.id}`;

    let centerX = 0;
    let centerZ = 0;
    let length = 18;
    let depth = 1.2;

    if (options.bounds) {
      const metrics = getProjectPolygonMetrics(project, options.bounds);
      const dims = getCalibratedProjectDimensions(project, metrics);
      centerX = metrics.centerX;
      centerZ = metrics.centerZ;
      length = dims.lengthScene;
      depth = dims.depthScene;
    }

    const ductRadius = 0.055; // calibrated duct size

    const color = project.type === 'Electrical' ? 0xeab308 : 0x8b5cf6; // Yellow for power, Violet for telecom

    // 1. 4-Way Multi-Duct Bank (arranged in 2x2 grid)
    const ductGeo = new THREE.CylinderGeometry(ductRadius, ductRadius, length, 16);
    ductGeo.rotateZ(Math.PI / 2);

    const ductMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.5,
      transparent: true,
      opacity: options.undergroundOpacity
    });

    const offsets = [
      { y: -depth - 0.08, z: -0.1 },
      { y: -depth - 0.08, z: 0.1 },
      { y: -depth + 0.08, z: -0.1 },
      { y: -depth + 0.08, z: 0.1 }
    ];

    offsets.forEach((off, idx) => {
      const duct = new THREE.Mesh(ductGeo, ductMat);
      duct.position.set(centerX, off.y, centerZ + off.z);
      duct.userData = { project, objectType: `Conduit Duct #${idx + 1}`, depth };
      group.add(duct);
    });

    // 2. Concrete Splice Pull-Boxes / Vaults
    const vaultGeo = new THREE.BoxGeometry(1.0, depth, 0.8);
    const vaultMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      transparent: true,
      opacity: options.undergroundOpacity * 0.9
    });

    for (let x = -length / 2 + 4; x < length / 2; x += 8) {
      const vault = new THREE.Mesh(vaultGeo, vaultMat);
      vault.position.set(centerX + x, -depth / 2, centerZ);
      group.add(vault);

      // Surface Access Cover
      const coverGeo = new THREE.BoxGeometry(0.9, 0.06, 0.7);
      const coverMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
      const cover = new THREE.Mesh(coverGeo, coverMat);
      cover.position.set(centerX + x, 0.03, centerZ);
      group.add(cover);
    }

    return group;
  }
}
