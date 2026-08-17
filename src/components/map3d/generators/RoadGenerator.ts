import * as THREE from 'three';
import { Project } from '../../../types/project';

export class RoadGenerator {
  /**
   * Generates procedural 3D Road with Asphalt Layer, Sub-base strata, Curbs, and Lane Markings
   */
  public static generate(
    project: Project,
    options: {
      mode: 'Existing' | 'Construction' | 'Completed';
      undergroundOpacity: number;
    }
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `Road_${project.id}`;

    const length = Math.min(60, (project.lengthMeters ?? 2000) / 40);
    const width = Math.max(6.0, project.widthMeters ?? 14.0);
    const asphaltThickness = 0.4;
    const subBaseThickness = 0.6;

    // 1. Asphalt Surface Layer (Y = 0 to -0.4m)
    const asphaltGeo = new THREE.BoxGeometry(length, asphaltThickness, width);
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: options.mode === 'Construction' ? 0x27272a : 0x18181b, // Fresh dense black asphalt or milled surface
      roughness: 0.9,
      metalness: 0.1
    });

    const asphaltMesh = new THREE.Mesh(asphaltGeo, asphaltMat);
    asphaltMesh.position.set(0, -asphaltThickness / 2, 0);
    asphaltMesh.receiveShadow = true;
    asphaltMesh.userData = { project, objectType: 'Bituminous Macadam Wearing Course' };
    group.add(asphaltMesh);

    // 2. Granular Sub-base (GSB) Layer (Y = -0.4m to -1.0m)
    const subBaseGeo = new THREE.BoxGeometry(length, subBaseThickness, width * 1.05);
    const subBaseMat = new THREE.MeshStandardMaterial({
      color: 0x713f12, // Compacted gravel brown
      roughness: 0.95,
      transparent: true,
      opacity: options.undergroundOpacity
    });
    const subBaseMesh = new THREE.Mesh(subBaseGeo, subBaseMat);
    subBaseMesh.position.set(0, -asphaltThickness - (subBaseThickness / 2), 0);
    group.add(subBaseMesh);

    // 3. Concrete Curbs / Kerb Stones
    const curbGeo = new THREE.BoxGeometry(length, 0.3, 0.4);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });

    const leftCurb = new THREE.Mesh(curbGeo, curbMat);
    leftCurb.position.set(0, 0.15, width / 2);
    group.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeo, curbMat);
    rightCurb.position.set(0, 0.15, -width / 2);
    group.add(rightCurb);

    // 4. Center Line Dashed Road Markings (Surface Y = +0.01)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Traffic yellow
    for (let x = -length / 2 + 2; x < length / 2; x += 4) {
      const lineGeo = new THREE.PlaneGeometry(2.0, 0.25);
      lineGeo.rotateX(-Math.PI / 2);
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(x, 0.02, 0);
      group.add(line);
    }

    return group;
  }
}
