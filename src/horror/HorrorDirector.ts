import * as THREE from "three";
import type { AudioSystem } from "../audio/AudioSystem";
import type { UI } from "../ui/UI";
import type { World } from "../world/World";

type Mark = "cctv" | "book" | "phone" | "room203" | "key" | "breaker";

const TASK_BOOK = "Check the guest book";
const TASK_KEY = "Prepare the Room 203 key";
const TASK_CCTV = "Check CCTV";
const TASK_ROOM = "Inspect Room 203";
const TASK_BREAKER = "Reset the breaker in storage";
const TASK_RUN = "Run outside";

export class HorrorDirector {
  private stage = 0;
  private chase = false;
  private bookReads = 0;
  private cctvChecks = 0;
  private roomInspections = 0;
  private keyTaken = false;
  private breakerReset = false;
  private hallwayExtended = false;
  private storageOpened = false;
  private readonly completed = new Set<string>();
  private tasks = [TASK_BOOK, TASK_KEY, TASK_CCTV];

  constructor(
    private readonly world: World,
    private readonly ui: UI,
    private readonly audio: AudioSystem,
  ) {}

  begin(): void {
    this.stage = 0;
    this.updateTasks();
    this.ui.showMessage("11:43 PM. Finish the night-audit checklist.", 4200);
  }

  update(_dt: number, player: THREE.Vector3): void {
    if (this.stage === 0 && this.cctvChecks > 0) {
      this.stage = 1;
      this.world.setCctvFigureStage(1);
      this.tasks = [TASK_ROOM];
      this.completed.add(TASK_CCTV);
      this.updateTasks();
      this.ui.showMessage("CCTV: a person stands in the parking lot. The lot is empty when seen directly.", 5200);
      this.audio.stinger();
    }

    if (this.stage === 1 && this.roomInspections > 0) {
      this.stage = 2;
      this.world.occupyRoom203();
      this.world.changeRoomNumbersTo203();
      this.world.setCctvFigureStage(2);
      this.completed.add(TASK_ROOM);
      this.tasks = ["Return to the front desk"];
      this.updateTasks();
      this.ui.showMessage("Every hallway plaque now reads 203. The room is no longer empty.", 5200);
      this.audio.bell();
    }

    if (this.stage === 2 && !this.hallwayExtended && player.z < -8) {
      this.hallwayExtended = true;
      this.stage = 3;
      this.world.extendHallway();
      this.world.setCctvFigureStage(3);
      this.tasks = [TASK_BREAKER];
      this.updateTasks();
      this.ui.showMessage("The hallway stretches as you leave Room 203. The storage lock clicks open.", 5200);
      this.audio.stinger();
    }

    if (this.stage === 3 && !this.storageOpened && player.z > -2) {
      this.storageOpened = true;
      this.world.openDoor("storage");
      this.ui.showMessage("Storage is open. The breaker box is lit.", 3600);
    }

    if (this.stage === 3 && this.breakerReset) {
      this.stage = 4;
      this.completed.add(TASK_BREAKER);
      this.tasks = [TASK_RUN];
      this.updateTasks(true);
      this.startChase();
    }
  }

  mark(mark: Mark): void {
    if (mark === "book") {
      this.bookReads += 1;
      this.completed.add(TASK_BOOK);
      this.world.corruptGuestBook();
      this.ui.showMessage("The guest book rewrites itself after you close it.", 4200);
      this.updateTasks();
    }
    if (mark === "key" && !this.keyTaken) {
      this.keyTaken = true;
      this.completed.add(TASK_KEY);
      this.world.removeDeskKey();
      this.ui.showMessage("The Room 203 key is ready. The spare key behind it is gone.", 3600);
      this.updateTasks();
    }
    if (mark === "cctv") this.cctvChecks += 1;
    if (mark === "room203") this.roomInspections += 1;
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
    this.ui.showMessage("The office phone rings from inside Room 203. Run.", 4200);
    this.audio.stinger();
  }
}
