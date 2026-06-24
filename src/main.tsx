import React, {
  ReactNode,
  StrictMode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Text } from '@react-three/drei';
import * as THREE from 'three';

type Phase = 'playing' | 'ending' | 'dead';

type InteractableType =
  | 'bell'
  | 'guestbook'
  | 'key204'
  | 'door204'
  | 'cctv'
  | 'vending'
  | 'tv'
  | 'phone'
  | 'bed'
  | 'bath'
  | 'mirror'
  | 'exit';

interface GameState {
  phase: Phase;
  anomaly: number;
  objective: string;
  message: string;

  bellPressed: boolean;
  guestbookRead: boolean;
  hasKey204: boolean;
  door204Open: boolean;
  tvOn: boolean;
  phoneAnswered: boolean;
  bedChecked: boolean;
  bathChecked: boolean;
  mirrorChecked: boolean;
  endingReady: boolean;
}

interface InteractableRecord {
  mesh: THREE.Mesh;
  type: InteractableType;
  label: string;
}

interface WallBox {
  x: number;
  z: number;
  sx: number;
  sz: number;
}

const COLORS = {
  background: '#2b2930',
  wall: '#7b7467',
  darkWall: '#514a44',
  floor: '#5b574d',
  carpet: '#84323c',
  door: '#7c4c32',
  wood: '#6b452f',
  paper: '#ded0a5',
  key: '#f2ce65',
  metal: '#77756d',
  neonPink: '#ff3d75',
  neonBlue: '#75c8ff',
  screen: '#8fc6cf',
  blood: '#6f0808',
  black: '#050505',
  warning: '#ffcc66',
};

const initialState: GameState = {
  phase: 'playing',
  anomaly: 0,
  objective: '프런트의 벨, 숙박부, 204호 키를 확인하라.',
  message:
    '야간 근무 첫날.\n프런트에는 아무도 없고, 벨과 숙박부와 204호 키만 놓여 있다.',

  bellPressed: false,
  guestbookRead: false,
  hasKey204: false,
  door204Open: false,
  tvOn: false,
  phoneAnswered: false,
  bedChecked: false,
  bathChecked: false,
  mirrorChecked: false,
  endingReady: false,
};

