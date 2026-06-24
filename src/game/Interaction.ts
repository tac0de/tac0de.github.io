import * as THREE from 'three';
import type { InteractableMesh } from './types';

export class Interaction {
  private raycaster = new THREE.Raycaster();
  private screenCenter = new THREE.Vector2(0, 0);

  constructor(
    private camera: THREE.PerspectiveCamera,
    private interactables: InteractableMesh[],
    private crosshairEl: HTMLDivElement,
    private messageEl: HTMLDivElement
  ) {}

  getFocused(): InteractableMesh | null {
    this.raycaster.setFromCamera(this.screenCenter, this.camera);

    const hits = this.raycaster.intersectObjects(this.interactables, false);
    if (!hits.length) {
      this.crosshairEl.classList.remove('active');
      return null;
    }

    const hit = hits[0];

    if (!hit || hit.distance > 2.7 || !hit.object.visible) {
      this.crosshairEl.classList.remove('active');
      return null;
    }

    this.crosshairEl.classList.add('active');
    return hit.object as InteractableMesh;
  }

  updatePrompt(): void {
    const focused = this.getFocused();
    if (!focused) return;

    this.messageEl.textContent = `E: ${focused.userData.label}`;
  }
}