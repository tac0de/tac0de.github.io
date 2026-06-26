import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 720px)").matches;
const anomalyStrength = isMobile ? 0.42 : 1;

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

  const aura = document.querySelector<HTMLElement>("[data-scroll-aura]");

  if (aura) {
    gsap.to(aura, {
      autoAlpha: 0.85,
      yPercent: -8,
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8
      }
    });
  }

  gsap.to(document.body, {
    "--memory-glow": 1,
    ease: "none",
    scrollTrigger: {
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.8
    }
  });

  [0.33, 0.66, 0.9].forEach((threshold) => {
    ScrollTrigger.create({
      trigger: document.body,
      start: `${threshold * 100}% bottom`,
      once: true,
      onEnter: () => {
        gsap.timeline()
          .to(document.body, { "--anomaly": 0.75 * anomalyStrength, duration: 0.08, ease: "none" })
          .to("[data-anomaly-field]", { autoAlpha: 0.56 * anomalyStrength, x: 8, duration: 0.08, ease: "none" }, "<")
          .to(document.body, { "--anomaly": 0.18 * anomalyStrength, duration: 0.16, ease: "power2.out" })
          .to("[data-anomaly-field]", { autoAlpha: 0, x: 0, duration: 0.18, ease: "power2.out" }, "<")
          .to(document.body, { "--anomaly": 0, duration: 0.18, ease: "power2.out" });
      }
    });
  });

  const pulseAnomaly = () => {
    gsap.timeline({
      onComplete: () => {
        window.setTimeout(pulseAnomaly, gsap.utils.random(18000, 42000));
      }
    })
      .to(document.body, { "--anomaly": 0.55 * anomalyStrength, duration: 0.05, ease: "none" })
      .to("[data-anomaly-field]", { autoAlpha: 0.46 * anomalyStrength, x: -6, duration: 0.06, ease: "none" }, "<")
      .to(document.body, { "--anomaly": 0, duration: 0.2, ease: "power3.out" })
      .to("[data-anomaly-field]", { autoAlpha: 0, x: 0, duration: 0.18, ease: "power3.out" }, "<");
  };

  window.setTimeout(pulseAnomaly, gsap.utils.random(12000, 26000));

  if (heroVisual) {
    const pulseHero = () => {
      gsap.timeline({
        onComplete: () => {
          window.setTimeout(pulseHero, gsap.utils.random(22000, 52000));
        }
      })
        .to(document.body, {
          "--hero-dropout": 1 * anomalyStrength,
          "--hero-contrast": 1.24,
          duration: 0.09,
          ease: "none"
        })
        .to(document.body, {
          "--hero-dropout": 0,
          "--hero-contrast": 1,
          duration: 0.32,
          ease: "power3.out"
        });
    };

    window.setTimeout(pulseHero, gsap.utils.random(14000, 34000));
  }
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