function App() {
  const [game, setGame] = useState<GameState>(initialState);
  const [prompt, setPrompt] = useState('');
  const showMessageTimer = useRef<number | null>(null);

  const showMessage = (message: string, ms = 3600) => {
    setGame((prev) => ({ ...prev, message }));

    if (showMessageTimer.current !== null) {
      window.clearTimeout(showMessageTimer.current);
    }

    showMessageTimer.current = window.setTimeout(() => {
      setGame((prev) => ({ ...prev, message: '' }));
    }, ms);
  };

  const patchGame = (patch: Partial<GameState>) => {
    setGame((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const raiseAnomaly = (amount = 1) => {
    setGame((prev) => ({
      ...prev,
      anomaly: Math.min(prev.anomaly + amount, 9),
    }));
  };

  return (
    <>
      <Canvas
        shadows={false}
        camera={{ position: [0, 1.55, -4.8], fov: 70, near: 0.05, far: 150 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.35]}
      >
        <color attach="background" args={[COLORS.background]} />
        <fogExp2 attach="fog" args={[COLORS.background, 0.012]} />

        <ambientLight intensity={1.05} color="#d6d0c2" />
        <pointLight position={[0, 2.7, -2.8]} intensity={1.15} distance={14} color="#ffd7a0" />
        <pointLight position={[0, 3.2, -8.8]} intensity={2.5} distance={24} color={COLORS.neonPink} />
        <pointLight position={[0, 2.5, 14]} intensity={0.9} distance={18} color="#ffd49a" />
        <pointLight position={[9, 2.2, 28]} intensity={0.9} distance={14} color="#93cfff" />

        <GameScene
          game={game}
          patchGame={patchGame}
          raiseAnomaly={raiseAnomaly}
          showMessage={showMessage}
          setPrompt={setPrompt}
        />

        <PointerLockControls />
      </Canvas>

      <Hud game={game} prompt={prompt} />
    </>
  );
}

function GameScene({
  game,
  patchGame,
  raiseAnomaly,
  showMessage,
  setPrompt,
}: {
  game: GameState;
  patchGame: (patch: Partial<GameState>) => void;
  raiseAnomaly: (amount?: number) => void;
  showMessage: (message: string, ms?: number) => void;
  setPrompt: (prompt: string) => void;
}) {
  const { camera } = useThree();

  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
  });

  const interactables = useRef<InteractableRecord[]>([]);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);
  const playerLight = useRef<THREE.PointLight>(null);

  const walls = useMemo<WallBox[]>(() => {
    const base: WallBox[] = [
      // Front lobby
      { x: 0, z: -8, sx: 18, sz: 0.45 },
      { x: -9, z: -1, sx: 0.45, sz: 14 },
      { x: 9, z: -1, sx: 0.45, sz: 14 },
      { x: -5.8, z: 6, sx: 6.4, sz: 0.45 },
      { x: 5.8, z: 6, sx: 6.4, sz: 0.45 },

      // Hallway
      { x: -3.9, z: 13.8, sx: 0.45, sz: 31 },
      { x: 3.9, z: 13.8, sx: 0.45, sz: 31 },

      // Parking side fences
      { x: -12, z: -14, sx: 0.45, sz: 12 },
      { x: 12, z: -14, sx: 0.45, sz: 12 },

      // Room 204 walls
      { x: 8.4, z: 22, sx: 12, sz: 0.45 },
      { x: 8.4, z: 34, sx: 12, sz: 0.45 },
      { x: 14.4, z: 28, sx: 0.45, sz: 12 },
      { x: 2.4, z: 25.2, sx: 0.45, sz: 6 },
      { x: 2.4, z: 31.6, sx: 0.45, sz: 4.8 },

      // Big furniture collision
      { x: 0, z: -2.8, sx: 6.5, sz: 1.35 },
      { x: 8.1, z: 24.6, sx: 3.25, sz: 1.9 },
      { x: 11.8, z: 29.5, sx: 1.55, sz: 0.65 },
      { x: 12.1, z: 32.1, sx: 1.7, sz: 2.25 },
    ];

    if (!game.door204Open) {
      base.push({ x: 2.42, z: 28, sx: 0.5, sz: 1.9 });
    }

    if (game.tvOn) {
      base.push({ x: 0, z: 8.7, sx: 2.1, sz: 0.25 });
    }

    return base;
  }, [game.door204Open, game.tvOn]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'KeyW') keys.current.w = true;
      if (event.code === 'KeyA') keys.current.a = true;
      if (event.code === 'KeyS') keys.current.s = true;
      if (event.code === 'KeyD') keys.current.d = true;
      if (event.code === 'ShiftLeft') keys.current.shift = true;
      if (event.code === 'KeyE') interact();
    };

    const up = (event: KeyboardEvent) => {
      if (event.code === 'KeyW') keys.current.w = false;
      if (event.code === 'KeyA') keys.current.a = false;
      if (event.code === 'KeyS') keys.current.s = false;
      if (event.code === 'KeyD') keys.current.d = false;
      if (event.code === 'ShiftLeft') keys.current.shift = false;
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  });

  function registerInteractable(record: InteractableRecord) {
    interactables.current.push(record);

    return () => {
      interactables.current = interactables.current.filter((item) => item.mesh !== record.mesh);
    };
  }

  function getFocused() {
    raycaster.setFromCamera(center, camera);

    const meshes = interactables.current
      .filter((item) => item.mesh.visible)
      .map((item) => item.mesh);

    const hits = raycaster.intersectObjects(meshes, false);
    const hit = hits[0];

    if (!hit || hit.distance > 2.8) {
      setPrompt('');
      return null;
    }

    const found = interactables.current.find((item) => item.mesh === hit.object);
    if (!found) {
      setPrompt('');
      return null;
    }

    setPrompt(`E: ${found.label}`);
    return found;
  }

  function interact() {
    if (game.phase !== 'playing') return;

    const focused = getFocused();
    if (!focused) return;

    switch (focused.type) {
      case 'bell': {
        if (game.bellPressed) {
          showMessage('벨은 더 이상 울리지 않는다.');
          return;
        }

        patchGame({
          bellPressed: true,
          objective: '숙박부를 읽고 204호 키를 집어라.',
        });
        raiseAnomaly();
        showMessage('벨을 눌렀다.\n복도 조명이 하나씩 켜진다.', 3600);
        return;
      }

      case 'guestbook': {
        if (game.endingReady) {
          patchGame({
            phase: 'ending',
            objective: '엔딩.',
          });

          showMessage(
            '숙박부 마지막 줄:\n“204호 손님은 이미 체크아웃했다.”\n\n그 아래에는 당신의 서명이 있다.',
            999999
          );
          return;
        }

        patchGame({
          guestbookRead: true,
          objective: '204호 키를 집어라.',
        });

        showMessage(
          '숙박부에는 오늘 투숙객이 한 명뿐이다.\n204호. 이름은 번져서 읽을 수 없다.',
          4200
        );
        return;
      }

      case 'key204': {
        if (game.hasKey204) {
          showMessage('이미 204호 키를 가지고 있다.');
          return;
        }

        patchGame({
          hasKey204: true,
          objective: '복도를 지나 204호로 가라.',
        });

        raiseAnomaly();
        showMessage('204호 키를 얻었다.\n키태그 뒷면에 “돌아오지 마”라고 적혀 있다.', 4200);
        return;
      }

      case 'cctv': {
        raiseAnomaly();
        showMessage(
          'CCTV 화면에는 복도 끝 204호가 보인다.\n화면 속 복도에는 당신이 이미 서 있다.',
          4600
        );
        return;
      }

      case 'vending': {
        showMessage(
          '자판기 안쪽에서 덜컹거리는 소리가 난다.\n상품 칸에는 객실 키들이 들어 있다.',
          3600
        );
        return;
      }

      case 'door204': {
        if (!game.hasKey204) {
          showMessage('204호는 잠겨 있다.\n프런트에 키가 있을 것이다.');
          return;
        }

        if (!game.door204Open) {
          patchGame({
            door204Open: true,
            objective: '204호 안의 TV, 전화기, 침대, 욕실, 거울을 조사하라.',
          });
          raiseAnomaly();
          showMessage('204호 문이 열렸다.\n방 안은 너무 평범해서 오히려 이상하다.', 4600);
          return;
        }

        showMessage('204호 문틀이 조금씩 좁아지는 것 같다.');
        return;
      }

      case 'tv': {
        if (game.tvOn) {
          showMessage('TV는 프런트 화면만 반복해서 보여준다.');
          return;
        }

        patchGame({ tvOn: true });
        raiseAnomaly();
        showMessage(
          'TV를 켰다.\n화면에는 프런트 카운터가 보인다.\n벨 옆에 피 묻은 손이 놓여 있다.',
          5200
        );
        return;
      }

      case 'phone': {
        if (game.phoneAnswered) {
          showMessage('수화기에서는 물 흐르는 소리만 난다.');
          return;
        }

        patchGame({ phoneAnswered: true });
        raiseAnomaly();
        showMessage('전화를 받았다.\n“프런트로 돌아오지 마.”\n목소리는 당신 목소리다.', 5200);
        return;
      }

      case 'bed': {
        if (game.bedChecked) {
          showMessage('침대 밑은 비어 있다. 방금 전까지는 아니었다.');
          return;
        }

        patchGame({ bedChecked: true });
        raiseAnomaly();
        showMessage(
          '침대 아래에 젖은 신발 자국이 있다.\n자국은 욕실이 아니라 프런트 방향으로 이어진다.',
          5000
        );
        return;
      }

      case 'bath': {
        if (game.bathChecked) {
          showMessage('욕조 물은 빠져 있다. 배수구 안에서 벨소리가 난다.');
          return;
        }

        patchGame({
          bathChecked: true,
          endingReady: true,
          objective: '프런트로 돌아가 숙박부를 다시 확인하라.',
        });

        raiseAnomaly();
        showMessage(
          '욕조 안에서 직원용 키카드를 찾았다.\n프런트 숙박부가 바뀐 것 같다.',
          5200
        );
        return;
      }

      case 'mirror': {
        if (game.mirrorChecked) {
          showMessage('거울 속 방에는 침대가 없다.');
          return;
        }

        patchGame({ mirrorChecked: true });
        raiseAnomaly();
        showMessage('거울에는 당신 뒤에 서 있는 사람이 비친다.\n뒤돌아보면 아무도 없다.', 5000);
        return;
      }

      case 'exit': {
        showMessage('밖은 비가 너무 세다.\n지금은 프런트를 떠날 수 없다.');
        return;
      }
    }
  }

  function canMoveTo(position: THREE.Vector3) {
    const radius = 0.45;

    for (const wall of walls) {
      const dx = Math.abs(position.x - wall.x);
      const dz = Math.abs(position.z - wall.z);

      if (dx < wall.sx / 2 + radius && dz < wall.sz / 2 + radius) {
        return false;
      }
    }

    return true;
  }

  useFrame((_, delta) => {
    if (game.phase !== 'playing') return;

    const dt = Math.min(delta, 0.05);

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const right = new THREE.Vector3().crossVectors(direction, camera.up).normalize();

    let forwardMove = 0;
    let rightMove = 0;

    if (keys.current.w) forwardMove += 1;
    if (keys.current.s) forwardMove -= 1;
    if (keys.current.d) rightMove += 1;
    if (keys.current.a) rightMove -= 1;

    const length = Math.hypot(forwardMove, rightMove);

    if (length > 0) {
      forwardMove /= length;
      rightMove /= length;

      const speed = keys.current.shift ? 5.2 : 3.15;
      const movement = new THREE.Vector3();

      movement.addScaledVector(direction, forwardMove * speed * dt);
      movement.addScaledVector(right, rightMove * speed * dt);

      const nextX = camera.position.clone();
      nextX.x += movement.x;

      if (canMoveTo(nextX)) {
        camera.position.x = nextX.x;
      }

      const nextZ = camera.position.clone();
      nextZ.z += movement.z;

      if (canMoveTo(nextZ)) {
        camera.position.z = nextZ.z;
      }
    }

    getFocused();

    if (playerLight.current) {
      playerLight.current.position.copy(camera.position);
      playerLight.current.intensity =
        1.0 + Math.sin(performance.now() * 0.003) * 0.08 + game.anomaly * 0.04;
    }
  });

  return (
    <>
      <pointLight ref={playerLight} intensity={1.05} distance={18} color="#ffdfac" />

      <ParkingLot />
      <Lobby
        registerInteractable={registerInteractable}
        hasKey204={game.hasKey204}
        endingReady={game.endingReady}
      />
      <Hallway
        registerInteractable={registerInteractable}
        hallwayShifted={game.tvOn}
      />
      <Room204
        registerInteractable={registerInteractable}
        doorOpen={game.door204Open}
        tvOn={game.tvOn}
        bedChecked={game.bedChecked}
        bathChecked={game.bathChecked}
      />

      {game.mirrorChecked && <StandingFigure position={[0, 0, 24]} />}
      {game.endingReady && <FrontDeskBlood />}
    </>
  );
}

