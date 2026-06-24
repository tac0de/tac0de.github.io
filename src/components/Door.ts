import * as THREE from 'three';
import { createBox } from './createBox';
import type { InteractableMesh, InteractableType } from '../game/types';

interface DoorOptions {
  type: InteractableType;
  label: string;
  x: number;
  y: number;
  z: number;
  width?: number;
  height?: number;
  depth?: number;
  material: THREE.Material;
}

export function createDoor(
  scene: THREE.Scene,
  options: DoorOptions
): InteractableMesh {
  const mesh = createBox(
    scene,
    options.x,
    options.y,
    options.z,
    options.width ?? 0.14,
    options.height ?? 2.35,
    options.depth ?? 1.9,
    options.material
  ) as InteractableMesh;

  mesh.userData.type = options.type;
  mesh.userData.label = options.label;
  mesh.userData.used = false;

  return mesh;
}