import * as THREE from "three";
import type { AudioSystem } from "../audio/AudioSystem";
import type { UI } from "../ui/UI";
import type { World } from "../world/World";

type Mark = "cctv" | "book" | "phone" | "room203" | "key" | "breaker";

const TASK_BOOK = "Check the guest book";
const TASK_KEY = "Prepare the Room 203 key";
const TASK_CCTV = "Check CCTV";
const TASK_ROOM = "Inspect Room 203";
const TASK_FRONT = "Return to the front desk";
const TASK_BREAKER = "Reset the breaker in storage";
const TASK_RUN = "Run outside";

export class HorrorDirector {
  private stage = 0;
  private chase = false;
  private bookChecked = false;
  private cctvChecked = false;
  private keyTaken = false;
  private roomInspected = false;
  private breakerReset = false;
  private hallwayExtended = false;
  private storageOpened = false;
  private readonly completed = new Set<string>();
  private tasks = [TASK_BOOK, TASK_KEY, TASK_CCTV];

  constructor(
    private readonly world: World,
    private readonly ui: UI,
    private readonly audio: AudioSystem,
    private readonly loop: number,
  ) {}

  begin(): void {
    this.stage = 0;
    this.updateTasks(this.loop >= 2);
    const line =
      this.loop === 0
        ? "11:43 PM. Finish the night-audit checklist."
        : this.loop === 1
          ? "11:43 PM. The incident report has reopened."
          : this.loop === 2
            ? "11:43 PM. Room 203 is already on the ledger."
            : "11:43 PM. The motel knows your shift number.";
    this.ui.showMessage(line, 4600);
  }

  update(_dt: number, player: THREE.Vector3): void {
    if (this.stage === 0 && this.bookChecked && this.keyTaken && this.cctvChecked) {
      this.stage = 1;
      this.world.setCctvFigureStage(1 + this.loop);
      this.tasks = [TASK_ROOM];
      this.completed.add(TASK_CCTV);
      this.updateTasks(this.loop >= 2);
      this.ui.showMessage("CCTV shows someone in the parking lot. The window shows no one.", 5200);
      this.audio.stinger();
    }

    if (this.stage === 1 && this.roomInspected) {
      this.stage = 2;
      this.world.occupyRoom203();
      this.world.changeRoomNumbersTo203();
      this.world.corruptGuestBook();
      this.world.setCctvFigureStage(2 + this.loop);
      this.completed.add(TASK_ROOM);
      this.tasks = [TASK_FRONT];
      this.updateTasks(this.loop >= 2);
      this.ui.showMessage("The ledger updates itself: 203 OCCUPIED. Every plaque tries to agree.", 5600);
      this.audio.bell();
    }

    if (this.stage === 2 && !this.hallwayExtended && player.z < -8) {
      this.hallwayExtended = true;
      this.world.extendHallway();
      this.world.setCctvFigureStage(3 + this.loop);
      this.ui.showMessage("The walk back is longer than the walk in.", 4400);
      this.audio.stinger();
    }

    if (this.stage === 2 && player.z > 1) {
      this.stage = 3;
      this.completed.add(TASK_FRONT);
      this.tasks = [TASK_BREAKER];
      this.updateTasks(true);
      this.ui.showMessage("The desk clock stops. Storage unlocks itself.", 4200);
    }

    if (this.stage === 3 && !this.storageOpened) {
      this.storageOpened = true;
      this.world.openDoor("storage");
    }

    if (this.stage === 3 && this.breakerReset) {
      this.stage = 4;
      this.completed.add(TASK_BREAKER);
      this.tasks = [TASK_RUN];
      this.world.markCheckedIn();
      this.world.setLobbyReflectionVisible(true);
      this.updateTasks(true);
      this.startChase();
    }
  }

  mark(mark: Mark): void {
    if (mark === "book" && !this.bookChecked) {
      this.bookChecked = true;
      this.completed.add(TASK_BOOK);
      const text =
        this.loop === 0
          ? "Guest book confirms the baseline: 203 VACANT."
          : "Guest book already has corrections in wet ink.";
      this.ui.showMessage(text, 4200);
      this.updateTasks(this.loop >= 2);
    }
    if (mark === "key" && !this.keyTaken) {
      this.keyTaken = true;
      this.completed.add(TASK_KEY);
      this.world.removeDeskKey();
      this.ui.showMessage("Room 203 key prepared. The spare key behind it is gone.", 3800);
      this.updateTasks(this.loop >= 2);
    }
    if (mark === "cctv") {
      this.cctvChecked = true;
      this.completed.add(TASK_CCTV);
      this.updateTasks(this.loop >= 2);
    }
    if (mark === "room203") this.roomInspected = true;
    if (mark === "breaker") this.breakerReset = true;
  }

  isChaseActive(): boolean {
    return this.chase;
  }

  private updateTasks(corrupt = false): void {
    this.ui.setTasks(this.tasks, this.completed, corrupt);
  }

  private startChase(): void {
    this.chase = true;
    this.world.threat.position.set(0, 0, -15.2);
    this.world.threat.visible = true;
    this.ui.showMessage("CCTV shows the front desk. Someone else is sitting where you stood. Run.", 5200);
    this.audio.stinger();
  }
}
