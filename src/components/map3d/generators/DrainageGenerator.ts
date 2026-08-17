import * as THREE from 'three';
import { Project } from '../../../types/project';

export class DrainageGenerator {
  /**
   * Generates procedural 3D Precast Concrete Box Culvert and Catch Basins following the 3-5 km Route
   */
  public static generate(
    project: Project,
    options: {
      mode: 'Existing' | 'Construction' | 'Completed';
      undergroundOpacity: number;
      groundSize?: number;
      lngLatToWorld?: (lng: number, lat: number) => { x: number; z: number };
    }
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `Drainage_${project.id}`;

    const depth = project.depthMeters ?? 3.2;
    const groundSize = options.groundSize ?? 140;

    const spanDeg = 0.026;
    const minLng = project.longitude - spanDeg / 2;
    const maxLng = project.longitude + spanDeg / 2;
    const minLat = project.latitude - spanDeg / 2;
    const maxLat = project.latitude + spanDeg / 2;

    const defaultLngLatToWorld = (lng: number, lat: number) => {
      const u = (lng - minLng) / (maxLng - minLng);
      const v = (lat - minLat) / (maxLat - minLat);
      const x = (u - 0.5) * groundSize;
      const z = -(v - 0.5) * groundSize;
      return { x, z };
    };

    const toWorld = options.lngLatToWorld || defaultLngLatToWorld;

    const rawCoords: number[][] = project.routeGeometry?.type === 'LineString' && (project.routeGeometry.coordinates as number[][]).length > 1
      ? (project.routeGeometry.coordinates as number[][])
      : [
          [project.longitude - 0.008, project.latitude - 0.007],
          [project.longitude - 0.003, project.latitude - 0.003],
          [project.longitude + 0.002, project.latitude + 0.002],
          [project.longitude + 0.008, project.latitude + 0.007],
        ];

    const curvePoints: THREE.Vector3[] = rawCoords.map(([lng, lat]) => {
      const { x, z } = toWorld(lng, lat);
      return new THREE.Vector3(x, -depth + 0.9, z);
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.2);

    // 1. Box Culvert extruded along curve
    const culvertGeo = new THREE.TubeGeometry(curve, 120, 1.2, 4, false); // 4 sides = rectangular box
    const culvertMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald tint on precast concrete
      roughness: 0.85,
      metalness: 0.1,
      transparent: true,
      opacity: options.undergroundOpacity,
    });

    const culvertMesh = new THREE.Mesh(culvertGeo, culvertMat);
    culvertMesh.userData = { project, objectType: 'Precast Concrete Box Culvert (2400x1800mm)', depth };
    group.add(culvertMesh);

    // 2. Storm Inlet Catch Basins & Grates along route
    const basinGeo = new THREE.BoxGeometry(1.4, depth, 1.4);
    const basinMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      transparent: true,
      opacity: options.undergroundOpacity * 0.9
    });
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x6e6e73, metalness: 0.85, roughness: 0.3 });
    const grateGeo = new THREE.PlaneGeometry(1.4, 1.0).rotateX(-Math.PI / 2);

    curvePoints.forEach((pt, idx) => {
      const basin = new THREE.Mesh(basinGeo, basinMat);
      basin.position.set(pt.x, -depth / 2, pt.z);
      basin.userData = { project, objectType: `Stormwater Catch Basin #${idx + 1}` };
      group.add(basin);

      const grate = new THREE.Mesh(grateGeo, grateMat);
      grate.position.set(pt.x, 0.05, pt.z);
      group.add(grate);
    });

    return group;
  }
}
