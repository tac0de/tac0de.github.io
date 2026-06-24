import * as THREE from 'three';
import { createBox } from './createBox';
import type { Materials } from '../world/Materials';

export class PropFactory {
  constructor(
    private scene: THREE.Scene,
    private mat: Materials
  ) {}

  textBars(
    x: number,
    y: number,
    z: number,
    count: number,
    material: THREE.Material,
    axis: 'x' | 'z' = 'x'
  ): void {
    for (let i = 0; i < count; i++) {
      const width = 0.08 + (i % 3) * 0.035;

      if (axis === 'x') {
        createBox(this.scene, x + i * 0.18, y, z, width, 0.12, 0.035, material);
      } else {
        createBox(this.scene, x, y, z + i * 0.18, 0.035, 0.12, width, material);
      }
    }
  }

  doorPlate(x: number, y: number, z: number, side: 'left' | 'right'): void {
    createBox(this.scene, x, y, z, 0.08, 0.35, 0.8, this.mat.paper);
    this.textBars(
      x + (side === 'left' ? 0.055 : -0.055),
      y + 0.03,
      z - 0.24,
      3,
      this.mat.black,
      'z'
    );
  }

  lamp(x: number, y: number, z: number): void {
    createBox(this.scene, x, y, z, 0.2, 0.75, 0.2, this.mat.wood);
    createBox(this.scene, x, y + 0.48, z, 0.85, 0.34, 0.85, this.mat.paper);

    const light = new THREE.PointLight(0xffd194, 0.85, 7, 1.8);
    light.position.set(x, y + 0.7, z);
    this.scene.add(light);
  }

  trash(x: number, z: number): void {
    createBox(this.scene, x, 0.28, z, 0.52, 0.56, 0.52, this.mat.metal);
    createBox(this.scene, x + 0.36, 0.08, z - 0.16, 0.5, 0.08, 0.26, this.mat.paper);
    createBox(this.scene, x - 0.32, 0.07, z + 0.2, 0.38, 0.07, 0.22, this.mat.paper);
  }

  ceilingLight(x: number, z: number, intensity = 0.7): void {
    createBox(this.scene, x, 2.95, z, 1.1, 0.08, 0.48, this.mat.paper);

    const light = new THREE.PointLight(0xffd99a, intensity, 8.5, 1.6);
    light.position.set(x, 2.65, z);
    this.scene.add(light);
  }

  car(x: number, z: number): void {
    createBox(this.scene, x, 0.42, z, 3.2, 0.84, 1.65, this.mat.darkWall);
    createBox(this.scene, x - 0.15, 0.95, z, 1.65, 0.7, 1.35, this.mat.screen);

    createBox(this.scene, x - 1.25, 0.12, z - 0.68, 0.55, 0.24, 0.24, this.mat.black);
    createBox(this.scene, x + 1.25, 0.12, z - 0.68, 0.55, 0.24, 0.24, this.mat.black);
    createBox(this.scene, x - 1.25, 0.12, z + 0.68, 0.55, 0.24, 0.24, this.mat.black);
    createBox(this.scene, x + 1.25, 0.12, z + 0.68, 0.55, 0.24, 0.24, this.mat.black);
  }
}