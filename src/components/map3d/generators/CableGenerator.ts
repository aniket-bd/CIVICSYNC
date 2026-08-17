import * as THREE from 'three';
import { Project } from '../../../types/project';

export class CableGenerator {
  /**
   * Generates procedural 3D Multi-duct Telecom / Electrical Conduits & Splice Vaults along 3-5 km Route
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
    group.name = `Cable_${project.id}`;

    const depth = project.depthMeters ?? 1.8;
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
      return new THREE.Vector3(x, -depth, z);
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.2);
    const color = project.type === 'Electrical' ? 0xeab308 : 0x8b5cf6; // Yellow for power, Violet for telecom

    // 1. 4-Way Multi-Duct Conduits along curve
    const offsets = [
      { y: 0.1, n: 0.15 },
      { y: 0.1, n: -0.15 },
      { y: -0.1, n: 0.15 },
      { y: -0.1, n: -0.15 }
    ];

    const ductMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.6,
      transparent: true,
      opacity: options.undergroundOpacity
    });

    offsets.forEach((off, idx) => {
      const offPoints = curvePoints.map((p, i) => {
        const tangent = i === 0 ? curve.getTangentAt(0) : curve.getTangentAt(i / (curvePoints.length - 1));
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        return new THREE.Vector3(p.x + normal.x * off.n, p.y + off.y, p.z + normal.z * off.n);
      });
      const offCurve = new THREE.CatmullRomCurve3(offPoints, false, 'catmullrom', 0.2);
      const ductGeo = new THREE.TubeGeometry(offCurve, 120, 0.1, 12, false);
      const ductMesh = new THREE.Mesh(ductGeo, ductMat);
      ductMesh.userData = { project, objectType: `${project.type} Conduit Duct #${idx + 1}`, depth };
      group.add(ductMesh);
    });

    // 2. Splice Pull-Box Vaults at Station Nodes
    const vaultGeo = new THREE.BoxGeometry(1.6, depth, 1.2);
    const vaultMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      transparent: true,
      opacity: options.undergroundOpacity * 0.9
    });
    const coverGeo = new THREE.BoxGeometry(1.4, 0.08, 1.0);
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });

    curvePoints.forEach((pt, idx) => {
      const vault = new THREE.Mesh(vaultGeo, vaultMat);
      vault.position.set(pt.x, -depth / 2, pt.z);
      vault.userData = { project, objectType: `Underground Utility Vault #${idx + 1}` };
      group.add(vault);

      const cover = new THREE.Mesh(coverGeo, coverMat);
      cover.position.set(pt.x, 0.04, pt.z);
      group.add(cover);
    });

    return group;
  }
}
