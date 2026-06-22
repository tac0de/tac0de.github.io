import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, Bot, Gamepad2, Globe2, Sparkles, Waves } from "lucide-react";
import * as THREE from "three";
import "./styles.css";

type Locale = "en" | "ko";

type Project = {
  title: string;
  kicker: Record<Locale, string>;
  description: Record<Locale, string>;
  url: string;
  image: string;
  tags: string[];
  accent: string;
};

const projects: Project[] = [
  {
    title: "Kkomo",
    kicker: {
      en: "KakaoTalk study chatbot",
      ko: "카카오톡 학습 챗봇",
    },
    description: {
      en: "A KakaoTalk group-room study bot for questions, quizzes, vocabulary, formulas, science memory drills, and Korean idiom review.",
      ko: "카카오톡 그룹방에서 질문, 퀴즈, 영어 단어, 공식, 과학 암기, 사자성어 복습을 다루는 학습 챗봇.",
    },
    url: "https://pf.kakao.com/_xgryqX",
    image: "./assets/kkomo.png",
    tags: ["Kakao skill", "Study loops", "Reliability"],
    accent: "#ffd449",
  },
  {
    title: "PlotNodes",
    kicker: {
      en: "Relationship-driven character AI",
      ko: "관계 중심 캐릭터 AI",
    },
    description: {
      en: "A Korean-first character AI chat app where memory, attachment, tension, and controlled misreadings accumulate behind each DM.",
      ko: "DM 대화 뒤에서 기억, 애착, 긴장, 의도된 오해가 누적되는 한국어 우선 캐릭터 AI 채팅 앱.",
    },
    url: "https://plotnodes.com",
    image: "./assets/plotnodes-live.png",
    tags: ["Next.js", "Firebase", "OpenAI"],
    accent: "#f46f8f",
  },
  {
    title: "The Divine Paradox",
    kicker: {
      en: "Seeded 3D observation world",
      ko: "시드 기반 3D 관찰 세계",
    },
    description: {
      en: "A seeded 3D observation world: every numeric URL opens a deterministic low-poly place that can be shared like an identity.",
      ko: "숫자 URL마다 같은 저폴리 세계가 열리고, 그 세계를 정체성처럼 공유할 수 있는 3D 관찰 웹.",
    },
    url: "https://thedivineparadox.com",
    image: "./assets/thedivineparadox-live.png",
    tags: ["Three.js", "Procedural", "Firebase"],
    accent: "#74d4ff",
  },
];

const futureWorks = [
  {
    title: "3D lofi horror game",
    icon: Gamepad2,
    body: {
      en: "A browser horror game shaped by late-night job simulators, cheap indie dread, surveillance screens, slow cameras, and awkward silence.",
      ko: "심야 알바 시뮬레이터, 저예산 인디 공포, 감시 화면, 느린 카메라, 어색한 침묵을 중심으로 만드는 브라우저 공포게임.",
    },
  },
];