function Hud({ game, prompt }: { game: GameState; prompt: string }) {
  return (
    <div className={`hud ${game.phase}`}>
      <div className="topLeft">
        <div className="title">MOTEL 204</div>
        <div className="hint">Click · WASD Move · Shift Run · E Interact</div>
      </div>

      <div className="status">ANOMALY {game.anomaly}</div>

      <div className="objective">목표: {game.objective}</div>

      <div className="message">{prompt || game.message}</div>

      <div className={prompt ? 'crosshair active' : 'crosshair'} />
    </div>
  );
}

function Box({
  position,
  scale,
  color,
  basic = false,
  children,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  basic?: boolean;
  children?: ReactNode;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={scale} />
      {basic ? (
        <meshBasicMaterial color={color} />
      ) : (
        <meshStandardMaterial color={color} roughness={1} metalness={0} />
      )}
      {children}
    </mesh>
  );
}

function InteractableBox({
  type,
  label,
  registerInteractable,
  position,
  scale,
  color,
  visible = true,
  basic = false,
}: {
  type: InteractableType;
  label: string;
  registerInteractable: (record: InteractableRecord) => () => void;
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  visible?: boolean;
  basic?: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!ref.current) return;

    return registerInteractable({
      mesh: ref.current,
      type,
      label,
    });
  }, [type, label, registerInteractable]);

  return (
    <mesh ref={ref} position={position} visible={visible}>
      <boxGeometry args={scale} />
      {basic ? (
        <meshBasicMaterial color={color} />
      ) : (
        <meshStandardMaterial color={color} roughness={1} metalness={0} />
      )}
    </mesh>
  );
}

