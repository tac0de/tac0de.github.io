import type { InputSystem } from "../input/InputSystem";

export class UI {
  private readonly overlay: HTMLDivElement;
  private readonly message: HTMLDivElement;
  private readonly prompt: HTMLDivElement;
  private readonly tasks: HTMLDivElement;
  private readonly startPanel: HTMLDivElement;
  private readonly cctv: HTMLDivElement;
  private readonly ending: HTMLDivElement;
  private readonly joystick: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly interact: HTMLButtonElement;
  private readonly flash: HTMLButtonElement;
  private messageTimer = 0;
  private started = false;
  onReset?: () => void;
  onContinue?: () => void;

  constructor(root: HTMLElement) {
    this.overlay = document.createElement("div");
    this.overlay.className = "hud";
    this.message = this.make("div", "message");
    this.prompt = this.make("div", "prompt");
    this.tasks = this.make("div", "tasks");
    this.cctv = this.make("div", "cctv hidden", "CAM 02 - PARKING LOT");
    this.ending = this.make("div", "ending hidden");
    this.startPanel = this.make(
      "div",
      "start-panel",
      "<h1>NO VACANCY</h1><p>Night audit. 11:43 PM.</p><button>Start Shift</button>",
    );
    this.joystick = this.make("div", "joystick");
    this.knob = this.make("div", "knob");
    this.interact = this.make("button", "touch-button interact-button", "USE");
    this.flash = this.make("button", "touch-button flash-button", "LIGHT");
    this.joystick.append(this.knob);
    this.overlay.append(
      this.message,
      this.prompt,
      this.tasks,
      this.cctv,
      this.startPanel,
      this.ending,
      this.joystick,
      this.interact,
      this.flash,
    );
    root.append(this.overlay);
    this.startPanel.querySelector("button")?.addEventListener("click", () => this.start());
  }

  bindInput(input: InputSystem): void {
    this.interact.addEventListener("click", () => input.interact());
    this.flash.addEventListener("click", () => input.flashlight());
    this.bindJoystick(input);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.startPanel.classList.add("hidden");
    this.message.textContent = "";
    this.dispatchStart();
  }

  setStartLoop(loop: number): void {
    const copy =
      loop === 0
        ? ["Night audit. 11:43 PM.", "Start Shift"]
        : loop === 1
          ? ["Incident report reopened. 11:43 PM.", "Continue Audit"]
          : loop === 2
          ? ["Room 203 is ready. 11:43 PM.", "Continue Check-In"]
          : ["Staff reassigned. 11:43 PM.", "Return to Desk"];
    this.startPanel.innerHTML = `
      <div class="shift-card">
        <p class="shift-kicker">Motel night audit</p>
        <h1>NO VACANCY</h1>
        <p>${copy[0]}</p>
        <div class="shift-brief">
          <h2>How to play</h2>
          <div><span>1</span><p>Read the task list and complete the motel desk work.</p></div>
          <div><span>2</span><p>Interact with highlighted objects: guest book, key, CCTV, Room 203, breaker.</p></div>
          <div><span>3</span><p>Compare what records and CCTV show against the physical motel.</p></div>
        </div>
        <div class="shift-controls">
          <p><strong>Desktop</strong> WASD move, mouse look, E interact, F flashlight.</p>
          <p><strong>Mobile</strong> left stick, right drag, USE, LIGHT.</p>
        </div>
        <button>${copy[1]}</button>
      </div>
    `;
    this.startPanel.querySelector("button")?.addEventListener("click", () => this.start());
  }

  setPrompt(text: string): void {
    this.prompt.textContent = text;
  }

  setTasks(tasks: string[], completed = new Set<string>(), corrupt = false): void {
    this.tasks.classList.toggle("corrupt", corrupt);
    this.tasks.innerHTML = `<h2>Night Audit</h2>${tasks
      .map((task) => {
        const done = completed.has(task);
        const label = corrupt && !done ? this.corruptText(task) : task;
        return `<div class="${done ? "done" : ""}"><span>${done ? "[x]" : "[ ]"}</span>${label}</div>`;
      })
      .join("")}`;
  }

  setCctv(active: boolean): void {
    this.cctv.classList.toggle("hidden", !active);
    this.showMessage(active ? "CCTV feed. Press E or USE to leave." : "", 1800);
  }

  showMessage(text: string, ms = 3200): void {
    this.message.textContent = text;
    window.clearTimeout(this.messageTimer);
    if (text) {
      this.messageTimer = window.setTimeout(() => {
        this.message.textContent = "";
      }, ms);
    }
  }

  showEnding(text: string): void {
    this.ending.innerHTML = `<h2>SHIFT COMPLETE</h2><p>${text}</p><button>Next Audit</button><button class="quiet">Reset</button>`;
    this.ending.classList.remove("hidden");
    this.ending.querySelector("button")?.addEventListener("click", () => this.onContinue?.());
    this.ending.querySelector(".quiet")?.addEventListener("click", () => this.onReset?.());
  }

  private dispatchStart(): void {
    window.dispatchEvent(new CustomEvent("game-start"));
  }

  private corruptText(text: string): string {
    return text
      .replace(/[aeiou]/gi, "0")
      .replace(/Room 203/i, "R00m 203")
      .replace(/CCTV/i, "CAM ??");
  }

  private bindJoystick(input: InputSystem): void {
    let active = false;
    const update = (clientX: number, clientY: number) => {
      const rect = this.joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const len = Math.min(Math.hypot(dx, dy), 46);
      const angle = Math.atan2(dy, dx);
      const x = Math.cos(angle) * len;
      const y = Math.sin(angle) * len;
      this.knob.style.transform = `translate(${x}px, ${y}px)`;
      input.bindJoystick(true, x / 46, -y / 46);
    };
    this.joystick.addEventListener("pointerdown", (event) => {
      active = true;
      this.joystick.setPointerCapture(event.pointerId);
      update(event.clientX, event.clientY);
    });
    this.joystick.addEventListener("pointermove", (event) => {
      if (active) update(event.clientX, event.clientY);
    });
    this.joystick.addEventListener("pointerup", () => {
      active = false;
      this.knob.style.transform = "translate(0, 0)";
      input.bindJoystick(false, 0, 0);
    });
    window.addEventListener("game-start", () => input.start());
  }

  private make<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    html = "",
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    element.className = className;
    element.innerHTML = html;
    return element;
  }
}
