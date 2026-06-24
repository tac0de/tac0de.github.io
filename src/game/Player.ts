import * as THREE from 'three';
import type { InputState } from './types';
import type { CollisionWorld } from '../world/CollisionWorld';

export class Player {
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private movement = new THREE.Vector3();

  constructor(
    private camera: THREE.PerspectiveCamera,
    private input: InputState,
    private collision: CollisionWorld
  ) {}

  update(delta: number): void {
    const speed = this.input.sprint ? 5.2 : 3.15;

    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    this.forward.normalize();

    this.right.crossVectors(this.forward, this.camera.up).normalize();

    let moveForward = 0;
    let moveRight = 0;

    if (this.input.forward) moveForward += 1;
    if (this.input.backward) moveForward -= 1;
    if (this.input.right) moveRight += 1;
    if (this.input.left) moveRight -= 1;

    const length = Math.hypot(moveForward, moveRight);
    if (length <= 0) return;

    moveForward /= length;
    moveRight /= length;

    this.movement.set(0, 0, 0);
    this.movement.addScaledVector(this.forward, moveForward * speed * delta);
    this.movement.addScaledVector(this.right, moveRight * speed * delta);

    const nextX = this.camera.position.clone();
    nextX.x += this.movement.x;

    if (this.collision.canMoveTo(nextX)) {
      this.camera.position.x = nextX.x;
    }

    const nextZ = this.camera.position.clone();
    nextZ.z += this.movement.z;

    if (this.collision.canMoveTo(nextZ)) {
      this.camera.position.z = nextZ.z;
    }
  }
}