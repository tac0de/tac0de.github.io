import * as THREE from "three";

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(68, 1, 0.05, 80);

  constructor(root: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x2d2926);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.enabled = false;
    root.append(this.renderer.domElement);
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }

  setPixelStyle(): void {
    this.renderer.domElement.className = "game-canvas";
    this.scene.fog = new THREE.FogExp2(0x2d2926, 0.042);
  }

  setAnimationLoop(callback: () => void): void {
    this.renderer.setAnimationLoop(callback);
  }

  render(overrideCamera?: THREE.Camera): void {
    this.renderer.render(this.scene, overrideCamera ?? this.camera);
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(dpr);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