function FloatingLabel({
  children,
  position,
  color = COLORS.paper,
  size = 0.32,
  rotationY = 0,
}: {
  children: string;
  position: [number, number, number];
  color?: string;
  size?: number;
  rotationY?: number;
}) {
  return (
    <Text
      position={position}
      rotation={[0, rotationY, 0]}
      fontSize={size}
      color={color}
      anchorX="center"
      anchorY="middle"
    >
      {children}
    </Text>
  );
}

function ParkingLot() {
  return (
    <group>
      <Box position={[0, -0.08, -14]} scale={[24, 0.1, 12]} color={COLORS.darkWall} />
      <Box position={[-12, 1.1, -14]} scale={[0.4, 2.2, 12]} color={COLORS.darkWall} />
      <Box position={[12, 1.1, -14]} scale={[0.4, 2.2, 12]} color={COLORS.darkWall} />

      <Car position={[-5.8, 0, -15.2]} />
      <Car position={[5.2, 0, -13.2]} />

      <Box position={[0, 3.2, -9.15]} scale={[6.5, 1.15, 0.12]} color={COLORS.neonPink} basic />
      <FloatingLabel position={[0, 3.24, -9.26]} size={0.55} color={COLORS.key}>
        MOTEL
      </FloatingLabel>
    </group>
  );
}

