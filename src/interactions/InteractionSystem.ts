import * as THREE from "three";
import type { AudioSystem } from "../audio/AudioSystem";
import type { UI } from "../ui/UI";
import type { World } from "../world/World";

type Action = { type: string; id: string } | undefined;

export class InteractionSystem {
  prompt = "";
  private readonly raycaster = new THREE.Raycaster();
  private current?: { id: string; label: string; type: string };

  constructor(
    private readonly world: World,
    private readonly ui: UI,
    private readonly audio: AudioSystem,
  ) {}

  update(camera: THREE.Camera): void {
    this.current = undefined;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = this.raycaster.intersectObjects(this.world.group.children, true);
    for (const hit of hits) {
      if (hit.distance > 2.2) break;
      const meta = this.findMeta(hit.object);
      if (meta) {
        this.current = meta;
        this.prompt = `E / USE - ${meta.label}`;
        return;
      }
    }
    this.prompt = "";
  }

  interact(camera: THREE.Camera): Action {
    this.update(camera);
    if (!this.current) return undefined;
    const action = this.current;
    this.audio.click();
    if (action.type === "open-door") {
      const opened = this.world.toggleDoor(action.id);
      this.ui.showMessage(opened ? "The door gives way." : "Locked.", 1800);
    }
    if (action.id === "book") {
      this.ui.showMessage("Guest book: 201 checked out. 202 empty. 203 vacant.", 4200);
    }
    if (action.id === "phone") {
      this.audio.bell();
      this.ui.showMessage("Phone: Bring the key to 203. Do not look at the window.", 5200);
    }
    if (action.id === "key203") {
      this.ui.showMessage("Key 203. The tag is warm.", 2600);
    }
    if (action.id === "inspect203") {
      this.ui.showMessage("Room 203 is readable now: bed, window, bathroom door. No guest.", 4200);
    }
    if (action.id === "cctv") {
      this.ui.showMessage("CCTV shows the parking lot from above the office.", 3000);
    }
    if (action.id === "breaker") {
      this.ui.showMessage("Breaker reset. The hallway lights hum in the wrong order.", 4200);
    }
    return { type: action.type, id: action.id };
  }

  private findMeta(object: THREE.Object3D): { id: string; label: string; type: string } | undefined {
    let current: THREE.Object3D | null = object;
    while (current) {
      const meta = this.world.interactable.get(current);
      if (meta) return meta;
      current = current.parent;
    }
    return undefined;
  }
}
