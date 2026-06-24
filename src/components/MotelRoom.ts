import * as THREE from 'three';
import { createBox } from './createBox';
import { createDoor } from './Door';
import { PropFactory } from './PropFactory';
import type { Materials } from '../world/Materials';
import type { InteractableMesh } from '../game/types';
import type { CollisionWorld } from '../world/CollisionWorld';

export function createRoom204(
  scene: THREE.Scene,
  mat: Materials,
  props: PropFactory,
  collision: CollisionWorld,
  interactables: InteractableMesh[]
): void {
  createBox(scene, 8.4, -0.05, 28, 12, 0.1, 12, mat.floor);

  collision.addWall(createBox(scene, 8.4, 1.5, 22, 12, 3, 0.4, mat.wall));
  collision.addWall(createBox(scene, 8.4, 1.5, 34, 12, 3, 0.4, mat.wall));
  collision.addWall(createBox(scene, 14.4, 1.5, 28, 0.4, 3, 12, mat.wall));
  collision.addWall(createBox(scene, 2.4, 1.5, 25.2, 0.4, 3, 6, mat.wall));
  collision.addWall(createBox(scene, 2.4, 1.5, 31.6, 0.4, 3, 4.8, mat.wall));

  const door204 = createDoor(scene, {
    type: 'door-204',
    label: '204호 문을 연다',
    x: 2.42,
    y: 1.2,
    z: 28,
    material: mat.door,
  });

  interactables.push(door204);
  collision.addWall(door204);

  props.doorPlate(2.31, 1.9, 27.42, 'right');

  createBed(scene, mat, interactables, 8.1, 24.6);
  createTv(scene, mat, interactables, 11.8, 29.5);
  createPhone(scene, mat, interactables, 5.9, 26.15);
  createBath(scene, mat, interactables, 12.1, 32.1);
  createMirror(scene, mat, interactables, 5.0, 33.75);

  props.lamp(5.4, 0.72, 24.4);
  props.trash(13.1, 24.1);
  props.ceilingLight(8.2, 28.2, 0.7);
}

function createBed(
  scene: THREE.Scene,
  mat: Materials,
  interactables: InteractableMesh[],
  x: number,
  z: number
): void {
  createBox(scene, x, 0.45, z, 3.25, 0.9, 1.9, mat.wood);
  createBox(scene, x - 0.95, 1.02, z - 0.45, 0.9, 0.22, 0.72, mat.paper);
  createBox(scene, x + 0.4, 1.02, z + 0.12, 1.9, 0.17, 1.24, mat.carpet);

  const stain = createBox(scene, x, 0.16, z + 1.15, 2.2, 0.12, 0.55, mat.blood) as InteractableMesh;
  stain.userData.type = 'bed';
  stain.userData.label = '침대 밑을 확인한다';
  stain.userData.used = false;
  interactables.push(stain);
}

function createTv(
  scene: THREE.Scene,
  mat: Materials,
  interactables: InteractableMesh[],
  x: number,
  z: number
): void {
  createBox(scene, x, 0.72, z, 1.55, 1.44, 0.65, mat.wood);

  const tv = createBox(scene, x, 1.75, z - 0.42, 1.3, 0.85, 0.1, mat.screen) as InteractableMesh;
  tv.userData.type = 'tv';
  tv.userData.label = 'TV를 켠다';
  tv.userData.used = false;
  interactables.push(tv);

  const light = new THREE.PointLight(0x93cfff, 0.9, 12, 1.6);
  light.position.set(x, 2.0, z - 0.3);
  scene.add(light);
}

function createPhone(
  scene: THREE.Scene,
  mat: Materials,
  interactables: InteractableMesh[],
  x: number,
  z: number
): void {
  const phone = createBox(scene, x, 1.28, z, 0.5, 0.28, 0.42, mat.black) as InteractableMesh;
  phone.userData.type = 'phone';
  phone.userData.label = '전화기를 받는다';
  phone.userData.used = false;
  interactables.push(phone);
}

function createBath(
  scene: THREE.Scene,
  mat: Materials,
  interactables: InteractableMesh[],
  x: number,
  z: number
): void {
  createBox(scene, x, 0.58, z, 1.7, 1.16, 2.25, mat.metal);

  const bath = createBox(scene, x, 1.32, z, 1.35, 0.15, 1.6, mat.blood) as InteractableMesh;
  bath.userData.type = 'bath';
  bath.userData.label = '욕조 안을 확인한다';
  bath.userData.used = false;
  interactables.push(bath);
}

function createMirror(
  scene: THREE.Scene,
  mat: Materials,
  interactables: InteractableMesh[],
  x: number,
  z: number
): void {
  const mirror = createBox(scene, x, 1.65, z, 1.25, 1.4, 0.1, mat.screen) as InteractableMesh;
  mirror.userData.type = 'mirror';
  mirror.userData.label = '거울을 본다';
  mirror.userData.used = false;
  interactables.push(mirror);
}