function Car({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Box position={[0, 0.42, 0]} scale={[3.2, 0.84, 1.65]} color={COLORS.darkWall} />
      <Box position={[-0.15, 0.95, 0]} scale={[1.65, 0.7, 1.35]} color={COLORS.screen} basic />
      <Box position={[-1.25, 0.12, -0.68]} scale={[0.55, 0.24, 0.24]} color={COLORS.black} basic />
      <Box position={[1.25, 0.12, -0.68]} scale={[0.55, 0.24, 0.24]} color={COLORS.black} basic />
      <Box position={[-1.25, 0.12, 0.68]} scale={[0.55, 0.24, 0.24]} color={COLORS.black} basic />
      <Box position={[1.25, 0.12, 0.68]} scale={[0.55, 0.24, 0.24]} color={COLORS.black} basic />
    </group>
  );
}

function Lobby({
  registerInteractable,
  hasKey204,
  endingReady,
}: {
  registerInteractable: (record: InteractableRecord) => () => void;
  hasKey204: boolean;
  endingReady: boolean;
}) {
  return (
    <group>
      <Box position={[0, -0.05, -1]} scale={[18, 0.1, 14]} color={COLORS.floor} />
      <Box position={[0, 1.5, -8]} scale={[18, 3, 0.4]} color={COLORS.wall} />
      <Box position={[-9, 1.5, -1]} scale={[0.4, 3, 14]} color={COLORS.wall} />
      <Box position={[9, 1.5, -1]} scale={[0.4, 3, 14]} color={COLORS.wall} />
      <Box position={[-5.8, 1.5, 6]} scale={[6.4, 3, 0.4]} color={COLORS.wall} />
      <Box position={[5.8, 1.5, 6]} scale={[6.4, 3, 0.4]} color={COLORS.wall} />

      <Box position={[0, 0.55, -2.8]} scale={[6.5, 1.1, 1.35]} color={COLORS.wood} />

      <InteractableBox
        type="guestbook"
        label={endingReady ? '바뀐 숙박부를 읽는다' : '숙박부를 읽는다'}
        registerInteractable={registerInteractable}
        position={[-2.4, 1.42, -2.88]}
        scale={[0.82, 0.12, 0.46]}
        color={endingReady ? COLORS.blood : COLORS.paper}
        basic
      />

      <InteractableBox
        type="bell"
        label="벨을 누른다"
        registerInteractable={registerInteractable}
        position={[0.1, 1.38, -3.5]}
        scale={[0.32, 0.18, 0.32]}
        color={COLORS.metal}
      />

      <InteractableBox
        type="key204"
        label="204호 키를 집는다"
        registerInteractable={registerInteractable}
        position={[1.6, 1.38, -2.9]}
        scale={[0.7, 0.12, 0.3]}
        color={COLORS.key}
        visible={!hasKey204}
        basic
      />

      <InteractableBox
        type="cctv"
        label="CCTV 모니터를 본다"
        registerInteractable={registerInteractable}
        position={[-4.9, 1.9, -5.92]}
        scale={[1.8, 1.15, 0.08]}
        color={COLORS.screen}
        basic
      />

      <Box position={[4.9, 1.8, -5.85]} scale={[1.6, 0.9, 0.08]} color={COLORS.paper} basic />
      <FloatingLabel position={[4.9, 1.82, -5.94]} size={0.18} color={COLORS.black}>
        NO VACANCY
      </FloatingLabel>

      <Lamp position={[-3.9, 0.72, -4.2]} />
      <Lamp position={[4.0, 0.72, -4.2]} />
      <Trash position={[-7.2, 0, 3.5]} />
      <Trash position={[7.0, 0, 3.8]} />

      <InteractableBox
        type="exit"
        label="밖으로 나간다"
        registerInteractable={registerInteractable}
        position={[0, 1.2, -7.82]}
        scale={[3.2, 2.25, 0.12]}
        color={COLORS.neonPink}
        basic
      />
    </group>
  );
}

