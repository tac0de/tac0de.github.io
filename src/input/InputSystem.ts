import type { UI } from "../ui/UI";

type Vec2 = { x: number; y: number };

export class InputSystem {
  onInteract?: () => void;
  onFlashlight?: () => void;
  onStart?: () => void;
  readonly isTouch = matchMedia("(pointer: coarse)").matches;
  private readonly keys = new Set<string>();
  private readonly look: Vec2 = { x: 0, y: 0 };
  private readonly move: Vec2 = { x: 0, y: 0 };
  private cancelQueued = false;
  private pointerLocked = false;
  private rightTouchId: number | null = null;
  private lastTouch: Vec2 = { x: 0, y: 0 };

  constructor(private readonly root: HTMLElement, private readonly ui: UI) {
    window.addEventListener("keydown", (event) => this.keyDown(event));
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === this.root;
    });
    root.addEventListener("click", () => {
      if (!this.isTouch && !this.pointerLocked) {
        void root.requestPointerLock().catch(() => undefined);
      }
    });
    window.addEventListener("mousemove", (event) => {
      if (this.pointerLocked) {
        this.look.x += event.movementX;
        this.look.y += event.movementY;
      }
    });
    this.bindTouchLook();
  }

  bindJoystick(active: boolean, x: number, y: number): void {
    this.move.x = active ? x : 0;
    this.move.y = active ? y : 0;
  }

  interact(): void {
    this.onInteract?.();
  }

  flashlight(): void {
    this.onFlashlight?.();
  }

  start(): void {
    this.onStart?.();
  }

  getMovement(): Vec2 {
    if (this.isTouch) return { ...this.move };
    const x = Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA"));
    const y = Number(this.keys.has("KeyW")) - Number(this.keys.has("KeyS"));
    return { x, y };
  }

  consumeLookDelta(): Vec2 {
    const value = { ...this.look };
    this.look.x = 0;
    this.look.y = 0;
    return value;
  }

  consumeCancel(): boolean {
    const value = this.cancelQueued;
    this.cancelQueued = false;
    return value;
  }

  private keyDown(event: KeyboardEvent): void {
    this.keys.add(event.code);
    if (event.code === "KeyE") this.onInteract?.();
    if (event.code === "KeyF") this.onFlashlight?.();
    if (event.code === "Escape") this.cancelQueued = true;
    if (event.code === "Space" || event.code === "Enter") this.ui.start();
  }

  private bindTouchLook(): void {
    window.addEventListener(
      "touchstart",
      (event) => {
        for (const touch of event.changedTouches) {
          if (touch.clientX > window.innerWidth * 0.42 && this.rightTouchId === null) {
            this.rightTouchId = touch.identifier;
            this.lastTouch = { x: touch.clientX, y: touch.clientY };
          }
        }
      },
      { passive: false },
    );
    window.addEventListener(
      "touchmove",
      (event) => {
        for (const touch of event.changedTouches) {
          if (touch.identifier === this.rightTouchId) {
            this.look.x += (touch.clientX - this.lastTouch.x) * 0.008;
            this.look.y += (touch.clientY - this.lastTouch.y) * 0.008;
            this.lastTouch = { x: touch.clientX, y: touch.clientY };
            event.preventDefault();
          }
        }
      },
      { passive: false },
    );
    window.addEventListener("touchend", (event) => {
      for (const touch of event.changedTouches) {
        if (touch.identifier === this.rightTouchId) this.rightTouchId = null;
      }
    });
  }
}
