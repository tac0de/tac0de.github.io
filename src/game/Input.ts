import type { InputState } from './types';

export class Input {
  readonly state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  };

  private interactListeners: Array<() => void> = [];

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  onInteract(callback: () => void): void {
    this.interactListeners.push(callback);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyW') this.state.forward = true;
    if (event.code === 'KeyS') this.state.backward = true;
    if (event.code === 'KeyA') this.state.left = true;
    if (event.code === 'KeyD') this.state.right = true;
    if (event.code === 'ShiftLeft') this.state.sprint = true;

    if (event.code === 'KeyE') {
      for (const listener of this.interactListeners) {
        listener();
      }
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'KeyW') this.state.forward = false;
    if (event.code === 'KeyS') this.state.backward = false;
    if (event.code === 'KeyA') this.state.left = false;
    if (event.code === 'KeyD') this.state.right = false;
    if (event.code === 'ShiftLeft') this.state.sprint = false;
  };
}