import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { MotelScene } from '../world/MotelScene';
import { Input } from './Input';
import { Player } from './Player';
import { Interaction } from './Interaction';
import type { GameState, InteractableMesh } from './types';

export class Game {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    150
  );

  private renderer: THREE.WebGLRenderer;
  private controls: PointerLockControls;
  private clock = new THREE.Clock();

  private input = new Input();
  private motel: MotelScene;
  private player: Player;
  private interaction: Interaction;

  private playerLight = new THREE.PointLight(0xffdfac, 1.15, 18, 1.45);
  private pulse = 0;
  private messageTimer = 0;

  private state: GameState = {
    phase: 'playing',
    anomaly: 0,
    elapsed: 0,

    hasKey204: false,
    visited204: false,

    bellPressed: false,
    guestbookRead: false,
    cctvSeen: false,

    tvOn: false,
    phoneAnswered: false,
    bedChecked: false,
    bathChecked: false,
    mirrorChecked: false,

    laundryUnlocked: false,
    washerChecked: false,

    hallwayShifted: false,
    endingReady: false,
  };

  constructor(
    canvas: HTMLCanvasElement,
    private statusEl: HTMLDivElement,
    private messageEl: HTMLDivElement,
    private objectiveEl: HTMLDivElement,
    crosshairEl: HTMLDivElement
  ) {
    this.scene.background = new THREE.Color(0x25232a);
    this.scene.fog = new THREE.FogExp2(0x25232a, 0.012);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.3));

    this.controls = new PointerLockControls(this.camera, document.body);

    this.motel = new MotelScene(this.scene);
    this.player = new Player(this.camera, this.input.state, this.motel.collision);
    this.interaction = new Interaction(
      this.camera,
      this.motel.interactables,
      crosshairEl,
      messageEl
    );

    this.camera.position.set(0, 1.55, -4.4);
    this.camera.lookAt(0, 1.4, -2);

    const ambientLight = new THREE.AmbientLight(0xd6d0c2, 1.0);
    this.scene.add(ambientLight);
    this.scene.add(this.playerLight);

    this.input.onInteract(() => this.interact());

    window.addEventListener('click', () => {
      if (!this.controls.isLocked && this.state.phase === 'playing') {
        this.controls.lock();
      }
    });

    window.addEventListener('resize', () => this.resize());

    this.setObjective('프런트를 확인하라.');
    this.showMessage(
      '야간 근무 첫날.\n프런트에는 아무도 없고, 벨과 숙박부와 204호 키만 놓여 있다.',
      5600
    );
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.animate());
  }

  private animate(): void {
    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (this.state.phase === 'playing') {
      this.player.update(delta);
      this.interaction.updatePrompt();
      this.updateAtmosphere(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private interact(): void {
    if (this.state.phase !== 'playing') return;

    const focused = this.interaction.getFocused();
    if (!focused) return;

    switch (focused.userData.type) {
      case 'bell':
        this.handleBell();
        break;

      case 'guestbook':
        this.handleGuestbook();
        break;

      case 'room-204-key':
        this.handleKey204(focused);
        break;

      case 'cctv':
        this.raiseAnomaly();
        this.showMessage('CCTV 화면에는 복도 끝 204호가 보인다.\n화면 속 복도에는 당신이 이미 서 있다.', 4600);
        break;

      case 'vending':
        this.showMessage('자판기 안쪽에서 덜컹거리는 소리가 난다.\n상품 칸에는 객실 키들이 들어 있다.', 3600);
        break;

      case 'door-204':
        this.handleDoor204();
        break;

      case 'tv':
        this.handleTv();
        break;

      case 'phone':
        this.handlePhone();
        break;

      case 'bed':
        this.handleBed();
        break;

      case 'bath':
        this.handleBath();
        break;

      case 'mirror':
        this.handleMirror();
        break;
    }
  }

  private handleBell(): void {
    if (this.state.bellPressed) {
      this.showMessage('벨은 더 이상 울리지 않는다.');
      return;
    }

    this.state.bellPressed = true;
    this.raiseAnomaly();

    this.motel.hallwayLight.intensity = 1.2;

    this.showMessage('벨을 눌렀다.\n복도 조명이 하나씩 켜진다.', 3600);
    this.setObjective('숙박부를 읽고 204호 키를 집어라.');
  }

  private handleGuestbook(): void {
    if (this.state.endingReady) {
      this.state.phase = 'ending';
      document.body.classList.add('ending');
      this.showMessage(
        '숙박부 마지막 줄:\n“204호 손님은 이미 체크아웃했다.”\n\n그 아래에는 당신의 서명이 있다.',
        999999
      );
      this.setObjective('엔딩.');
      return;
    }

    this.state.guestbookRead = true;
    this.showMessage('숙박부에는 오늘 투숙객이 한 명뿐이다.\n204호. 이름은 번져서 읽을 수 없다.', 4200);
    this.setObjective('204호 키를 집어라.');
  }

  private handleKey204(mesh: InteractableMesh): void {
    if (this.state.hasKey204) {
      this.showMessage('이미 204호 키를 가지고 있다.');
      return;
    }

    this.state.hasKey204 = true;
    mesh.visible = false;
    mesh.userData.used = true;

    this.raiseAnomaly();

    this.showMessage('204호 키를 얻었다.\n키태그 뒷면에 “돌아오지 마”라고 적혀 있다.', 4200);
    this.setObjective('복도를 지나 204호로 가라.');
  }

  private handleDoor204(): void {
    if (!this.state.hasKey204) {
      this.showMessage('204호는 잠겨 있다.\n프런트에 키가 있을 것이다.');
      return;
    }

    if (!this.state.visited204) {
      this.state.visited204 = true;
      this.motel.openDoor('door-204');
      this.raiseAnomaly();

      this.showMessage('204호 문이 열렸다.\n방 안은 너무 평범해서 오히려 이상하다.', 4600);
      this.setObjective('204호 안의 TV, 침대, 욕실, 전화기를 조사하라.');
      return;
    }

    this.showMessage('204호 문틀이 조금씩 좁아지는 것 같다.');
  }

  private handleTv(): void {
    if (this.state.tvOn) {
      this.showMessage('TV는 프런트 화면만 반복해서 보여준다.');
      return;
    }

    this.state.tvOn = true;
    this.raiseAnomaly();

    this.showMessage('TV를 켰다.\n화면에는 프런트 카운터가 보인다.\n벨 옆에 피 묻은 손이 놓여 있다.', 5200);

    if (!this.state.hallwayShifted) {
      this.state.hallwayShifted = true;
      this.motel.addHallwayShift();
    }
  }

  private handlePhone(): void {
    if (this.state.phoneAnswered) {
      this.showMessage('수화기에서는 물 흐르는 소리만 난다.');
      return;
    }

    this.state.phoneAnswered = true;
    this.raiseAnomaly();

    this.showMessage('전화를 받았다.\n“프런트로 돌아오지 마.”\n목소리는 당신 목소리다.', 5200);
  }

  private handleBed(): void {
    if (this.state.bedChecked) {
      this.showMessage('침대 밑은 비어 있다. 방금 전까지는 아니었다.');
      return;
    }

    this.state.bedChecked = true;
    this.raiseAnomaly();

    this.showMessage('침대 아래에 젖은 신발 자국이 있다.\n자국은 욕실이 아니라 프런트 방향으로 이어진다.', 5000);
  }

  private handleBath(): void {
    if (this.state.bathChecked) {
      this.showMessage('욕조 물은 빠져 있다. 배수구 안에서 벨소리가 난다.');
      return;
    }

    this.state.bathChecked = true;
    this.state.laundryUnlocked = true;
    this.raiseAnomaly();

    this.showMessage('욕조 안에서 직원용 키카드를 찾았다.\n세탁실 문이 열릴 것 같다.', 5000);
    this.setObjective('프런트로 돌아가 숙박부를 다시 확인하라.');

    this.state.endingReady = true;
    this.motel.addFrontDeskBlood();
  }

  private handleMirror(): void {
    if (this.state.mirrorChecked) {
      this.showMessage('거울 속 방에는 침대가 없다.');
      return;
    }

    this.state.mirrorChecked = true;
    this.raiseAnomaly();

    this.showMessage('거울에는 당신 뒤에 서 있는 사람이 비친다.\n뒤돌아보면 아무도 없다.', 5000);
  }

  private raiseAnomaly(amount = 1): void {
    this.state.anomaly = Math.min(9, this.state.anomaly + amount);
  }

  private updateAtmosphere(delta: number): void {
    this.state.elapsed += delta;
    this.pulse += delta * (1.6 + this.state.anomaly * 0.18);

    this.playerLight.position.copy(this.camera.position);
    this.playerLight.intensity =
      1.05 + Math.sin(this.pulse) * 0.08 + this.state.anomaly * 0.025;

    this.motel.lobbyLight.intensity = 0.95 + Math.sin(this.pulse * 0.5) * 0.08;
    this.motel.signLight.intensity = 2.3 + Math.sin(this.pulse * 2.1) * 0.38;

    const fogDensity = 0.012 + this.state.anomaly * 0.0018;
    this.scene.fog = new THREE.FogExp2(0x25232a, fogDensity);

    const minutes = Math.floor(this.state.elapsed / 60).toString().padStart(2, '0');
    const seconds = Math.floor(this.state.elapsed % 60).toString().padStart(2, '0');

    this.statusEl.textContent = `CASE ${minutes}:${seconds} · ANOMALY ${this.state.anomaly}`;
  }

  private showMessage(text: string, ms = 3200): void {
    this.messageEl.textContent = text;

    window.clearTimeout(this.messageTimer);
    this.messageTimer = window.setTimeout(() => {
      this.messageEl.textContent = '';
    }, ms);
  }

  private setObjective(text: string): void {
    this.objectiveEl.textContent = `목표: ${text}`;
  }

  private resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}