const KEY = "no-vacancy-complete";

export class SaveSystem {
  setCompleted(): void {
    localStorage.setItem(KEY, "1");
  }

  clear(): void {
    localStorage.removeItem(KEY);
  }
}
