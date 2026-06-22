import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, BookOpenText, Bot, Gamepad2, GitBranch, Globe2, Sparkles } from "lucide-react";
import * as THREE from "three";
import "./styles.css";

type Project = {
  title: string;
  kicker: string;
  description: string;
  url: string;
  image: string;
  tags: string[];
  accent: string;
};

const projects: Project[] = [
  {
    title: "Kkomo",
    kicker: "KakaoTalk study chatbot",
    description:
      "카카오톡 그룹방 안에서 질문, 퀴즈, 영어 단어, 공식, 과학 암기, 사자성어 복습을 다루는 학습 챗봇.",
    url: "https://github.com/tac0de/kakao-study-groupbot",
    image: "./assets/kkomo.png",
    tags: ["Kakao skill", "Study loops", "Reliability"],
    accent: "#ffd449",
  },
  {
    title: "PlotNodes",
    kicker: "Relationship-driven character AI",
    description:
      "한국어 DM 감성의 캐릭터 AI 채팅 앱. 대화 뒤에서 기억, 애착, 긴장, 오해가 관계 상태로 누적된다.",
    url: "https://plotnodes.com",
    image: "./assets/plotnodes-live.png",
    tags: ["Next.js", "Firebase", "OpenAI"],
    accent: "#f46f8f",
  },
  {
    title: "The Divine Paradox",
    kicker: "Seeded 3D observation world",
    description:
      "숫자 seed마다 같은 저폴리 세계가 열리는 3D 관찰 웹. 공유 가능한 개인 세계라는 감각을 목표로 만든다.",
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
    body: "낮은 해상도, 느린 카메라, 불편한 정적을 핵심 감각으로 삼는 웹 기반 공포 게임.",
  },
  {
    title: "Fantasy long-form novel",
    icon: BookOpenText,
    body: "긴 호흡의 세계관, 인물 관계, 신화적 모순을 축으로 쌓아 가는 장편 판타지 소설.",
  },
];

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

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="project-card" style={{ "--accent": project.accent } as React.CSSProperties}>
      <a className="project-media" href={project.url} target="_blank" rel="noreferrer" aria-label={`${project.title} 열기`}>
        <img src={project.image} alt={`${project.title} screenshot`} />
      </a>
      <div className="project-copy">
        <p className="kicker">{project.kicker}</p>
        <div className="project-title-row">
          <h3>{project.title}</h3>
          <a className="icon-link" href={project.url} target="_blank" rel="noreferrer" aria-label={`${project.title} URL`}>
            <ArrowUpRight size={18} />
          </a>
        </div>
        <p>{project.description}</p>
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
  return (
    <main>
      <section className="hero">
        <ArtScene />
        <div className="hero-copy">
          <p className="eyebrow">tac0de / web, AI, worlds</p>
          <h1>불안한 세계와 쓸모 있는 도구를 같이 만드는 포트폴리오.</h1>
          <p className="hero-lead">
            학습 챗봇, 관계형 캐릭터 AI, seed 기반 3D 월드, 그리고 앞으로 만들 lofi 공포게임과 판타지 장편까지.
          </p>
          <div className="hero-actions">
            <a href="#projects" className="primary-action">
              <Sparkles size={18} />
              Projects
            </a>
            <a href="https://github.com/tac0de" target="_blank" rel="noreferrer" className="secondary-action">
              <GitBranch size={18} />
              GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="section-shell" id="projects">
        <div className="section-heading">
          <p className="eyebrow">selected work</p>
          <h2>제품이 먼저 보이고, 기술은 뒤에서 받치게.</h2>
        </div>
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
      </section>

      <section className="future-band" id="future">
        <div className="section-heading">
          <p className="eyebrow">next worlds</p>
          <h2>다음에는 플레이 가능한 어둠과 긴 호흡의 이야기를 만든다.</h2>
        </div>
        <div className="future-grid">
          {futureWorks.map((work) => {
            const Icon = work.icon;
            return (
              <article className="future-item" key={work.title}>
                <Icon size={24} />
                <h3>{work.title}</h3>
                <p>{work.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <footer>
        <a href="https://github.com/tac0de" target="_blank" rel="noreferrer">
          <GitBranch size={16} />
          github.com/tac0de
        </a>
        <a href="https://plotnodes.com" target="_blank" rel="noreferrer">
          <Globe2 size={16} />
          plotnodes.com
        </a>
        <a href="https://thedivineparadox.com" target="_blank" rel="noreferrer">
          <Globe2 size={16} />
          thedivineparadox.com
        </a>
        <a href="https://github.com/tac0de/kakao-study-groupbot" target="_blank" rel="noreferrer">
          <Bot size={16} />
          Kkomo repo
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
