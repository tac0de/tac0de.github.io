const LOOP_KEY = "no-vacancy-loop";

const MAX_LOOP = 3;

export class SaveSystem {
  getLoop(): number {
    const value = Number(localStorage.getItem(LOOP_KEY) ?? "0");
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), MAX_LOOP) : 0;
  }

  completeLoop(): number {
    const next = Math.min(this.getLoop() + 1, MAX_LOOP);
    localStorage.setItem(LOOP_KEY, String(next));
    return next;
  }

  reset(): void {
    localStorage.removeItem(LOOP_KEY);
  }
}
