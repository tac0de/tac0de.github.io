import * as THREE from 'three';

export class CollisionWorld {
  readonly walls: THREE.Mesh[] = [];

  addWall(mesh: THREE.Mesh): THREE.Mesh {
    this.walls.push(mesh);
    return mesh;
  }

  removeWall(mesh: THREE.Mesh): void {
    const index = this.walls.indexOf(mesh);
    if (index >= 0) {
      this.walls.splice(index, 1);
    }
  }

  canMoveTo(nextPosition: THREE.Vector3): boolean {
    const radius = 0.45;
    const playerPoint = new THREE.Vector3(nextPosition.x, 1.2, nextPosition.z);

    for (const wall of this.walls) {
      if (!wall.visible) continue;

      const box = new THREE.Box3().setFromObject(wall);
      const closestPoint = box.clampPoint(playerPoint, new THREE.Vector3());

      if (closestPoint.distanceTo(playerPoint) < radius) {
        return false;
      }
    }

    return true;
  }
}