function Hallway({
  registerInteractable,
  hallwayShifted,
}: {
  registerInteractable: (record: InteractableRecord) => () => void;
  hallwayShifted: boolean;
}) {
  const leftDoors = [4, 9, 14, 19];
  const rightDoors = [6.5, 11.5, 16.5, 21.5];

  return (
    <group>
      <Box position={[0, -0.04, 12.5]} scale={[7.4, 0.1, 31]} color={COLORS.carpet} />
      <Box position={[-3.9, 1.5, 13.8]} scale={[0.4, 3, 31]} color={COLORS.wall} />
      <Box position={[3.9, 1.5, 13.8]} scale={[0.4, 3, 31]} color={COLORS.wall} />

      {Array.from({ length: 6 }).map((_, i) => (
        <CeilingLight key={i} position={[0, 0, 0.5 + i * 5.2]} />
      ))}

      {leftDoors.map((z, i) => (
        <DoorWithPlate key={`l-${z}`} position={[-3.67, 0, z]} side="left" label={`${201 + i}`} />
      ))}

      {rightDoors.map((z, i) => (
        <DoorWithPlate key={`r-${z}`} position={[3.67, 0, z]} side="right" label={`${205 + i}`} />
      ))}

      <VendingMachine registerInteractable={registerInteractable} position={[2.95, 0, 1.8]} />

      <Trash position={[-2.9, 0, 7.6]} />

      <Box position={[-2.2, 0.8, 18.7]} scale={[0.7, 1.6, 0.45]} color={COLORS.metal} />
      <Box position={[-1.55, 0.7, 18.7]} scale={[0.55, 1.4, 0.4]} color={COLORS.metal} />
      <Box position={[-2.2, 1.62, 18.7]} scale={[1.3, 0.08, 0.65]} color={COLORS.paper} basic />

      {hallwayShifted && (
        <group>
          <Box position={[0, 1.5, 8.7]} scale={[2.1, 3, 0.22]} color={COLORS.darkWall} />
          <Box position={[0, 1.2, 8.55]} scale={[1.25, 2.2, 0.12]} color={COLORS.door} />
          <FloatingLabel position={[0, 1.9, 8.42]} size={0.2} color={COLORS.blood}>
            000
          </FloatingLabel>
          <pointLight position={[0, 2.2, 8.6]} intensity={0.9} distance={10} color="#ff3355" />
        </group>
      )}
    </group>
  );
}

function Room204({
  registerInteractable,
  doorOpen,
  tvOn,
  bedChecked,
  bathChecked,
}: {
  registerInteractable: (record: InteractableRecord) => () => void;
  doorOpen: boolean;
  tvOn: boolean;
  bedChecked: boolean;
  bathChecked: boolean;
}) {
  return (
    <group>
      <Box position={[8.4, -0.05, 28]} scale={[12, 0.1, 12]} color={COLORS.floor} />

      <Box position={[8.4, 1.5, 22]} scale={[12, 3, 0.4]} color={COLORS.wall} />
      <Box position={[8.4, 1.5, 34]} scale={[12, 3, 0.4]} color={COLORS.wall} />
      <Box position={[14.4, 1.5, 28]} scale={[0.4, 3, 12]} color={COLORS.wall} />
      <Box position={[2.4, 1.5, 25.2]} scale={[0.4, 3, 6]} color={COLORS.wall} />
      <Box position={[2.4, 1.5, 31.6]} scale={[0.4, 3, 4.8]} color={COLORS.wall} />

      <InteractableBox
        type="door204"
        label={doorOpen ? '204호 문틀을 본다' : '204호 문을 연다'}
        registerInteractable={registerInteractable}
        position={[2.42, 1.2, 28]}
        scale={[0.14, 2.35, 1.9]}
        color={COLORS.door}
        visible={!doorOpen}
      />

      {!doorOpen && <FloatingLabel position={[2.27, 1.9, 27.42]} size={0.2} color={COLORS.paper} rotationY={Math.PI / 2}>204</FloatingLabel>}

      <Bed registerInteractable={registerInteractable} bedChecked={bedChecked} />
      <TV registerInteractable={registerInteractable} tvOn={tvOn} />
      <Phone registerInteractable={registerInteractable} />
      <Bath registerInteractable={registerInteractable} bathChecked={bathChecked} />
      <Mirror registerInteractable={registerInteractable} />

      <Lamp position={[5.4, 0.72, 24.4]} />
      <Trash position={[13.1, 0, 24.1]} />
      <CeilingLight position={[8.2, 0, 28.2]} />
    </group>
  );
}

function DoorWithPlate({
  position,
  side,
  label,
}: {
  position: [number, number, number];
  side: 'left' | 'right';
  label: string;
}) {
  const x = position[0];
  const z = position[2];

  return (
    <group>
      <Box position={[x, 1.16, z]} scale={[0.14, 2.3, 1.8]} color={COLORS.door} />
      <Box position={[side === 'left' ? x + 0.12 : x - 0.12, 1.86, z - 0.45]} scale={[0.08, 0.35, 0.8]} color={COLORS.paper} basic />
      <FloatingLabel
        position={[side === 'left' ? x + 0.17 : x - 0.17, 1.88, z - 0.45]}
        size={0.16}
        color={COLORS.black}
        rotationY={side === 'left' ? Math.PI / 2 : -Math.PI / 2}
      >
        {label}
      </FloatingLabel>
    </group>
  );
}

