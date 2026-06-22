import * as THREE from "three";
import type { AudioSystem } from "../audio/AudioSystem";
import type { UI } from "../ui/UI";
import type { World } from "../world/World";

type Mark = "cctv" | "book" | "phone" | "room203" | "key";

export class HorrorDirector {
  private elapsed = 0;
  private stage = 0;
  private chase = false;
  private readonly marks = new Set<Mark>();

  constructor(
    private readonly world: World,
    private readonly ui: UI,
    private readonly audio: AudioSystem,
  ) {}

  begin(): void {
    this.stage = 1;
    setTimeout(() => {
      this.audio.bell();
      this.ui.showMessage("The bell rings. No one came through the door.", 3600);
    }, 7000);
  }

  update(dt: number, player: THREE.Vector3): void {
    if (this.stage === 0) return;
    this.elapsed += dt;
    if (this.stage === 1 && this.marks.has("cctv")) {
      this.world.setParkingGhostVisible(true);
      this.ui.showMessage("CAM 02: Someone stands in the parking lot.", 3600);
      this.audio.stinger();
      this.stage = 2;
    }
    if (this.stage === 2 && this.marks.has("book")) {
      this.ui.showMessage("The ink moves. Room 203 now says OCCUPIED.", 4200);
      this.stage = 3;
    }
    if (this.stage === 3 && this.marks.has("phone")) {
      this.world.unlockDoor("storage");
      this.ui.showMessage("A lock clicks somewhere down the hall.", 3600);
      this.stage = 4;
    }
    if (this.stage === 4 && this.marks.has("room203")) {
      this.world.occupyRoom203();
      this.ui.showMessage("You heard breathing, but the room was empty seconds ago.", 4200);
      this.stage = 5;
    }
    if (this.stage === 5 && player.z < -8) {
      this.world.extendHallway();
      this.ui.showMessage("The hallway is longer on the way back.", 4200);
      this.audio.stinger();
      this.stage = 6;
    }
    if (this.stage === 6 && player.z > -2) {
      this.world.openDoor("storage");
      this.ui.showMessage("The storage door is open now.", 3200);
      this.stage = 7;
    }
    if (this.stage === 7 && player.x < -1.7 && player.z < -3.1) {
      this.startChase();
      this.stage = 8;
    }
  }

  mark(mark: Mark): void {
    this.marks.add(mark);
  }

  isChaseActive(): boolean {
    return this.chase;
  }

  private startChase(): void {
    this.chase = true;
    this.world.threat.position.set(0, 0, -15.2);
    this.world.threat.visible = true;
    this.ui.showMessage("Run.", 2400);
    this.audio.stinger();
  }
}
