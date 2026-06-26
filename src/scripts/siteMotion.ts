import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion) {
  gsap.registerPlugin(ScrollTrigger);

  gsap.set("[data-reveal]", { autoAlpha: 0, y: 18 });
  gsap.to("[data-reveal]", {
    autoAlpha: 1,
    y: 0,
    duration: 0.8,
    ease: "power3.out",
    stagger: 0.08
  });

  const cards = gsap.utils.toArray<HTMLElement>("[data-episode-card]");
  cards.forEach((card) => {
    card.addEventListener("pointerenter", () => {
      gsap.to(card, { y: -4, duration: 0.22, ease: "power2.out" });
    });
    card.addEventListener("pointerleave", () => {
      gsap.to(card, { y: 0, duration: 0.22, ease: "power2.out" });
    });
  });

  gsap.to("[data-memory-shard]", {
    y: () => gsap.utils.random(-5, 5),
    opacity: () => gsap.utils.random(0.45, 0.9),
    duration: () => gsap.utils.random(1.8, 3.2),
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
    stagger: 0.18
  });

  const heroVisual = document.querySelector<HTMLElement>("[data-hero-visual]");
  const heroCopy = document.querySelector<HTMLElement>("[data-hero-copy]");

  if (heroVisual && heroCopy) {
    const moveVisualX = gsap.quickTo(heroVisual, "x", { duration: 0.7, ease: "power3.out" });
    const moveVisualY = gsap.quickTo(heroVisual, "y", { duration: 0.7, ease: "power3.out" });
    const moveCopyX = gsap.quickTo(heroCopy, "x", { duration: 0.7, ease: "power3.out" });

    window.addEventListener(
      "pointermove",
      (event) => {
        const xRatio = event.clientX / window.innerWidth - 0.5;
        const yRatio = event.clientY / window.innerHeight - 0.5;

        moveVisualX(xRatio * 18);
        moveVisualY(yRatio * 12);
        moveCopyX(xRatio * -8);
      },
      { passive: true }
    );
  }

  ScrollTrigger.batch("[data-scroll-reveal]", {
    start: "top 84%",
    once: true,
    onEnter: (elements) => {
      gsap.fromTo(
        elements,
        { autoAlpha: 0, y: 34 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 }
      );
    }
  });

  ScrollTrigger.batch(".reader-copy p", {
    start: "top 88%",
    once: true,
    onEnter: (elements) => {
      gsap.fromTo(
        elements,
        { autoAlpha: 0.18, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.72, ease: "power2.out", stagger: 0.04 }
      );
    }
  });
}

const progress = document.querySelector<HTMLElement>("[data-reading-progress]");

if (progress) {
  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    gsap.set(progress, { scaleX: Math.min(Math.max(ratio, 0), 1) });
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
}
