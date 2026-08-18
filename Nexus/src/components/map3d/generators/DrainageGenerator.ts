import * as THREE from 'three';
import { Project } from '../../../types/project';
import { MapTileBounds, getProjectPolygonMetrics, getCalibratedProjectDimensions } from '../tenderMapGround';

export class DrainageGenerator {
  /**
   * Generates procedural 3D Precast Concrete Box Culvert and Catch Basins
   * calibrated strictly to tender bounds, dimensions, and map scale.
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
    group.name = `Drainage_${project.id}`;

    let centerX = 0;
    let centerZ = 0;
    let length = 18;
    let boxWidth = 1.2;
    let depth = 2.4;

    if (options.bounds) {
      const metrics = getProjectPolygonMetrics(project, options.bounds);
      const dims = getCalibratedProjectDimensions(project, metrics);
      centerX = metrics.centerX;
      centerZ = metrics.centerZ;
      length = dims.lengthScene;
      boxWidth = dims.widthScene;
      depth = dims.depthScene;
    }

    const boxHeight = Math.max(0.8, Math.min(1.4, boxWidth * 0.75));

    // 1. Concrete Outer Box Culvert at Invert Depth
    const culvertY = -depth + (boxHeight / 2);
    const outerBoxGeo = new THREE.BoxGeometry(length, boxHeight, boxWidth);
    const culvertMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald tint on concrete
      roughness: 0.85,
      metalness: 0.1,
      transparent: true,
      opacity: options.undergroundOpacity
    });

    const culvertMesh = new THREE.Mesh(outerBoxGeo, culvertMat);
    culvertMesh.position.set(centerX, culvertY, centerZ);
    culvertMesh.userData = { project, objectType: 'Precast Concrete Box Culvert', depth: project.depthMeters };
    group.add(culvertMesh);

    // 2. Storm Inlet Catch Basins & Grates
    const basinGeo = new THREE.BoxGeometry(0.7, depth - (boxHeight / 2), 0.7);
    const basinMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      transparent: true,
      opacity: options.undergroundOpacity * 0.9
    });

    for (let x = -length / 2 + 3; x < length / 2; x += 6) {
      const basin = new THREE.Mesh(basinGeo, basinMat);
      basin.position.set(centerX + x, -depth / 2, centerZ + boxWidth / 2);
      group.add(basin);

      // Steel Grate at Surface
      const grateGeo = new THREE.PlaneGeometry(0.7, 0.5);
      grateGeo.rotateX(-Math.PI / 2);
      const grateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.3 });
      const grate = new THREE.Mesh(grateGeo, grateMat);
      grate.position.set(centerX + x, 0.03, centerZ + boxWidth / 2);
      group.add(grate);
    }

    return group;
  }
}
