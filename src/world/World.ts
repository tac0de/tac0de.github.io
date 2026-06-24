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
const ROOM_SIGN_SIZE: [number, number] = [0.58, 0.26];

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
  private readonly roomSigns: THREE.Mesh[] = [];
  private readonly keyMesh: THREE.Mesh;
  private readonly bookPage: THREE.Mesh;
  private keyRemoved = false;

  constructor(private readonly loop: number) {
    this.group.name = "NoVacancyWorld";
    this.group.add(new THREE.AmbientLight(0xb6a897, 2.85));
    this.group.add(this.makeLight(-1.9, 2.25, 2.2, 0xffd08b, 3.8, 8.5));
    this.group.add(this.makeLight(0, 2.55, -4, 0xb7d1ff, 2.45, 10));
    this.group.add(this.makeLight(0, 2.2, -12, 0xffa978, 2.45, 9));
    this.flashlight.target.position.set(0, 1.6, 0);
    this.group.add(this.flashlight, this.flashlight.target);
    this.clockHand = this.makeClock();
    this.buildMotel();
    this.keyMesh = this.getInteractableMesh("key203");
    this.bookPage = this.makeBookPage("201 WALK-IN\\n202 EMPTY\\n203 VACANT", [-2.98, 1.14, 3.43]);
    this.group.add(this.bookPage);
    this.threat = this.makeThreat();
    this.threat.visible = false;
    this.threat.position.set(0, 0, -16);
    this.group.add(this.threat);
    this.applyLoopState();
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

  setCctvFigureStage(stage: number): void {
    this.setParkingGhostVisible(true);
    const ghost = this.parkingGhost;
    if (!ghost) return;
    ghost.position.set(stage % 2 === 0 ? 0.65 : -0.9, 0, 8.4 + stage * 0.85);
    ghost.scale.setScalar(0.92 + stage * 0.16);
  }

  setLobbyReflectionVisible(visible: boolean): void {
    if (!visible) return;
    const reflection = this.makeGhost(0x0b0d10);
    reflection.position.set(-2.35, 0, 4.95);
    reflection.scale.set(0.62, 0.72, 0.62);
    reflection.traverse((child) => child.layers.set(1));
  }

  changeRoomNumbersTo203(): void {
    for (const sign of this.roomSigns) {
      const material = sign.material as THREE.MeshBasicMaterial;
      material.map?.dispose();
      material.map = this.makeLabelTexture("203", "#e7d7b1", "#362620");
      material.needsUpdate = true;
    }
  }

  corruptGuestBook(): void {
    const material = this.bookPage.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.map = this.makeLabelTexture("203 OCCUPIED\\n203 OCCUPIED\\nYOUR NAME", "#130f0e", "#d8cba8");
    material.needsUpdate = true;
  }

  removeDeskKey(): void {
    if (this.keyRemoved) return;
    this.keyRemoved = true;
    this.keyMesh.visible = false;
  }

  markCheckedIn(): void {
    const material = this.bookPage.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.map = this.makeLabelTexture("203 OCCUPIED\\nSTAFF: YOU\\nCHECKED IN", "#120d0d", "#f0c1a4");
    material.needsUpdate = true;
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
    this.group.add(this.box(0x312821, [12, 0.08, 30], [0, -0.04, -4]));

    // Front office / lobby shell.
    this.group.add(this.box(0x6a5849, [10, 2.9, 0.18], [0, 1.45, 7.6]));
    this.group.add(this.box(0x4c4036, [1.7, 2.45, 0.22], [-4.15, 1.23, 7.42]));
    this.group.add(this.box(0x4c4036, [1.7, 2.45, 0.22], [4.15, 1.23, 7.42]));
    this.group.add(this.box(0x1d2b30, [2.2, 1.12, 0.08], [-2.25, 1.58, 7.28]));
    this.group.add(this.box(0x1d2b30, [2.2, 1.12, 0.08], [2.25, 1.58, 7.28]));
    this.group.add(this.box(0x382f29, [1.15, 2.2, 0.16], [0, 1.1, 7.35]));
    this.group.add(this.makeLabel("OFFICE", [0, 2.32, 7.22], [1.1, 0.24], "#281d18", "#f2d48e"));
    this.group.add(this.box(0x6a5648, [0.18, 2.8, 7.3], [-4.9, 1.4, 3.9]));
    this.group.add(this.box(0x6a5648, [0.18, 2.8, 7.3], [4.9, 1.4, 3.9]));
    this.group.add(this.box(0x5f5045, [3.15, 2.8, 0.18], [-3.42, 1.4, 0.3]));
    this.group.add(this.box(0x5f5045, [3.15, 2.8, 0.18], [3.42, 1.4, 0.3]));
    this.group.add(this.box(0x4a3f37, [10, 0.16, 7.4], [0, 2.82, 3.95]));

    // Reception desk and readable work objects.
    this.group.add(this.box(0x6c4933, [4.6, 0.9, 1.05], [-1.45, 0.45, 4.25]));
    this.group.add(this.box(0x8d6644, [4.8, 0.16, 1.18], [-1.45, 0.96, 4.25]));
    this.group.add(this.box(0x2b211b, [4.35, 0.2, 0.12], [-1.45, 0.9, 4.86]));
    this.group.add(this.makeLabel("FRONT DESK", [-1.45, 1.2, 4.94], [1.9, 0.28], "#2b211b", "#f2d48e"));
    this.group.add(this.box(0x15110f, [0.92, 1.3, 0.08], [-3.75, 1.45, 3.72]));
    this.group.add(this.makeLabel("KEYS", [-3.75, 2.25, 3.66], [0.82, 0.22], "#201712", "#f0d49a"));
    for (let i = 0; i < 4; i += 1) {
      this.group.add(this.box(0xd2b05a, [0.12, 0.2, 0.05], [-4.03 + i * 0.18, 1.55, 3.64]));
    }
    this.addInteractable(this.box(0x10284a, [0.76, 0.5, 0.16], [-2.18, 1.28, 3.56]), "cctv", "Check CCTV", "cctv");
    this.group.add(this.makeLabel("CAM", [-2.18, 1.3, 3.46], [0.54, 0.18], "#10284a", "#b8f2d1"));
    this.addInteractable(this.box(0x0d0b0a, [0.38, 0.16, 0.28], [-0.78, 1.08, 3.64]), "phone", "Answer phone", "answer-phone");
    this.addInteractable(this.box(0xf1c64d, [0.24, 0.05, 0.42], [-1.48, 1.07, 3.64]), "key203", "Take key 203", "take-key");
    this.addInteractable(this.box(0x765338, [0.58, 0.08, 0.78], [-2.98, 1.08, 3.64]), "book", "Read guest book", "read-book");
    this.group.add(this.box(0xb99450, [0.22, 0.1, 0.22], [0.15, 1.05, 3.68]));

    // Hallway spine with motel-room rhythm.
    this.group.add(this.box(0x332820, [2.9, 0.09, 15.2], [0, -0.02, -6.4]));
    this.group.add(this.box(0x5f5148, [0.18, 2.65, 15], [-1.5, 1.33, -6.3]));
    this.group.add(this.box(0x5f5148, [0.18, 2.65, 15], [1.5, 1.33, -6.3]));
    this.group.add(this.box(0x3a332e, [2.95, 0.12, 15.2], [0, 2.68, -6.4]));
    this.group.add(this.box(0x48362d, [0.07, 0.02, 14.6], [0, 0.02, -6.5]));
    for (let i = 0; i < 6; i += 1) {
      const z = -1.5 - i * 2.25;
      this.group.add(this.box(0xd8c081, [0.38, 0.05, 0.12], [0, 2.36, z]));
      this.group.add(this.makeLight(i % 2 === 0 ? -0.88 : 0.88, 2.18, z, 0xcfe2ff, 0.75, 3.6));
    }
    this.makeDoor("room203", [1.57, 1.05, -8.7], 0.68, false, "Room 203", "open-door");
    this.group.add(this.makeRoomSign("203", [1.46, 1.78, -8.05], Math.PI / 2));
    this.group.add(this.makeRoomSign("201", [-1.46, 1.78, -3.75], -Math.PI / 2));
    this.group.add(this.makeRoomSign("202", [-1.46, 1.78, -6.95], -Math.PI / 2));
    this.group.add(this.makeRoomSign("204", [-1.46, 1.78, -10.75], -Math.PI / 2));
    this.group.add(this.makeLabel("201", [-1.34, 1.18, -3.75], [0.52, 0.22], "#130f0d", "#f2d48e", -Math.PI / 2));
    this.group.add(this.makeLabel("202", [-1.34, 1.18, -6.95], [0.52, 0.22], "#130f0d", "#f2d48e", -Math.PI / 2));
    this.group.add(this.makeLabel("203", [1.34, 1.18, -8.7], [0.52, 0.22], "#130f0d", "#f2d48e", Math.PI / 2));
    this.group.add(this.makeLabel("204", [-1.34, 1.18, -10.75], [0.52, 0.22], "#130f0d", "#f2d48e", -Math.PI / 2));
    this.group.add(this.makeLabel("201 <", [0, 2.12, -3.75], [0.78, 0.24], "#211915", "#e7d7a4"));
    this.group.add(this.makeLabel("202 <", [0, 2.12, -6.95], [0.78, 0.24], "#211915", "#e7d7a4"));
    this.group.add(this.makeLabel("> 203", [0, 2.12, -8.7], [0.78, 0.24], "#211915", "#e7d7a4"));
    this.group.add(this.box(0x8a5a37, [0.62, 0.04, 0.92], [-1.05, 0.02, -3.75]));
    this.group.add(this.box(0x8a5a37, [0.62, 0.04, 0.92], [-1.05, 0.02, -6.95]));
    this.group.add(this.box(0x8a5a37, [0.62, 0.04, 0.92], [-1.05, 0.02, -10.75]));
    this.group.add(this.box(0x94613c, [0.62, 0.04, 0.92], [1.05, 0.02, -8.7]));
    this.group.add(this.box(0x211915, [0.06, 1.95, 1.12], [-1.39, 0.98, -3.75]));
    this.group.add(this.box(0x211915, [0.06, 1.95, 1.12], [-1.39, 0.98, -6.95]));
    this.group.add(this.box(0x211915, [0.06, 1.95, 1.12], [-1.39, 0.98, -10.75]));
    this.group.add(this.box(0x211915, [0.06, 1.95, 1.12], [1.39, 0.98, -8.7]));
    this.group.add(this.box(0x3d3029, [0.1, 1.8, 0.86], [-1.56, 0.9, -3.75]));
    this.group.add(this.box(0x3d3029, [0.1, 1.8, 0.86], [-1.56, 0.9, -6.95]));
    this.group.add(this.box(0x3d3029, [0.1, 1.8, 0.86], [-1.56, 0.9, -10.75]));

    // Room 203.
    this.group.add(this.box(0x49382f, [4, 2.45, 0.16], [3.6, 1.2, -7.8]));
    this.group.add(this.box(0x49382f, [0.16, 2.45, 4.6], [1.58, 1.2, -10]));
    this.group.add(this.box(0x49382f, [0.16, 2.45, 4.6], [5.6, 1.2, -10]));
    this.group.add(this.box(0x49382f, [4, 2.45, 0.16], [3.6, 1.2, -12.3]));
    this.group.add(this.box(0x2e2622, [4.1, 0.09, 4.7], [3.6, 0, -10]));
    this.group.add(this.box(0x332b27, [4.1, 0.12, 4.7], [3.6, 2.45, -10]));
    this.addInteractable(this.box(0x76513c, [1.75, 0.48, 0.96], [4.25, 0.36, -10.75]), "inspect203", "Inspect Room 203", "inspect-203");
    this.group.add(this.box(0xd8c7a2, [1.62, 0.18, 0.86], [4.25, 0.78, -10.75]));
    this.group.add(this.box(0x2d2420, [0.55, 0.42, 0.55], [2.55, 0.28, -10.72]));
    this.group.add(this.box(0xc49b55, [0.16, 0.46, 0.16], [2.55, 0.74, -10.72]));
    this.group.add(this.box(0xffd88b, [0.42, 0.18, 0.42], [2.55, 1.06, -10.72]));
    this.group.add(this.box(0x0d1115, [0.95, 0.58, 0.08], [5.48, 1.38, -9.45]));
    this.group.add(this.box(0x111517, [0.7, 1.0, 0.06], [3.6, 1.38, -12.19]));

    // Storage / utility room.
    this.makeDoor("storage", [-1.57, 1.05, -4.7], -0.68, true, "Storage", "open-door");
    this.group.add(this.box(0x40352e, [4, 2.45, 0.16], [-3.6, 1.2, -3.3]));
    this.group.add(this.box(0x40352e, [0.16, 2.45, 3.6], [-1.58, 1.2, -5]));
    this.group.add(this.box(0x40352e, [0.16, 2.45, 3.6], [-5.6, 1.2, -5]));
    this.group.add(this.box(0x40352e, [4, 2.45, 0.16], [-3.6, 1.2, -6.9]));
    this.group.add(this.box(0x2c2924, [4.05, 0.09, 3.7], [-3.6, 0, -5.1]));
    this.group.add(this.box(0x6b5d4d, [0.8, 1.2, 0.4], [-4.5, 0.6, -5.8]));
    this.group.add(this.box(0x918a7b, [1.2, 0.12, 0.42], [-4.35, 1.45, -3.5]));
    this.group.add(this.box(0x918a7b, [1.2, 0.12, 0.42], [-4.35, 0.95, -3.5]));
    this.group.add(this.box(0xbfc0b5, [0.34, 0.28, 0.32], [-4.75, 1.18, -3.48]));
    this.group.add(this.box(0x44535a, [0.42, 0.52, 0.42], [-2.35, 0.28, -6.15]));
    this.addInteractable(this.box(0xc9b77b, [0.45, 0.62, 0.14], [-3.45, 1.02, -3.42]), "breaker", "Reset breaker", "reset-breaker");
    this.addInteractable(this.box(0x22262a, [0.75, 0.12, 0.45], [-3.2, 0.92, -5.3]), "exit", "Run outside", "exit");

    // Parking visible through the lobby windows.
    this.group.add(this.box(0x24292a, [10.2, 0.08, 5.5], [0, -0.03, 10]));
    this.group.add(this.box(0xe7d7a4, [0.08, 0.02, 4.6], [-0.3, 0.02, 10.1]));
    this.group.add(this.box(0xe7d7a4, [0.08, 0.02, 4.6], [0.3, 0.02, 10.1]));
    this.group.add(this.box(0x30383d, [1.8, 0.28, 3.45], [-2.15, 0.18, 10.45]));
    this.group.add(this.box(0x48525a, [1.5, 0.44, 1.75], [-2.15, 0.54, 10.3]));
    this.group.add(this.box(0x272d31, [1.8, 0.28, 3.45], [2.3, 0.18, 10.6]));
    this.group.add(this.box(0x5a4639, [1.5, 0.44, 1.75], [2.3, 0.54, 10.45]));
    this.group.add(this.box(0x15191a, [0.12, 2.3, 0.12], [4.55, 1.15, 10.2]));
    this.group.add(this.box(0xd8c982, [0.75, 0.16, 0.75], [4.55, 2.35, 10.2]));
    this.group.add(this.makeLabel("NO VACANCY", [0, 2.25, 12.28], [2.2, 0.46], "#11100f", "#d24d3d"));
    this.group.add(this.clockHand);
  }

  private applyLoopState(): void {
    if (this.loop >= 1) {
      this.corruptGuestBook();
      this.setCctvFigureStage(1);
    }
    if (this.loop >= 2) {
      this.changeRoomNumbersTo203();
      this.removeDeskKey();
    }
    if (this.loop >= 3) {
      this.markCheckedIn();
      this.setCctvFigureStage(3);
      this.setLobbyReflectionVisible(true);
    }
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

  private getInteractableMesh(id: string): THREE.Mesh {
    for (const child of this.group.children) {
      const meta = interactable.get(child);
      if (meta?.id === id && child instanceof THREE.Mesh) return child;
    }
    throw new Error(`Missing interactable mesh: ${id}`);
  }

  private makeRoomSign(text: string, position: [number, number, number], rotationY: number): THREE.Mesh {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_SIGN_SIZE[0], ROOM_SIGN_SIZE[1]),
      new THREE.MeshBasicMaterial({ map: this.makeLabelTexture(text, "#241c18", "#efd7a2") }),
    );
    sign.position.set(position[0], position[1], position[2]);
    sign.rotation.y = rotationY;
    this.roomSigns.push(sign);
    return sign;
  }

  private makeLabel(
    text: string,
    position: [number, number, number],
    size: [number, number],
    background: string,
    foreground: string,
    rotationY = 0,
  ): THREE.Mesh {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshBasicMaterial({
        map: this.makeLabelTexture(text, background, foreground),
        side: THREE.DoubleSide,
      }),
    );
    label.position.set(position[0], position[1], position[2]);
    label.rotation.y = rotationY;
    return label;
  }

  private makeBookPage(text: string, position: [number, number, number]): THREE.Mesh {
    const page = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.42),
      new THREE.MeshBasicMaterial({ map: this.makeLabelTexture(text, "#efe2bd", "#2b211b") }),
    );
    page.position.set(position[0], position[1], position[2]);
    page.rotation.x = -Math.PI / 2;
    return page;
  }

  private makeLabelTexture(text: string, background: string, foreground: string): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing 2D canvas context");
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = foreground;
    context.font = "700 34px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    const lines = text.split("\\n");
    lines.forEach((line, index) => {
      context.fillText(line, canvas.width / 2, 40 + index * 34);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
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
