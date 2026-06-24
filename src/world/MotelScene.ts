import * as THREE from 'three';
import { createBox } from '../components/createBox';
import { createFrontDesk } from '../components/FrontDesk';
import { createHallway } from '../components/Hallway';
import { createRoom204 } from '../components/MotelRoom';
import { PropFactory } from '../components/PropFactory';
import { createMaterials } from './Materials';
import { CollisionWorld } from './CollisionWorld';
import type { InteractableMesh } from '../game/types';

export class MotelScene {
  readonly materials = createMaterials();
  readonly collision = new CollisionWorld();
  readonly interactables: InteractableMesh[] = [];
  readonly props: PropFactory;

  readonly lobbyLight: THREE.PointLight;
  readonly signLight: THREE.PointLight;
  readonly hallwayLight: THREE.PointLight;

  constructor(private scene: THREE.Scene) {
    this.props = new PropFactory(scene, this.materials);

    this.createBase();
    this.createParkingLot();
    createFrontDesk(scene, this.materials, this.props, this.interactables);
    createHallway(scene, this.materials, this.props, this.collision, this.interactables);
    createRoom204(scene, this.materials, this.props, this.collision, this.interactables);

    this.lobbyLight = this.createPointLight(0xffd7a0, 1.0, 13, 0, 2.6, -2.8);
    this.signLight = this.createPointLight(0xff3d75, 2.5, 24, 0, 3.2, -8.7);
    this.hallwayLight = this.createPointLight(0xffd49a, 0.8, 15, 0, 2.5, 14);
  }

  private createBase(): void {
    const mat = this.materials;

    createBox(this.scene, 0, -0.05, -1, 18, 0.1, 14, mat.floor);

    this.collision.addWall(createBox(this.scene, 0, 1.5, -8, 18, 3, 0.4, mat.wall));
    this.collision.addWall(createBox(this.scene, -9, 1.5, -1, 0.4, 3, 14, mat.wall));
    this.collision.addWall(createBox(this.scene, 9, 1.5, -1, 0.4, 3, 14, mat.wall));

    this.collision.addWall(createBox(this.scene, -5.8, 1.5, 6, 6.4, 3, 0.4, mat.wall));
    this.collision.addWall(createBox(this.scene, 5.8, 1.5, 6, 6.4, 3, 0.4, mat.wall));
  }

  private createParkingLot(): void {
    const mat = this.materials;

    createBox(this.scene, 0, -0.08, -14, 24, 0.1, 12, mat.darkWall);

    this.props.car(-5.8, -15.2);
    this.props.car(5.2, -13.2);

    this.collision.addWall(createBox(this.scene, -12, 1.1, -14, 0.4, 2.2, 12, mat.darkWall));
    this.collision.addWall(createBox(this.scene, 12, 1.1, -14, 0.4, 2.2, 12, mat.darkWall));

    createBox(this.scene, 0, 3.2, -9.15, 6.5, 1.15, 0.12, mat.neonPink);
    this.props.textBars(-2.35, 3.35, -9.25, 22, mat.key, 'x');
  }

  private createPointLight(
    color: number,
    intensity: number,
    distance: number,
    x: number,
    y: number,
    z: number
  ): THREE.PointLight {
    const light = new THREE.PointLight(color, intensity, distance, 1.55);
    light.position.set(x, y, z);
    this.scene.add(light);
    return light;
  }

  openDoor(type: string): void {
    const target = this.interactables.find((item) => item.userData.type === type);
    if (!target) return;

    this.collision.removeWall(target);
    target.visible = false;
  }

  addHallwayShift(): void {
    const mat = this.materials;

    createBox(this.scene, 0, 1.5, 8.7, 2.1, 3, 0.22, mat.darkWall);
    createBox(this.scene, 0, 1.2, 8.55, 1.25, 2.2, 0.12, mat.door);
    this.props.textBars(-0.34, 1.82, 8.43, 5, mat.blood, 'x');

    const light = new THREE.PointLight(0xff3355, 0.8, 10, 1.6);
    light.position.set(0, 2.2, 8.6);
    this.scene.add(light);
  }

  addFrontDeskBlood(): void {
    const mat = this.materials;

    createBox(this.scene, 0, 1.35, -2.05, 3.0, 0.13, 0.12, mat.blood);
    createBox(this.scene, 2.8, 1.38, -2.85, 0.9, 0.12, 0.48, mat.paper);
    this.props.textBars(2.45, 1.47, -2.88, 8, mat.blood, 'x');
  }
}