function VendingMachine({
  registerInteractable,
  position,
}: {
  registerInteractable: (record: InteractableRecord) => () => void;
  position: [number, number, number];
}) {
  const [x, , z] = position;

  return (
    <group>
      <Box position={[x, 1.2, z]} scale={[1.05, 2.4, 0.7]} color={COLORS.neonBlue} basic />
      <InteractableBox
        type="vending"
        label="자판기를 확인한다"
        registerInteractable={registerInteractable}
        position={[x, 1.75, z - 0.37]}
        scale={[0.75, 0.8, 0.05]}
        color={COLORS.screen}
        basic
      />
      <Box position={[x + 0.38, 0.95, z - 0.38]} scale={[0.18, 0.5, 0.05]} color={COLORS.black} basic />
      <pointLight position={[x, 1.8, z]} intensity={0.8} distance={7} color={COLORS.neonBlue} />
    </group>
  );
}

function Bed({
  registerInteractable,
  bedChecked,
}: {
  registerInteractable: (record: InteractableRecord) => () => void;
  bedChecked: boolean;
}) {
  return (
    <group>
      <Box position={[8.1, 0.45, 24.6]} scale={[3.25, 0.9, 1.9]} color={COLORS.wood} />
      <Box position={[7.15, 1.02, 24.15]} scale={[0.9, 0.22, 0.72]} color={COLORS.paper} basic />
      <Box position={[8.5, 1.02, 24.72]} scale={[1.9, 0.17, 1.24]} color={COLORS.carpet} />

      <InteractableBox
        type="bed"
        label="침대 밑을 확인한다"
        registerInteractable={registerInteractable}
        position={[8.1, 0.16, 25.75]}
        scale={[2.2, 0.12, 0.55]}
        color={bedChecked ? COLORS.black : COLORS.blood}
        basic
      />
    </group>
  );
}

function TV({
  registerInteractable,
  tvOn,
}: {
  registerInteractable: (record: InteractableRecord) => () => void;
  tvOn: boolean;
}) {
  return (
    <group>
      <Box position={[11.8, 0.72, 29.5]} scale={[1.55, 1.44, 0.65]} color={COLORS.wood} />
      <InteractableBox
        type="tv"
        label={tvOn ? 'TV 화면을 본다' : 'TV를 켠다'}
        registerInteractable={registerInteractable}
        position={[11.8, 1.75, 29.08]}
        scale={[1.3, 0.85, 0.1]}
        color={tvOn ? COLORS.neonBlue : COLORS.screen}
        basic
      />
      <pointLight
        position={[11.8, 2.0, 29.1]}
        intensity={tvOn ? 1.6 : 0.8}
        distance={12}
        color="#93cfff"
      />
    </group>
  );
}

function Phone({
  registerInteractable,
}: {
  registerInteractable: (record: InteractableRecord) => () => void;
}) {
  return (
    <group>
      <Box position={[5.9, 1.1, 26.15]} scale={[0.72, 0.28, 0.55]} color={COLORS.wood} />
      <InteractableBox
        type="phone"
        label="전화기를 받는다"
        registerInteractable={registerInteractable}
        position={[5.9, 1.32, 26.15]}
        scale={[0.5, 0.28, 0.42]}
        color={COLORS.black}
        basic
      />
    </group>
  );
}

function Bath({
  registerInteractable,
  bathChecked,
}: {
  registerInteractable: (record: InteractableRecord) => () => void;
  bathChecked: boolean;
}) {
  return (
    <group>
      <Box position={[12.1, 0.58, 32.1]} scale={[1.7, 1.16, 2.25]} color={COLORS.metal} />
      <InteractableBox
        type="bath"
        label="욕조 안을 확인한다"
        registerInteractable={registerInteractable}
        position={[12.1, 1.32, 32.1]}
        scale={[1.35, 0.15, 1.6]}
        color={bathChecked ? COLORS.black : COLORS.blood}
        basic
      />
    </group>
  );
}

function Mirror({
  registerInteractable,
}: {
  registerInteractable: (record: InteractableRecord) => () => void;
}) {
  return (
    <InteractableBox
      type="mirror"
      label="거울을 본다"
      registerInteractable={registerInteractable}
      position={[5.0, 1.65, 33.68]}
      scale={[1.25, 1.4, 0.1]}
      color={COLORS.screen}
      basic
    />
  );
}

