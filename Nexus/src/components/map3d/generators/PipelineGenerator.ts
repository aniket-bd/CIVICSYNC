import * as THREE from 'three';
import { Project } from '../../../types/project';
import { MapTileBounds, getProjectPolygonMetrics, getCalibratedProjectDimensions } from '../tenderMapGround';

export interface Generated3DResult {
  group: THREE.Group;
  pipeMesh?: THREE.Mesh;
  trenchMesh?: THREE.Mesh;
  manholes: THREE.Mesh[];
  warningRibbon?: THREE.Mesh;
}

export class PipelineGenerator {
  /**
   * Generates procedural 3D Pipe, Excavation Trench, and Manhole Shafts
   * calibrated strictly to tender bounds, diameter, and map scale.
   */
  public static generate(
    project: Project,
    options: {
      mode: 'Existing' | 'Construction' | 'Completed';
      depthSliderMeters: number;
      undergroundOpacity: number;
      showTrench: boolean;
      bounds?: MapTileBounds;
    }
  ): Generated3DResult {
    const group = new THREE.Group();
    group.name = `Pipeline_${project.id}`;

    let centerX = 0;
    let centerZ = 0;
    let length = 18;
    let width = 1.8;
    let depth = Math.max(1.2, options.depthSliderMeters ?? project.depthMeters ?? 4.5);

    if (options.bounds) {
      const metrics = getProjectPolygonMetrics(project, options.bounds);
      const dims = getCalibratedProjectDimensions(project, metrics);
      centerX = metrics.centerX;
      centerZ = metrics.centerZ;
      length = dims.lengthScene;
      width = dims.widthScene;
      depth = dims.depthScene;
    }

    const diameterMm = project.diameterMm ?? 600;
    const pipeRadius = Math.max(0.12, Math.min(0.35, (diameterMm / 1000) * 0.3));

    // Color based on status / type
    const pipeColor = project.status === 'Delayed' ? 0xf43f5e : 0x06b6d4; // Cyan or Rose if delayed

    // 1. Pipe Cylindrical Mesh at Depth
    const pipeY = -depth;
    const pipeGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, length, 32);
    pipeGeo.rotateZ(Math.PI / 2); // align along X axis

    const pipeMat = new THREE.MeshStandardMaterial({
      color: pipeColor,
      metalness: 0.7,
      roughness: 0.3,
      transparent: true,
      opacity: options.undergroundOpacity,
      wireframe: false
    });

    const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
    pipeMesh.position.set(centerX, pipeY, centerZ);
    pipeMesh.castShadow = true;
    pipeMesh.receiveShadow = true;
    pipeMesh.userData = { project, objectType: 'Water Pipeline', depth };
    group.add(pipeMesh);

    // Pipe Joint Flanges / Collars every few meters
    const collarGeo = new THREE.CylinderGeometry(pipeRadius * 1.18, pipeRadius * 1.18, 0.25, 24);
    collarGeo.rotateZ(Math.PI / 2);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });

    for (let x = -length / 2 + 3; x < length / 2; x += 6) {
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.position.set(centerX + x, pipeY, centerZ);
      group.add(collar);
    }

    // 2. Inspection Manhole Shafts connecting surface (Y=0) to pipe depth (Y=-depth)
    const manholes: THREE.Mesh[] = [];
    const manholeGeo = new THREE.CylinderGeometry(0.45, 0.45, depth, 24);
    const manholeMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Precast concrete gray
      roughness: 0.8,
      transparent: true,
      opacity: options.undergroundOpacity * 0.85
    });

    [-length * 0.3, 0, length * 0.3].forEach(ox => {
      const px = centerX + ox;
      const manhole = new THREE.Mesh(manholeGeo, manholeMat);
      manhole.position.set(px, -depth / 2, centerZ);
      manhole.userData = { project, objectType: 'Inspection Chamber Manhole', depth };
      group.add(manhole);
      manholes.push(manhole);

      // Manhole cast iron cover at surface
      const coverGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 24);
      const coverMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.4 });
      const cover = new THREE.Mesh(coverGeo, coverMat);
      cover.position.set(px, 0.04, centerZ);
      group.add(cover);
    });

    // 3. Construction Excavation Trench (Visible in 'Construction' mode or when showTrench is on)
    let trenchMesh: THREE.Mesh | undefined;
    if (options.mode === 'Construction' || (options.showTrench && options.mode !== 'Existing')) {
      const trenchGeo = new THREE.BoxGeometry(length * 1.02, depth, width);
      const trenchMat = new THREE.MeshStandardMaterial({
        color: 0x854d0e, // Soil excavation brown
        roughness: 0.9,
        transparent: true,
        opacity: 0.35,
        wireframe: false
      });

      trenchMesh = new THREE.Mesh(trenchGeo, trenchMat);
      trenchMesh.position.set(centerX, -depth / 2, centerZ);
      trenchMesh.userData = { project, objectType: 'Open Cut Trench', depth };
      group.add(trenchMesh);

      // Safety Warning Ribbon at 0.6m below ground
      const ribbonGeo = new THREE.PlaneGeometry(length, 0.2);
      ribbonGeo.rotateX(-Math.PI / 2);
      const ribbonMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8, // Blue utility warning tape
        side: THREE.DoubleSide
      });
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbon.position.set(centerX, -0.6, centerZ);
      group.add(ribbon);

      // Construction Warning Cones / Barricades on surface
      const coneGeo = new THREE.ConeGeometry(0.18, 0.5, 16);
      const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316 }); // Orange safety cone
      for (let x = -length / 2 + 1.5; x < length / 2; x += 3.0) {
        const cone1 = new THREE.Mesh(coneGeo, coneMat);
        cone1.position.set(centerX + x, 0.25, centerZ + width / 2 + 0.3);
        const cone2 = new THREE.Mesh(coneGeo, coneMat);
        cone2.position.set(centerX + x, 0.25, centerZ - width / 2 - 0.3);
        group.add(cone1, cone2);
      }
    }

    return {
      group,
      pipeMesh,
      trenchMesh,
      manholes
    };
  }
}