const copy = {
  en: {
    eyebrow: "tac0de / web, AI, haunted systems",
    title: "Useful tools for uneasy worlds.",
    lead: "I build learning bots, relationship-driven character AI, seeded 3D worlds, and the next layer: lofi horror games.",
    projects: "Projects",
    nextWorlds: "Horror game",
    selected: "selected work",
    selectedHeading: "Products with a strange pulse under the interface.",
    next: "current direction",
    nextHeading: "Next: a playable web horror prototype.",
    artHeading: "CSS art and motion to add next.",
    stackHeading: "Framework and game stack.",
    portfolioStack: "Portfolio",
    portfolioBody:
      "Keep this as a Vite + React + TypeScript site with Three.js for the hero scene. CSS should carry the mood: scanlines, grain, offset cards, flicker, and responsive typographic pressure.",
    gameStack: "Horror game",
    gameBody:
      "Build the prototype with Three.js first. Add Rapier only when collision/physics becomes real, and use Zustand only when game state grows beyond a few rooms.",
    languageNote: "Language: browser auto-detects English or Korean.",
    cssNotes: [
      "CRT scanline layer with low opacity and slow vertical drift.",
      "Pointer-light / surveillance-cone hover states for project stills.",
      "Subtle title flicker, not full glitch spam.",
      "Room-map fragments and timestamp strips for the horror section.",
    ],
  },
  ko: {
    eyebrow: "tac0de / 웹, AI, 불안한 시스템",
    title: "불안한 세계를 위한 쓸모 있는 도구.",
    lead: "학습 챗봇, 관계 중심 캐릭터 AI, 시드 기반 3D 세계, 그리고 다음 단계인 lofi 공포게임을 만든다.",
    projects: "프로젝트",
    nextWorlds: "공포게임",
    selected: "선택 작업",
    selectedHeading: "인터페이스 아래에 이상한 맥박이 있는 제품들.",
    next: "현재 방향",
    nextHeading: "다음: 플레이 가능한 웹 공포 프로토타입.",
    artHeading: "다음에 넣을 CSS 아트와 모션.",
    stackHeading: "프레임워크와 게임 스택.",
    portfolioStack: "포트폴리오",
    portfolioBody:
      "포트폴리오는 Vite + React + TypeScript로 유지하고, 히어로 장면은 Three.js로 간다. 분위기는 CSS가 맡는다: scanline, grain, 비스듬한 카드, flicker, 반응형 타이포 압력.",
    gameStack: "공포게임",
    gameBody:
      "프로토타입은 Three.js로 먼저 만든다. 충돌/물리가 실제로 필요해지는 시점에만 Rapier를 추가하고, 게임 상태가 방 몇 개를 넘어서면 Zustand를 쓴다.",
    languageNote: "언어: 브라우저 언어에 따라 영어/한국어 자동 지정.",
    cssNotes: [
      "낮은 불투명도의 CRT scanline 레이어와 느린 세로 drift.",
      "프로젝트 스틸에 pointer-light / 감시등 hover 상태.",
      "과한 글리치 대신 약한 제목 flicker.",
      "공포게임 섹션에 방 지도 조각과 타임스탬프 띠.",
    ],
  },
};

function getBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

function ArtScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = mountRef.current;
    if (!node) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, node.clientWidth / node.clientHeight, 0.1, 100);
    camera.position.set(0, 1.7, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(node.clientWidth, node.clientHeight);
    node.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.position.set(1.55, -0.32, 0);
    scene.add(group);

    const floorGeometry = new THREE.IcosahedronGeometry(1.9, 2);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1d2329,
      roughness: 0.86,
      metalness: 0.12,
      flatShading: true,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.scale.set(2.2, 0.28, 1.15);
    floor.rotation.z = -0.08;
    group.add(floor);

    const shardMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7e4dd,
      emissive: 0x14201d,
      roughness: 0.68,
      metalness: 0.18,
      flatShading: true,
    });

    for (let index = 0; index < 22; index += 1) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.12 + (index % 5) * 0.025), shardMaterial);
      const angle = (index / 22) * Math.PI * 2;
      const radius = 1.3 + Math.sin(index * 2.1) * 0.38;
      shard.position.set(Math.cos(angle) * radius, 0.1 + (index % 4) * 0.18, Math.sin(angle) * radius * 0.72);
      shard.rotation.set(index * 0.29, index * 0.17, index * 0.11);
      group.add(shard);
    }

    const prismMaterial = new THREE.MeshStandardMaterial({
      color: 0x8bd3ff,
      emissive: 0x164a62,
      roughness: 0.36,
      metalness: 0.28,
      transparent: true,
      opacity: 0.8,
      flatShading: true,
    });
    const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.78, 1), prismMaterial);
    prism.position.set(0.18, 0.88, 0.05);
    group.add(prism);

    const pointLight = new THREE.PointLight(0xffd19a, 36, 9);
    pointLight.position.set(-2.8, 2.4, 3.4);
    scene.add(pointLight);
    scene.add(new THREE.HemisphereLight(0xb8d8ff, 0x101317, 2.2));

    let frameId = 0;
    const clock = new THREE.Clock();

    const onResize = () => {
      camera.aspect = node.clientWidth / node.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(node.clientWidth, node.clientHeight);
    };

    const animate = () => {
      const time = clock.getElapsedTime();
      group.rotation.y = time * 0.16;
      prism.rotation.y = time * 0.42;
      prism.rotation.x = Math.sin(time * 0.8) * 0.16;
      prism.position.y = 0.92 + Math.sin(time * 1.2) * 0.08;
      pointLight.position.x = Math.sin(time * 0.55) * 3.2;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", onResize);
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="art-scene" ref={mountRef} aria-hidden="true" />;
}

