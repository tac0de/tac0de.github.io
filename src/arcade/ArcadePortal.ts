import * as THREE from "three";
import type { SaveSystem } from "../save/SaveSystem";

const MOVE_SPEED = 3.2;
const LOOK_SPEED = 0.0022;
const INTERACT_DISTANCE = 1.45;

export class ArcadePortal {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 70);
  private readonly overlay: HTMLDivElement;
  private readonly stick: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly enterButton: HTMLButtonElement;
  private readonly keys = new Set<string>();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly move = new THREE.Vector3();
  private readonly entryPosition = new THREE.Vector3(0, 1.05, -2.6);
  private previousTime = performance.now();
  private yaw = 0;
  private pitch = 0;
  private dragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private stickPointerId: number | null = null;
  private touchMoveX = 0;
  private touchMoveY = 0;

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
      <p class="portal-controls desktop">WASD / mouse / E / ESC</p>
      <p class="portal-controls mobile">left stick / right drag</p>
      <p class="portal-state"></p>
      <div class="portal-stick" aria-hidden="true"><div class="portal-knob"></div></div>
      <button class="portal-enter" type="button">ENTER</button>
    `;
    const stick = this.overlay.querySelector<HTMLDivElement>(".portal-stick");
    const knob = this.overlay.querySelector<HTMLDivElement>(".portal-knob");
    const enterButton = this.overlay.querySelector<HTMLButtonElement>(".portal-enter");
    if (!stick || !knob || !enterButton) throw new Error("Missing portal mobile controls");
    this.stick = stick;
    this.knob = knob;
    this.enterButton = enterButton;

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
    this.stick.removeEventListener("pointerdown", this.stickDown);
    this.stick.removeEventListener("pointermove", this.stickMove);
    this.stick.removeEventListener("pointerup", this.stickUp);
    this.stick.removeEventListener("pointercancel", this.stickUp);
    this.enterButton.removeEventListener("click", this.enterIfReady);
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
    this.scene.fog = new THREE.Fog(0xf5f3ee, 3.8, 9);
    this.camera.position.set(0, 1.55, 1.8);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c7, 2.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(3, 6, 4);
    this.scene.add(sun);

    this.scene.add(this.box(0xf2f0eb, [3.4, 0.12, 5.2], [0, -0.06, 0]));
    this.scene.add(this.box(0xffffff, [3.4, 2.8, 0.16], [0, 1.4, -2.7]));
    this.scene.add(this.box(0xf8f7f2, [0.16, 2.8, 5.2], [-1.7, 1.4, 0]));
    this.scene.add(this.box(0xf8f7f2, [0.16, 2.8, 5.2], [1.7, 1.4, 0]));
    this.scene.add(this.box(0xfaf9f5, [3.4, 0.16, 5.2], [0, 2.78, 0]));
    this.scene.add(this.box(0x090909, [1.0, 2.12, 0.16], [0, 1.06, -2.61]));
    this.scene.add(this.box(0xf5f3ee, [0.08, 0.08, 0.04], [0.32, 1.04, -2.5]));
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
    this.move.addScaledVector(this.right, this.touchMoveX);
    this.move.addScaledVector(this.forward, this.touchMoveY);

    if (this.move.lengthSq() > 0) {
      this.move.normalize().multiplyScalar(MOVE_SPEED * delta);
      this.camera.position.add(this.move);
      this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -1.18, 1.18);
      this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -2.18, 2.15);
    }

    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  private updateOverlay(): void {
    const state = this.overlay.querySelector<HTMLElement>(".portal-state");
    if (!state) return;
    state.textContent = this.isNearEntry() ? "E / ENTER" : "";
  }

  private isNearEntry(): boolean {
    return this.camera.position.distanceTo(this.entryPosition) < INTERACT_DISTANCE;
  }

  private readonly enterIfReady = (): void => {
    if (this.isNearEntry()) {
      this.onPlayNoVacancy();
    }
  };

  private bindEvents(): void {
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    document.addEventListener("mousemove", this.mouseMove);
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    window.addEventListener("pointermove", this.pointerMove);
    window.addEventListener("pointerup", this.pointerUp);
    this.stick.addEventListener("pointerdown", this.stickDown);
    this.stick.addEventListener("pointermove", this.stickMove);
    this.stick.addEventListener("pointerup", this.stickUp);
    this.stick.addEventListener("pointercancel", this.stickUp);
    this.enterButton.addEventListener("click", this.enterIfReady);
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

  private readonly stickDown = (event: PointerEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    this.stickPointerId = event.pointerId;
    this.stick.setPointerCapture(event.pointerId);
    this.updateStick(event.clientX, event.clientY);
  };

  private readonly stickMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.stickPointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.updateStick(event.clientX, event.clientY);
  };

  private readonly stickUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.stickPointerId) return;
    this.stickPointerId = null;
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.knob.style.transform = "translate(0, 0)";
  };

  private look(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX * LOOK_SPEED;
    this.pitch = THREE.MathUtils.clamp(this.pitch - deltaY * LOOK_SPEED, -1.25, 1.25);
  }

  private updateStick(clientX: number, clientY: number): void {
    const rect = this.stick.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const distance = Math.min(Math.hypot(dx, dy), 38);
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    this.knob.style.transform = `translate(${x}px, ${y}px)`;
    this.touchMoveX = x / 38;
    this.touchMoveY = -y / 38;
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
