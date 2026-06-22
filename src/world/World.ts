import * as THREE from "three";

type Door = {
  id: string;
  mesh: THREE.Mesh;
  closedX: number;
  openX: number;
  isLocked: boolean;
  isOpen: boolean;
};

type InteractableMeta = {
  id: string;
  label: string;
  type: string;
};

const interactable = new WeakMap<THREE.Object3D, InteractableMeta>();

export class World {
  readonly group = new THREE.Group();
  readonly interactable = interactable;
  readonly cctvCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 70);
  readonly flashlight = new THREE.SpotLight(0xfff2c0, 0, 16, Math.PI / 5, 0.7, 1.2);
  readonly threat: THREE.Group;
  readonly doors = new Map<string, Door>();
  isFlashlightOn = false;
  private hallwayLength = 15;
  private room203Occupied = false;
  private parkingGhost?: THREE.Group;
  private readonly clockHand: THREE.Mesh;

  constructor() {
    this.group.name = "NoVacancyWorld";
    this.group.add(new THREE.AmbientLight(0x322b25, 0.9));
    this.group.add(this.makeLight(-1.9, 2.25, 2.2, 0xffc066, 1.7, 5));
    this.group.add(this.makeLight(0, 2.55, -4, 0x9ac2ff, 0.9, 6));
    this.group.add(this.makeLight(0, 2.2, -12, 0xff8b57, 1.2, 6));
    this.flashlight.target.position.set(0, 1.6, 0);
    this.group.add(this.flashlight, this.flashlight.target);
    this.clockHand = this.makeClock();
    this.buildMotel();
    this.threat = this.makeThreat();
    this.threat.visible = false;
    this.threat.position.set(0, 0, -16);
    this.group.add(this.threat);
  }

  update(dt: number, player: THREE.Vector3): void {
    this.clockHand.rotation.z -= dt * 0.12;
    for (const door of this.doors.values()) {
      const target = door.isOpen ? door.openX : door.closedX;
      door.mesh.position.x = THREE.MathUtils.lerp(door.mesh.position.x, target, 8 * dt);
    }
    this.cctvCamera.position.set(6.8, 4.2, 13.5);
    this.cctvCamera.layers.enable(1);
    this.cctvCamera.lookAt(0, 0.8, 6.5);
    this.cctvCamera.aspect = window.innerWidth / window.innerHeight;
    this.cctvCamera.updateProjectionMatrix();
    if (this.parkingGhost) {
      this.parkingGhost.lookAt(player.x, 0.9, player.z);
    }
  }

  canStandAt(pos: THREE.Vector3, radius: number): boolean {
    const x = pos.x;
    const z = pos.z;
    const inLobby = x > -4.8 + radius && x < 4.8 - radius && z > 0.4 + radius && z < 7.5 - radius;
    const inHall = x > -1.35 + radius && x < 1.35 - radius && z < 1.2 && z > -this.hallwayLength + radius;
    const roomDoorOpen = Boolean(this.doors.get("room203")?.isOpen);
    const storageDoorOpen = Boolean(this.doors.get("storage")?.isOpen);
    const inRoom203 =
      x > 1.65 + radius &&
      x < 5.5 - radius &&
      z < -7.9 &&
      z > -12.2 + radius &&
      (roomDoorOpen || z < -8.8);
    const inStorage =
      x > -5.5 + radius &&
      x < -1.7 - radius &&
      z < -3.3 &&
      z > -6.8 + radius &&
      (storageDoorOpen || z < -4.9);
    const inParking = x > -5.2 + radius && x < 5.2 - radius && z > 7.1 + radius && z < 12.5 - radius;
    const roomThreshold = roomDoorOpen && x > 0.9 && x < 2.25 && z < -8.25 && z > -9.15;
    const storageThreshold = storageDoorOpen && x < -0.9 && x > -2.25 && z < -5.15 && z > -6.05;
    return inLobby || inHall || inRoom203 || inStorage || inParking || roomThreshold || storageThreshold;
  }

  setParkingGhostVisible(visible: boolean): void {
    if (!this.parkingGhost) {
      this.parkingGhost = this.makeGhost();
      this.parkingGhost.traverse((child) => child.layers.set(1));
    }
    this.parkingGhost.visible = visible;
  }

  occupyRoom203(): void {
    if (this.room203Occupied) return;
    this.room203Occupied = true;
    const bedShape = this.box(0xfff4ce, [1.15, 0.24, 0.6], [4.25, 0.72, -10.7]);
    const figure = this.makeGhost(0x191512);
    figure.scale.setScalar(0.7);
    figure.position.set(4.25, 0, -10.4);
    this.group.add(bedShape, figure);
  }

  extendHallway(): void {
    this.hallwayLength = 24;
    const floor = this.box(0x1b1714, [2.8, 0.08, 9], [0, -0.04, -19.3]);
    const left = this.box(0x352722, [0.18, 2.5, 9], [-1.5, 1.25, -19.3]);
    const right = this.box(0x352722, [0.18, 2.5, 9], [1.5, 1.25, -19.3]);
    this.group.add(floor, left, right);
    for (let i = 0; i < 4; i += 1) {
      this.group.add(this.makeLight(i % 2 ? 0.9 : -0.9, 2.15, -15 - i * 2.2, 0xb24136, 0.55, 3.2));
    }
  }

  unlockDoor(id: string): void {
    const door = this.doors.get(id);
    if (door) door.isLocked = false;
  }

  openDoor(id: string): void {
    const door = this.doors.get(id);
    if (door) {
      door.isLocked = false;
      door.isOpen = true;
    }
  }

  toggleDoor(id: string): boolean {
    const door = this.doors.get(id);
    if (!door || door.isLocked) return false;
    door.isOpen = !door.isOpen;
    return true;
  }

  private buildMotel(): void {
    this.group.add(this.box(0x171311, [12, 0.08, 30], [0, -0.04, -4]));
    this.group.add(this.box(0x2c241f, [10, 2.7, 0.18], [0, 1.35, 7.6]));
    this.group.add(this.box(0x2c241f, [0.18, 2.7, 7.3], [-4.9, 1.35, 3.9]));
    this.group.add(this.box(0x2c241f, [0.18, 2.7, 7.3], [4.9, 1.35, 3.9]));
    this.group.add(this.box(0x211a17, [3.2, 2.7, 0.18], [-3.4, 1.35, 0.3]));
    this.group.add(this.box(0x211a17, [3.2, 2.7, 0.18], [3.4, 1.35, 0.3]));
    this.group.add(this.box(0x3a241d, [4.2, 1, 1.1], [-1.4, 0.5, 4.2]));
    this.addInteractable(this.box(0x101924, [0.72, 0.42, 0.18], [-2.2, 1.18, 3.56]), "cctv", "Check CCTV", "cctv");
    this.addInteractable(this.box(0x111111, [0.36, 0.16, 0.28], [-0.8, 1.1, 3.63]), "phone", "Answer phone", "answer-phone");
    this.addInteractable(this.box(0xf1c64d, [0.22, 0.05, 0.42], [-1.48, 1.05, 3.62]), "key203", "Take key 203", "take-key");
    this.addInteractable(this.box(0x5d3a25, [0.52, 0.08, 0.72], [-2.98, 1.06, 3.62]), "book", "Read guest book", "read-book");
    this.group.add(this.box(0x1f1815, [2.8, 0.08, 15.2], [0, -0.02, -6.4]));
    this.group.add(this.box(0x33251f, [0.18, 2.55, 15], [-1.5, 1.27, -6.3]));
    this.group.add(this.box(0x33251f, [0.18, 2.55, 15], [1.5, 1.27, -6.3]));
    this.makeDoor("room203", [1.57, 1.05, -8.7], 0.68, false, "Room 203", "open-door");
    this.group.add(this.box(0x2a1f1c, [4, 2.45, 0.16], [3.6, 1.2, -7.8]));
    this.group.add(this.box(0x2a1f1c, [0.16, 2.45, 4.6], [1.58, 1.2, -10]));
    this.group.add(this.box(0x2a1f1c, [0.16, 2.45, 4.6], [5.6, 1.2, -10]));
    this.group.add(this.box(0x2a1f1c, [4, 2.45, 0.16], [3.6, 1.2, -12.3]));
    this.addInteractable(this.box(0x6a4a36, [1.5, 0.45, 0.9], [4.2, 0.35, -10.8]), "inspect203", "Inspect Room 203", "inspect-203");
    this.makeDoor("storage", [-1.57, 1.05, -4.7], -0.68, true, "Storage", "open-door");
    this.group.add(this.box(0x211b18, [4, 2.45, 0.16], [-3.6, 1.2, -3.3]));
    this.group.add(this.box(0x211b18, [0.16, 2.45, 3.6], [-1.58, 1.2, -5]));
    this.group.add(this.box(0x211b18, [0.16, 2.45, 3.6], [-5.6, 1.2, -5]));
    this.group.add(this.box(0x211b18, [4, 2.45, 0.16], [-3.6, 1.2, -6.9]));
    this.group.add(this.box(0x493d31, [0.8, 1.2, 0.4], [-4.5, 0.6, -5.8]));
    this.addInteractable(this.box(0x22262a, [0.75, 0.12, 0.45], [-3.2, 0.92, -5.3]), "exit", "Run outside", "exit");
    this.group.add(this.box(0x111315, [10.2, 0.08, 5.5], [0, -0.03, 10]));
    this.group.add(this.box(0x1b2024, [1.8, 0.12, 3.6], [-2.1, 0.02, 10.3]));
    this.group.add(this.box(0x1b2024, [1.8, 0.12, 3.6], [2.1, 0.02, 10.3]));
    this.group.add(this.clockHand);
  }

  private makeDoor(
    id: string,
    position: [number, number, number],
    openOffset: number,
    locked: boolean,
    label: string,
    type: string,
  ): void {
    const mesh = this.box(0x513326, [0.16, 1.9, 1], position) as THREE.Mesh;
    this.addInteractable(mesh, id, label, type);
    this.doors.set(id, {
      id,
      mesh,
      closedX: position[0],
      openX: position[0] + openOffset,
      isLocked: locked,
      isOpen: false,
    });
  }

  private addInteractable<T extends THREE.Object3D>(obj: T, id: string, label: string, type: string): T {
    interactable.set(obj, { id, label, type });
    this.group.add(obj);
    return obj;
  }

  private box(color: number, size: [number, number, number], position: [number, number, number]): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      new THREE.MeshLambertMaterial({ color }),
    );
    mesh.position.set(position[0], position[1], position[2]);
    return mesh;
  }

  private makeLight(x: number, y: number, z: number, color: number, intensity: number, distance: number): THREE.PointLight {
    const light = new THREE.PointLight(color, intensity, distance, 1.8);
    light.position.set(x, y, z);
    return light;
  }

  private makeGhost(color = 0x101010): THREE.Group {
    const ghost = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.35, 0.32), new THREE.MeshBasicMaterial({ color }));
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.32), new THREE.MeshBasicMaterial({ color: 0x0a0a0a }));
    body.position.y = 0.72;
    head.position.y = 1.55;
    ghost.add(body, head);
    ghost.position.set(0, 0, 9.2);
    this.group.add(ghost);
    return ghost;
  }

  private makeThreat(): THREE.Group {
    const threat = this.makeGhost(0x070707);
    threat.scale.set(1.15, 1.35, 1.15);
    return threat;
  }

  private makeClock(): THREE.Mesh {
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.02), new THREE.MeshBasicMaterial({ color: 0xd9bd7a }));
    hand.position.set(0.2, 2.08, 0.22);
    return hand;
  }
}