function ProjectCard({ project, locale }: { project: Project; locale: Locale }) {
  return (
    <article className="project-card" style={{ "--accent": project.accent } as React.CSSProperties}>
      <a className="project-media" href={project.url} target="_blank" rel="noreferrer" aria-label={`Open ${project.title}`}>
        <img src={project.image} alt={`${project.title} screenshot`} />
      </a>
      <div className="project-copy">
        <p className="kicker">{project.kicker[locale]}</p>
        <div className="project-title-row">
          <h3>{project.title}</h3>
          <a className="icon-link" href={project.url} target="_blank" rel="noreferrer" aria-label={`${project.title} URL`}>
            <ArrowUpRight size={18} />
          </a>
        </div>
        <p>{project.description[locale]}</p>
        <div className="tag-row">
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

function App() {
  const locale = getBrowserLocale();
  const text = copy[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <main>
      <div className="grain" aria-hidden="true" />
      <div className="scanline" aria-hidden="true" />
      <section className="hero">
        <ArtScene />
        <div className="hero-copy">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1 className="hero-title" data-title={text.title}>
            {text.title}
          </h1>
          <p className="hero-lead">{text.lead}</p>
          <div className="hero-actions">
            <a href="#projects" className="primary-action">
              <Sparkles size={18} />
              {text.projects}
            </a>
            <a href="#future" className="secondary-action">
              <Gamepad2 size={18} />
              {text.nextWorlds}
            </a>
          </div>
        </div>
      </section>

      <section className="section-shell" id="projects">
        <div className="section-heading">
          <p className="eyebrow">{text.selected}</p>
          <h2>{text.selectedHeading}</h2>
        </div>
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard key={project.title} project={project} locale={locale} />
          ))}
        </div>
      </section>

      <section className="future-band" id="future">
        <div className="section-heading">
          <p className="eyebrow">{text.next}</p>
          <h2>{text.nextHeading}</h2>
        </div>
        <div className="future-grid single">
          {futureWorks.map((work) => {
            const Icon = work.icon;
            return (
              <article className="future-item" key={work.title}>
                <Icon size={24} />
                <h3>{work.title}</h3>
                <p>{work.body[locale]}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="tech-band" aria-label={text.stackHeading}>
        <div className="section-heading">
          <p className="eyebrow">{text.languageNote}</p>
          <h2>{text.stackHeading}</h2>
        </div>
        <div className="tech-grid">
          <article className="tech-panel">
            <Waves size={24} />
            <h3>{text.artHeading}</h3>
            <ul>
              {text.cssNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </article>
          <article className="tech-panel">
            <Sparkles size={24} />
            <h3>{text.portfolioStack}</h3>
            <p>{text.portfolioBody}</p>
          </article>
          <article className="tech-panel">
            <Gamepad2 size={24} />
            <h3>{text.gameStack}</h3>
            <p>{text.gameBody}</p>
          </article>
        </div>
      </section>

      <footer>
        <a href="https://plotnodes.com" target="_blank" rel="noreferrer">
          <Globe2 size={16} />
          plotnodes.com
        </a>
        <a href="https://thedivineparadox.com" target="_blank" rel="noreferrer">
          <Globe2 size={16} />
          thedivineparadox.com
        </a>
        <a href="https://pf.kakao.com/_xgryqX" target="_blank" rel="noreferrer">
          <Bot size={16} />
          Kkomo channel
        </a>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
