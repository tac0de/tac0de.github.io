import * as THREE from "three";
import type { SaveSystem } from "../save/SaveSystem";

const MOVE_SPEED = 3.2;
const LOOK_SPEED = 0.0022;
const INTERACT_DISTANCE = 2.15;

export class ArcadePortal {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 70);
  private readonly overlay: HTMLDivElement;
  private readonly keys = new Set<string>();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly move = new THREE.Vector3();
  private readonly entryPosition = new THREE.Vector3(0, 1.05, -7.2);
  private previousTime = performance.now();
  private yaw = 0;
  private pitch = 0;
  private dragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly _save: SaveSystem,
    private readonly onPlayNoVacancy: () => void,
  ) {
    this.root.innerHTML = "";
    const shell = document.createElement("main");
    shell.className = "arcade-portal minimal";
    shell.setAttribute("aria-label", "TAC0DE ARCADE");

    this.overlay = document.createElement("div");
    this.overlay.className = "portal-minimal-overlay";
    this.overlay.innerHTML = `
      <p>WASD move / mouse look / E enter / ESC release</p>
      <p class="portal-state">Find the only door.</p>
    `;

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.setClearColor(0xf5f3ee);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = "arcade-canvas minimal";
    shell.append(this.renderer.domElement, this.overlay);
    this.root.append(shell);

    this.buildScene();
    this.bindEvents();
    this.resize();
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.render());
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    document.removeEventListener("mousemove", this.mouseMove);
    this.renderer.domElement.removeEventListener("pointerdown", this.pointerDown);
    window.removeEventListener("pointermove", this.pointerMove);
    window.removeEventListener("pointerup", this.pointerUp);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          const mappedMaterial = material as THREE.Material & { map?: THREE.Texture };
          mappedMaterial.map?.dispose();
          material.dispose();
        }
      }
    });
    this.renderer.dispose();
    this.root.innerHTML = "";
  }

  private buildScene(): void {
    this.scene.background = new THREE.Color(0xf5f3ee);
    this.scene.fog = new THREE.Fog(0xf5f3ee, 10, 36);
    this.camera.position.set(0, 1.55, 4.6);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c7, 2.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(3, 6, 4);
    this.scene.add(sun);

    this.scene.add(this.box(0xf3f0e9, [18, 0.12, 24], [0, -0.06, -4]));
    this.scene.add(this.box(0xffffff, [18, 7, 0.18], [0, 3.5, -10]));
    this.scene.add(this.box(0xf8f7f2, [0.18, 7, 24], [-9, 3.5, -4]));
    this.scene.add(this.box(0xf8f7f2, [0.18, 7, 24], [9, 3.5, -4]));
    this.scene.add(this.box(0xfaf9f5, [18, 0.18, 24], [0, 7, -4]));

    this.scene.add(this.box(0x0c0c0c, [2.3, 2.9, 0.28], [0, 1.45, -7.5]));
    this.scene.add(this.box(0xffffff, [1.65, 0.72, 0.06], [0, 1.72, -7.34]));
    this.scene.add(this.label("NO VACANCY", [0, 1.74, -7.3], [1.46, 0.48], 0x0c0c0c));
    this.scene.add(this.label("ENTER", [0, 0.82, -7.3], [1.0, 0.28], 0xffffff));

    this.scene.add(this.box(0xe9e5dc, [1.4, 2.1, 0.2], [-4.2, 1.05, -7.65]));
    this.scene.add(this.label("SOON", [-4.2, 1.55, -7.52], [0.72, 0.24], 0xb8b1a6));
    this.scene.add(this.box(0xe9e5dc, [1.4, 2.1, 0.2], [4.2, 1.05, -7.65]));
    this.scene.add(this.label("SOON", [4.2, 1.55, -7.52], [0.72, 0.24], 0xb8b1a6));
  }

  private render(): void {
    const now = performance.now();
    const delta = Math.min((now - this.previousTime) / 1000, 0.05);
    this.previousTime = now;
    this.updateMovement(delta);
    this.updateOverlay();
    this.renderer.render(this.scene, this.camera);
  }

  private updateMovement(delta: number): void {
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw) * -1).normalize();
    this.right.set(-this.forward.z, 0, this.forward.x).normalize();
    this.move.set(0, 0, 0);

    if (this.keys.has("KeyW")) this.move.add(this.forward);
    if (this.keys.has("KeyS")) this.move.sub(this.forward);
    if (this.keys.has("KeyD")) this.move.add(this.right);
    if (this.keys.has("KeyA")) this.move.sub(this.right);

    if (this.move.lengthSq() > 0) {
      this.move.normalize().multiplyScalar(MOVE_SPEED * delta);
      this.camera.position.add(this.move);
      this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -7.4, 7.4);
      this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -8.8, 5.5);
    }

    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  private updateOverlay(): void {
    const state = this.overlay.querySelector<HTMLElement>(".portal-state");
    if (!state) return;
    state.textContent = this.isNearEntry() ? "Press E to enter NO VACANCY." : "Find the only door.";
  }

  private isNearEntry(): boolean {
    return this.camera.position.distanceTo(this.entryPosition) < INTERACT_DISTANCE;
  }

  private enterIfReady(): void {
    if (this.isNearEntry()) {
      this.onPlayNoVacancy();
    }
  }

  private bindEvents(): void {
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    document.addEventListener("mousemove", this.mouseMove);
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    window.addEventListener("pointermove", this.pointerMove);
    window.addEventListener("pointerup", this.pointerUp);
  }

  private readonly keyDown = (event: KeyboardEvent): void => {
    if (event.code === "KeyE" || event.code === "Enter") this.enterIfReady();
    this.keys.add(event.code);
  };

  private readonly keyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly mouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.renderer.domElement) return;
    this.look(event.movementX, event.movementY);
  };

  private readonly pointerDown = (event: PointerEvent): void => {
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.dragging = true;
    if (event.pointerType === "mouse") {
      this.renderer.domElement.requestPointerLock();
    }
  };

  private readonly pointerMove = (event: PointerEvent): void => {
    if (!this.dragging || document.pointerLockElement === this.renderer.domElement) return;
    const deltaX = event.clientX - this.lastPointerX;
    const deltaY = event.clientY - this.lastPointerY;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.look(deltaX, deltaY);
  };

  private readonly pointerUp = (): void => {
    this.dragging = false;
  };

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private look(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX * LOOK_SPEED;
    this.pitch = THREE.MathUtils.clamp(this.pitch - deltaY * LOOK_SPEED, -1.25, 1.25);
  }

  private box(color: number, size: [number, number, number], position: [number, number, number]): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      new THREE.MeshLambertMaterial({ color }),
    );
    mesh.position.set(position[0], position[1], position[2]);
    return mesh;
  }

  private label(text: string, position: [number, number, number], size: [number, number], color: number): THREE.Mesh {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing canvas context");
    context.fillStyle = "rgba(255, 255, 255, 0)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.font = "700 28px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 128, 50);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
    mesh.position.set(position[0], position[1], position[2]);
    return mesh;
  }
}
