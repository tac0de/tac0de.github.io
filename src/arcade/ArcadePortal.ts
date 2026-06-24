import * as THREE from "three";
import type { SaveSystem } from "../save/SaveSystem";

type PortalGame = {
  id: string;
  title: string;
  status: string;
  description: string;
  tags: string[];
  playable: boolean;
};

const GAMES: PortalGame[] = [
  {
    id: "no-vacancy",
    title: "NO VACANCY",
    status: "Featured / First playable",
    description: "A lo-fi motel night shift where the guest book, CCTV, and Room 203 begin correcting reality.",
    tags: ["Horror", "5-10 min"],
    playable: true,
  },
  {
    id: "cam-02",
    title: "CAM 02",
    status: "Coming soon",
    description: "CCTV-only motel horror prototype.",
    tags: ["CCTV", "Prototype"],
    playable: false,
  },
  {
    id: "untitled-drive",
    title: "UNTITLED DRIVE",
    status: "Coming soon",
    description: "Low-poly road game experiment.",
    tags: ["Drive", "Soon"],
    playable: false,
  },
];

export class ArcadePortal {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly overlay: HTMLDivElement;
  private readonly cabinetRail = new THREE.Group();
  private readonly cabinets: THREE.Group[] = [];
  private readonly startedAt = performance.now();
  private selected = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly save: SaveSystem,
    private readonly onPlayNoVacancy: () => void,
  ) {
    this.root.innerHTML = "";
    const shell = document.createElement("main");
    shell.className = "arcade-portal";
    shell.setAttribute("aria-label", "TAC0DE ARCADE");
    this.overlay = document.createElement("div");
    this.overlay.className = "arcade-overlay";

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x090807);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = "arcade-canvas";
    shell.append(this.renderer.domElement, this.overlay);
    this.root.append(shell);

    this.buildScene();
    this.bindEvents();
    this.resize();
    this.renderOverlay();
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.render());
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.keyDown);
    this.renderer.domElement.removeEventListener("pointerdown", this.pointerDown);
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
    this.scene.background = new THREE.Color(0x090807);
    this.scene.fog = new THREE.FogExp2(0x090807, 0.052);
    this.camera.position.set(0, 2.15, 7.4);
    this.camera.lookAt(0, 1.15, 0);

    this.scene.add(new THREE.AmbientLight(0x7a6250, 2.2));
    this.scene.add(this.light(-4, 5, 5, 0xffc266, 3.4, 12));
    this.scene.add(this.light(3.6, 3.2, 2, 0x7aa8ff, 1.7, 9));
    this.scene.add(this.light(0, 2.5, -3.5, 0xd94d37, 1.2, 8));
    this.scene.add(this.light(0, 2.1, 3.1, 0xffd36a, 2.2, 6));

    this.scene.add(this.box(0x2a211d, [8.8, 0.12, 8], [0, -0.06, -0.3]));
    this.scene.add(this.box(0x3a2a20, [6.6, 0.035, 1.45], [0, 0.015, 0.9]));
    this.scene.add(this.box(0x17110f, [9, 4, 0.2], [0, 2, -3.1]));
    this.scene.add(this.box(0x211815, [0.18, 4, 7.5], [-4.4, 2, 0.5]));
    this.scene.add(this.box(0x211815, [0.18, 4, 7.5], [4.4, 2, 0.5]));
    this.scene.add(this.makeSign());
    this.scene.add(this.cabinetRail);

    GAMES.forEach((game, index) => {
      const cabinet = this.makeCabinet(game, index);
      cabinet.position.set((index - 1) * 2.45, 0, index === 1 ? -0.35 : 0);
      cabinet.rotation.y = (1 - index) * 0.16;
      this.cabinets.push(cabinet);
      this.cabinetRail.add(cabinet);
    });
  }

  private makeCabinet(game: PortalGame, index: number): THREE.Group {
    const group = new THREE.Group();
    group.userData.index = index;
    const bodyColor = game.playable ? 0x4a2d20 : 0x2b2421;
    group.add(this.box(bodyColor, [1.55, 2.15, 0.88], [0, 1.02, 0]));
    group.add(this.box(0x111111, [1.28, 0.82, 0.08], [0, 1.46, 0.46]));
    group.add(this.box(0x0d0b0a, [1.38, 0.12, 0.92], [0, 2.12, 0]));
    group.add(this.box(0x171210, [1.2, 0.5, 0.18], [0, 0.38, 0.48]));
    group.add(this.box(0x0f0d0c, [1.7, 0.18, 1], [0, 0.08, 0]));

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 0.68),
      new THREE.MeshBasicMaterial({
        map: this.makeScreenTexture(game, index),
        color: game.playable ? 0xffffff : 0x777777,
      }),
    );
    screen.position.set(0, 1.46, 0.505);
    group.add(screen);

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.24, 0.26),
      new THREE.MeshBasicMaterial({ map: this.makeLabelTexture(game.playable ? "PLAYABLE" : "COMING SOON") }),
    );
    label.position.set(0, 0.66, 0.575);
    group.add(label);
    group.traverse((child) => {
      child.userData.index = index;
    });
    return group;
  }

  private makeSign(): THREE.Mesh {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.7, 0.64),
      new THREE.MeshBasicMaterial({ map: this.makeArcadeSignTexture() }),
    );
    sign.position.set(0, 3.22, -2.96);
    return sign;
  }

  private render(): void {
    const elapsed = (performance.now() - this.startedAt) / 1000;
    const railTargetX = window.innerWidth < 760 ? -(this.selected - 1) * 2.45 : 0;
    this.cabinetRail.position.x += (railTargetX - this.cabinetRail.position.x) * 0.08;
    for (const [index, cabinet] of this.cabinets.entries()) {
      const target = index === this.selected ? 1.08 : 0.94;
      const scale = cabinet.scale.x + (target - cabinet.scale.x) * 0.08;
      cabinet.scale.setScalar(scale);
      cabinet.position.y = index === this.selected ? Math.sin(elapsed * 2.2) * 0.025 : 0;
    }
    this.renderer.render(this.scene, this.camera);
  }

  private renderOverlay(): void {
    const game = GAMES[this.selected];
    const loop = this.save.getLoop();
    this.overlay.innerHTML = `
      <section class="arcade-title">
        <p>THREE.JS WEB GAMES</p>
        <h1>TAC0DE ARCADE</h1>
      </section>

      <section class="arcade-panel">
        <p class="game-status">${game.status}</p>
        <h2>${game.title}</h2>
        <p>${game.description}</p>
        <div class="game-meta">
          ${game.tags.map((tag) => `<span>${tag}</span>`).join("")}
          ${game.id === "no-vacancy" ? `<span>Loop ${loop}</span>` : ""}
        </div>
        <div class="how-to">
          <h3>How to play</h3>
          <p>Select a CRT cabinet. Press Play to enter the game.</p>
          <p>NO VACANCY: follow night-audit tasks, inspect records, watch CCTV, and compare what changed.</p>
        </div>
        <div class="portal-actions">
          <button class="secondary" type="button" data-prev>Prev</button>
          <button class="primary" type="button" data-play ${game.playable ? "" : "disabled"}>${game.playable ? "Play" : "Locked"}</button>
          <button class="secondary" type="button" data-next>Next</button>
          ${game.id === "no-vacancy" ? `<button class="secondary" type="button" data-reset>Reset progress</button>` : ""}
        </div>
      </section>
    `;
    this.overlay.querySelector("[data-prev]")?.addEventListener("click", () => this.select(this.selected - 1));
    this.overlay.querySelector("[data-next]")?.addEventListener("click", () => this.select(this.selected + 1));
    this.overlay.querySelector("[data-play]")?.addEventListener("click", () => {
      if (game.id === "no-vacancy" && game.playable) this.onPlayNoVacancy();
    });
    this.overlay.querySelector("[data-reset]")?.addEventListener("click", () => {
      this.save.reset();
      this.renderOverlay();
    });
  }

  private select(index: number): void {
    this.selected = (index + GAMES.length) % GAMES.length;
    this.renderOverlay();
  }

  private bindEvents(): void {
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.keyDown);
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
  }

  private readonly keyDown = (event: KeyboardEvent): void => {
    if (event.code === "ArrowLeft" || event.code === "KeyA") this.select(this.selected - 1);
    if (event.code === "ArrowRight" || event.code === "KeyD") this.select(this.selected + 1);
    if (event.code === "Enter" || event.code === "Space") {
      const game = GAMES[this.selected];
      if (game.id === "no-vacancy" && game.playable) this.onPlayNoVacancy();
    }
  };

  private readonly pointerDown = (event: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.cabinets, true);
    const index = hits[0]?.object.userData.index;
    if (typeof index === "number") this.select(index);
  };

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private box(color: number, size: [number, number, number], position: [number, number, number]): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      new THREE.MeshLambertMaterial({ color }),
    );
    mesh.position.set(position[0], position[1], position[2]);
    return mesh;
  }

  private light(x: number, y: number, z: number, color: number, intensity: number, distance: number): THREE.PointLight {
    const light = new THREE.PointLight(color, intensity, distance, 1.8);
    light.position.set(x, y, z);
    return light;
  }

  private makeScreenTexture(game: PortalGame, index: number): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 160;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing canvas context");
    context.fillStyle = game.playable ? "#101918" : "#111111";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = game.playable ? "#d94d37" : "#6f675e";
    context.font = "700 22px monospace";
    context.fillText(game.title, 18, 36);
    context.fillStyle = game.playable ? "#f0dfbc" : "#524c46";
    context.font = "700 54px monospace";
    context.fillText(index === 0 ? "203" : "///", 28, 116);
    context.strokeStyle = game.playable ? "#ffd36a" : "#36312d";
    context.strokeRect(10, 10, 236, 140);
    this.drawScanlines(context, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    return texture;
  }

  private makeLabelTexture(text: string): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing canvas context");
    context.fillStyle = "#171210";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#ffd36a";
    context.strokeRect(5, 5, 246, 54);
    context.fillStyle = "#ffd36a";
    context.font = "700 22px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 128, 34);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    return texture;
  }

  private makeArcadeSignTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing canvas context");
    context.fillStyle = "#130f0d";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#d94d37";
    context.font = "700 54px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("TAC0DE ARCADE", 256, 52);
    context.strokeStyle = "#ffd36a";
    context.strokeRect(8, 8, 496, 80);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    return texture;
  }

  private drawScanlines(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.fillStyle = "rgba(0, 0, 0, 0.18)";
    for (let y = 0; y < height; y += 4) {
      context.fillRect(0, y, width, 1);
    }
  }
}
