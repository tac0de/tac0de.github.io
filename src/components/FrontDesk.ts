import * as THREE from 'three';
import { createBox } from './createBox';
import { PropFactory } from './propFactory';
import type { Materials } from '../world/Materials';
import type { InteractableMesh } from '../game/types';

export function createFrontDesk(
  scene: THREE.Scene,
  mat: Materials,
  props: PropFactory,
  interactables: InteractableMesh[]
): void {
  createBox(scene, 0, 0.55, -2.8, 6.5, 1.1, 1.35, mat.wood);

  const guestbook = createBox(scene, -2.4, 1.42, -2.88, 0.82, 0.12, 0.46, mat.paper) as InteractableMesh;
  guestbook.userData.type = 'guestbook';
  guestbook.userData.label = '숙박부를 읽는다';
  guestbook.userData.used = false;
  interactables.push(guestbook);

  const bell = createBox(scene, 0.1, 1.38, -3.5, 0.32, 0.18, 0.32, mat.metal) as InteractableMesh;
  bell.userData.type = 'bell';
  bell.userData.label = '벨을 누른다';
  bell.userData.used = false;
  interactables.push(bell);

  const key = createBox(scene, 1.6, 1.38, -2.9, 0.7, 0.12, 0.3, mat.key) as InteractableMesh;
  key.userData.type = 'room-204-key';
  key.userData.label = '204호 키를 집는다';
  key.userData.used = false;
  interactables.push(key);

  const cctv = createBox(scene, -4.9, 1.9, -5.92, 1.8, 1.15, 0.08, mat.screen) as InteractableMesh;
  cctv.userData.type = 'cctv';
  cctv.userData.label = 'CCTV 모니터를 본다';
  cctv.userData.used = false;
  interactables.push(cctv);

  createBox(scene, -4.9, 1.9, -5.85, 1.7, 1.05, 0.08, mat.screen);

  props.lamp(-3.9, 0.72, -4.2);
  props.lamp(4.0, 0.72, -4.2);
  props.trash(-7.2, 3.5);
  props.trash(7.0, 3.8);

  createBox(scene, 4.9, 1.8, -5.85, 1.6, 0.9, 0.08, mat.paper);
  props.textBars(4.25, 1.88, -5.93, 8, mat.black, 'x');
}