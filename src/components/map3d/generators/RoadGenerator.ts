import * as THREE from 'three';
import { Project } from '../../../types/project';
import { MapTileBounds, getProjectPolygonMetrics, getCalibratedProjectDimensions } from '../tenderMapGround';

export class RoadGenerator {
  /**
   * Generates procedural 3D Road with Asphalt Layer, Sub-base strata, Curbs, and Lane Markings
   * calibrated strictly to tender bounds and map scale.
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
    let length = 18;
    let width = 3.2;
    let depthM = 0.5;

    if (options.bounds) {
      const metrics = getProjectPolygonMetrics(project, options.bounds);
      const dims = getCalibratedProjectDimensions(project, metrics);
      centerX = metrics.centerX;
      centerZ = metrics.centerZ;
      length = dims.lengthScene;
      width = dims.widthScene;
      depthM = dims.depthScene;
    }

    const asphaltThickness = Math.max(0.18, Math.min(0.3, depthM * 0.4));
    const subBaseThickness = Math.max(0.3, Math.min(0.6, depthM * 0.6));

    // 1. Asphalt Surface Layer (Y = 0 to -0.25m)
    const asphaltGeo = new THREE.BoxGeometry(length, asphaltThickness, width);
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: options.mode === 'Construction' ? 0x27272a : 0x18181b, // Fresh dense black asphalt or milled surface
      roughness: 0.9,
      metalness: 0.1
    });

    const asphaltMesh = new THREE.Mesh(asphaltGeo, asphaltMat);
    asphaltMesh.position.set(centerX, -asphaltThickness / 2, centerZ);
    asphaltMesh.receiveShadow = true;
    asphaltMesh.userData = { project, objectType: 'Bituminous Macadam Wearing Course' };
    group.add(asphaltMesh);

    // 2. Granular Sub-base (GSB) Layer (Y = -0.25m to -0.7m)
    const subBaseGeo = new THREE.BoxGeometry(length, subBaseThickness, width * 1.04);
    const subBaseMat = new THREE.MeshStandardMaterial({
      color: 0x713f12, // Compacted gravel brown
      roughness: 0.95,
      transparent: true,
      opacity: options.undergroundOpacity
    });
    const subBaseMesh = new THREE.Mesh(subBaseGeo, subBaseMat);
    subBaseMesh.position.set(centerX, -asphaltThickness - (subBaseThickness / 2), centerZ);
    group.add(subBaseMesh);

    // 3. Concrete Curbs / Kerb Stones
    const curbGeo = new THREE.BoxGeometry(length, 0.18, 0.15);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });

    const leftCurb = new THREE.Mesh(curbGeo, curbMat);
    leftCurb.position.set(centerX, 0.08, centerZ + width / 2);
    group.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeo, curbMat);
    rightCurb.position.set(centerX, 0.08, centerZ - width / 2);
    group.add(rightCurb);

    // 4. Center Line Dashed Road Markings (Surface Y = +0.01)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Traffic yellow
    for (let x = -length / 2 + 1.5; x < length / 2; x += 3.0) {
      const lineGeo = new THREE.PlaneGeometry(1.4, 0.15);
      lineGeo.rotateX(-Math.PI / 2);
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(centerX + x, 0.02, centerZ);
      group.add(line);
    }

    return group;
  }
}
