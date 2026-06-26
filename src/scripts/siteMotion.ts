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
  const heroStage = document.querySelector<HTMLElement>("[data-hero-stage]");
  const heroSlices = gsap.utils.toArray<HTMLElement>("[data-hero-slice]");
  const heroEdgeFrame = document.querySelector<HTMLElement>("[data-hero-edge-frame]");

  if (heroVisual && heroCopy && !isMobile) {
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

  if (heroSlices.length > 0) {
    const slicePulse = (strong = false) => {
      const distance = strong ? 34 : 18;
      const alpha = strong ? 0.5 : 0.28;

      gsap.timeline()
        .set(heroSlices, { x: 0, autoAlpha: 0 })
        .to(heroSlices, {
          autoAlpha: alpha,
          x: (index) => (index % 2 === 0 ? distance : -distance),
          duration: 0.08,
          ease: "none",
          stagger: 0.025
        })
        .to(heroSlices, {
          autoAlpha: 0,
          x: 0,
          duration: strong ? 0.22 : 0.16,
          ease: "power3.out",
          stagger: 0.02
        });
    };

    window.setTimeout(() => slicePulse(true), 650);
    window.setInterval(() => slicePulse(false), 9400);
  }

  if (heroStage && heroEdgeFrame) {
    const setEdgeX = gsap.quickTo(heroEdgeFrame, "--edge-x", { duration: 0.45, ease: "power3.out" });
    const setEdgeY = gsap.quickTo(heroEdgeFrame, "--edge-y", { duration: 0.45, ease: "power3.out" });

    const moveEdgeLight = (event: PointerEvent) => {
      const rect = heroStage.getBoundingClientRect();
      const x = Math.min(Math.max(((event.clientX - rect.left) / rect.width) * 100, 0), 100);
      const y = Math.min(Math.max(((event.clientY - rect.top) / rect.height) * 100, 0), 100);
      setEdgeX(`${x}%`);
      setEdgeY(`${y}%`);
    };

    const resetEdgeLight = () => {
      setEdgeX("50%");
      setEdgeY("50%");
    };

    heroStage.addEventListener("pointermove", moveEdgeLight, { passive: true });
    heroStage.addEventListener("pointerleave", resetEdgeLight, { passive: true });
    heroStage.addEventListener("pointercancel", resetEdgeLight, { passive: true });
  }

  const titleGlow = document.querySelector<HTMLElement>("[data-title-glow]");

  if (titleGlow) {
    gsap.to(titleGlow, {
      textShadow: "0 0 42px rgba(197,155,85,0.48), 0 0 130px rgba(159,185,198,0.28)",
      duration: 2.8,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    });
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

  ScrollTrigger.batch(".episode-fragment", {
    start: "top 86%",
    once: true,
    onEnter: (elements) => {
      gsap.fromTo(
        elements,
        { clipPath: "inset(0 0 0 14%)", filter: "brightness(0.84)" },
        { clipPath: "inset(0 0 0 0%)", filter: "brightness(1)", duration: 0.72, ease: "power3.out", stagger: 0.08 }
      );
    }
  });

  ScrollTrigger.batch(".chapter-cta-primary", {
    start: "top 82%",
    once: true,
    onEnter: (elements) => {
      elements.forEach((element) => {
        gsap.timeline()
          .fromTo(element, { y: 22, autoAlpha: 0.82 }, { y: 0, autoAlpha: 1, duration: 0.52, ease: "power3.out" })
          .fromTo(element, { filter: "brightness(1.18) saturate(1.12)" }, { filter: "brightness(1) saturate(1)", duration: 0.9, ease: "power3.out" }, "-=0.18");
      });
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
