import * as THREE from 'three';
import { createBox } from './createBox';
import { PropFactory } from './propFactory';
import type { Materials } from '../world/Materials';
import type { InteractableMesh } from '../game/types';
import type { CollisionWorld } from '../world/CollisionWorld';

export function createHallway(
  scene: THREE.Scene,
  mat: Materials,
  props: PropFactory,
  collision: CollisionWorld,
  interactables: InteractableMesh[]
): void {
  createBox(scene, 0, -0.04, 12.5, 7.4, 0.1, 31, mat.carpet);

  collision.addWall(createBox(scene, -3.9, 1.5, 12.5, 0.4, 3, 31, mat.wall));
  collision.addWall(createBox(scene, 3.9, 1.5, 12.5, 0.4, 3, 31, mat.wall));

  for (let i = 0; i < 6; i++) {
    props.ceilingLight(0, 0.5 + i * 5.2, 0.65);
  }

  const leftDoorZ = [4, 9, 14, 19];
  const rightDoorZ = [6.5, 11.5, 16.5, 21.5];

  for (const z of leftDoorZ) {
    createBox(scene, -3.67, 1.16, z, 0.14, 2.3, 1.8, mat.door);
    props.doorPlate(-3.55, 1.88, z - 0.45, 'left');
  }

  for (const z of rightDoorZ) {
    createBox(scene, 3.67, 1.16, z, 0.14, 2.3, 1.8, mat.door);
    props.doorPlate(3.55, 1.88, z - 0.45, 'right');
  }

  createVending(scene, mat, interactables, 2.95, 1.8);

  props.trash(-2.9, 7.6);

  createBox(scene, -2.2, 0.8, 18.7, 0.7, 1.6, 0.45, mat.metal);
  createBox(scene, -1.55, 0.7, 18.7, 0.55, 1.4, 0.4, mat.metal);
  createBox(scene, -2.2, 1.62, 18.7, 1.3, 0.08, 0.65, mat.paper);
}

function createVending(
  scene: THREE.Scene,
  mat: Materials,
  interactables: InteractableMesh[],
  x: number,
  z: number
): void {
  createBox(scene, x, 1.2, z, 1.05, 2.4, 0.7, mat.neonBlue);
  createBox(scene, x, 1.75, z - 0.37, 0.75, 0.8, 0.05, mat.screen);
  createBox(scene, x + 0.38, 0.95, z - 0.38, 0.18, 0.5, 0.05, mat.black);

  const interactable = createBox(scene, x, 1.3, z - 0.45, 0.9, 1.8, 0.08, mat.screen) as InteractableMesh;
  interactable.userData.type = 'vending';
  interactable.userData.label = '자판기를 확인한다';
  interactable.userData.used = false;
  interactables.push(interactable);

  const light = new THREE.PointLight(0x75c8ff, 0.8, 7, 1.6);
  light.position.set(x, 1.8, z);
  scene.add(light);
}