function Lamp({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;

  return (
    <group>
      <Box position={[x, y, z]} scale={[0.2, 0.75, 0.2]} color={COLORS.wood} />
      <Box position={[x, y + 0.48, z]} scale={[0.85, 0.34, 0.85]} color={COLORS.paper} basic />
      <pointLight position={[x, y + 0.7, z]} intensity={0.85} distance={7} color="#ffd194" />
    </group>
  );
}

function Trash({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;

  return (
    <group>
      <Box position={[x, 0.28, z]} scale={[0.52, 0.56, 0.52]} color={COLORS.metal} />
      <Box position={[x + 0.36, 0.08, z - 0.16]} scale={[0.5, 0.08, 0.26]} color={COLORS.paper} basic />
      <Box position={[x - 0.32, 0.07, z + 0.2]} scale={[0.38, 0.07, 0.22]} color={COLORS.paper} basic />
    </group>
  );
}

function CeilingLight({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;

  return (
    <group>
      <Box position={[x, 2.95, z]} scale={[1.1, 0.08, 0.48]} color={COLORS.paper} basic />
      <pointLight position={[x, 2.65, z]} intensity={0.65} distance={8.5} color="#ffd99a" />
    </group>
  );
}

function StandingFigure({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Box position={[0, 0.9, 0]} scale={[0.42, 1.8, 0.22]} color={COLORS.black} basic />
      <Box position={[0, 1.95, 0]} scale={[0.55, 0.55, 0.28]} color={COLORS.black} basic />
    </group>
  );
}

function FrontDeskBlood() {
  return (
    <group>
      <Box position={[0, 1.35, -2.05]} scale={[3.0, 0.13, 0.12]} color={COLORS.blood} basic />
      <Box position={[2.8, 1.38, -2.85]} scale={[0.9, 0.12, 0.48]} color={COLORS.paper} basic />
      <FloatingLabel position={[2.8, 1.49, -2.9]} size={0.12} color={COLORS.blood}>
        204
      </FloatingLabel>
    </group>
  );
}

function injectStyles() {
  const style = document.createElement('style');

  style.textContent = `
    html,
    body,
    #root {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${COLORS.background};
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    canvas {
      display: block;
      image-rendering: pixelated;
      filter: contrast(1.06) brightness(1.18) saturate(0.76);
    }

    .hud {
      position: fixed;
      inset: 0;
      pointer-events: none;
      color: rgba(255, 238, 205, 0.94);
      text-shadow: 0 0 12px rgba(0, 0, 0, 0.96);
    }

    .topLeft {
      position: absolute;
      top: 18px;
      left: 18px;
    }

    .title {
      font-size: 13px;
      letter-spacing: 0.22em;
    }

    .hint {
      margin-top: 8px;
      font-size: 12px;
      opacity: 0.72;
    }

    .status {
      position: absolute;
      top: 18px;
      right: 18px;
      font-size: 13px;
      letter-spacing: 0.12em;
    }

    .objective {
      position: absolute;
      left: 18px;
      bottom: 22px;
      max-width: min(72vw, 620px);
      padding: 9px 12px;
      border: 1px solid rgba(255, 228, 170, 0.18);
      background: rgba(24, 18, 18, 0.48);
      color: rgba(255, 238, 205, 0.92);
      font-size: 13px;
      line-height: 1.55;
    }

    .message {
      position: absolute;
      left: 50%;
      bottom: 13%;
      transform: translateX(-50%);
      width: min(86vw, 680px);
      min-height: 22px;
      text-align: center;
      font-size: 14px;
      line-height: 1.65;
      white-space: pre-line;
      padding: 10px 14px;
      border-radius: 8px;
      color: rgba(255, 242, 212, 0.98);
      background: rgba(8, 7, 8, 0.54);
      border: 1px solid rgba(255, 228, 170, 0.13);
      backdrop-filter: blur(2px);
    }

    .crosshair {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 5px;
      height: 5px;
      transform: translate(-50%, -50%);
      border-radius: 999px;
      background: rgba(255, 238, 205, 0.55);
    }

    .crosshair.active {
      width: 12px;
      height: 12px;
      background: rgba(255, 220, 130, 0.98);
      box-shadow: 0 0 12px rgba(255, 220, 130, 0.45);
    }

    .hud.ending::after,
    .hud.dead::after {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
    }

    .hud.ending::after {
      background:
        radial-gradient(circle, transparent 18%, rgba(0, 0, 0, 0.54) 86%),
        repeating-linear-gradient(
          0deg,
          rgba(255, 255, 255, 0.03) 0,
          rgba(255, 255, 255, 0.03) 1px,
          transparent 1px,
          transparent 5px
        );
    }

    .hud.dead::after {
      background:
        radial-gradient(circle, transparent 4%, rgba(0, 0, 0, 0.96) 74%),
        repeating-linear-gradient(
          0deg,
          rgba(255, 255, 255, 0.04) 0,
          rgba(255, 255, 255, 0.04) 1px,
          transparent 1px,
          transparent 4px
        );
    }
  `;

  document.head.appendChild(style);
}

injectStyles();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);