import * as THREE from 'three';

export type GamePhase = 'playing' | 'ending' | 'dead';

export type InteractableType =
  | 'bell'
  | 'guestbook'
  | 'room-204-key'
  | 'door-204'
  | 'cctv'
  | 'vending'
  | 'tv'
  | 'phone'
  | 'bed'
  | 'bath'
  | 'mirror'
  | 'laundry-door'
  | 'washer'
  | 'front-exit';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

export interface GameState {
  phase: GamePhase;
  anomaly: number;
  elapsed: number;

  hasKey204: boolean;
  visited204: boolean;

  bellPressed: boolean;
  guestbookRead: boolean;
  cctvSeen: boolean;

  tvOn: boolean;
  phoneAnswered: boolean;
  bedChecked: boolean;
  bathChecked: boolean;
  mirrorChecked: boolean;

  laundryUnlocked: boolean;
  washerChecked: boolean;

  hallwayShifted: boolean;
  endingReady: boolean;
}

export type InteractableMesh = THREE.Mesh & {
  userData: THREE.Mesh['userData'] & {
    type: InteractableType;
    label: string;
    used?: boolean;
  };
};

export interface WorldRefs {
  walls: THREE.Mesh[];
  interactables: InteractableMesh[];
  dynamicObjects: THREE.Object3D[];
}