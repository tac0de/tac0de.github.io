import type { CollectionEntry } from "astro:content";

export const languages = ["ko", "en"] as const;

export type Language = (typeof languages)[number];
export type EpisodeEntry = CollectionEntry<"episodesKo"> | CollectionEntry<"episodesEn">;

export const defaultLanguage: Language = "ko";

export const collectionsByLanguage = {
  ko: "episodesKo",
  en: "episodesEn"
} as const;

export const copy = {
  ko: {
    localeName: "한국어",
    title: "Krontium | 장편 소설 연재",
    description: "Krontium: 신의 뼈에서 나온 금속과 기억을 세금으로 거두는 도시의 장편 연재",
    navEpisodes: "연재 목록",
    navAbout: "작품 소개",
    eyebrow: "Serialized Myth / Memory Tax",
    heroLine1: "신의 뼈에서 나온 금속. 그것으로 만든 도시는 무너지지 않고, 그것으로 만든 왕관은 왕을 죽게 두지 않는다.",
    heroLine2: "대신 그 금속은 살아 있는 자들의 기억을 세금처럼 거둔다.",
    readLatest: "최신 회차 읽기",
    openLedger: "원장 열람",
    forged: "주조",
    forgedValue: "신의 뼈",
    published: "공개",
    cost: "대가",
    costValue: "기억세",
    latest: "최근 징수 기록",
    part: "제",
    archiveEyebrow: "Memory Ledger",
    archiveTitle: "징수된 회차",
    allEpisodes: "전체 보기",
    minutesPrefix: "약",
    minutesSuffix: "분",
    episodesTitle: "연재 목록 | Krontium",
    episodesIntro: "Krontium은 왕국을 보존하는 대신 시민의 기억을 원장에 기록한다. 각 회차는 누군가에게서 사라진 이름, 냄새, 얼굴, 맹세의 일부다.",
    backEpisodes: "연재 목록",
    aboutTitle: "작품 소개 | Krontium",
    aboutEyebrow: "About Krontium",
    aboutHeading: "무너지지 않는 것들의 대가",
    aboutParagraphs: [
      "Krontium은 신의 뼈에서 나온 금속이다. 그것으로 만든 도시는 무너지지 않고, 그것으로 만든 왕관은 왕을 죽게 두지 않는다.",
      "대신 그 금속은 살아 있는 자들의 기억을 세금처럼 거둔다. 이 연재는 영원한 도시가 무엇을 먹고 지속되는지 추적하는 장편 소설이다.",
      "사이트는 정적 배포를 기준으로 유지하면서, 회차별 원고와 세계관 조각을 실험적인 웹 인터페이스로 보여주는 포트폴리오 역할을 겸한다."
    ]
  },
  en: {
    localeName: "English",
    title: "Krontium | Serialized Novel",
    description: "Krontium: a serialized novel about god-bone metal and a city that taxes memory",
    navEpisodes: "Episodes",
    navAbout: "About",
    eyebrow: "Serialized Myth / Memory Tax",
    heroLine1: "Krontium is a metal drawn from the bones of a god. Cities made from it do not collapse, and crowns made from it do not let kings die.",
    heroLine2: "Instead, the metal collects the memories of the living like tax.",
    readLatest: "Read latest",
    openLedger: "Open ledger",
    forged: "Forged",
    forgedValue: "God-bone",
    published: "Published",
    cost: "Cost",
    costValue: "Memory tax",
    latest: "Latest levy record",
    part: "Part",
    archiveEyebrow: "Memory Ledger",
    archiveTitle: "Collected Episodes",
    allEpisodes: "View all",
    minutesPrefix: "",
    minutesSuffix: "min read",
    episodesTitle: "Episodes | Krontium",
    episodesIntro: "Krontium preserves the kingdom by writing citizen memories into the ledger. Each episode is a missing name, scent, face, or oath.",
    backEpisodes: "Episodes",
    aboutTitle: "About | Krontium",
    aboutEyebrow: "About Krontium",
    aboutHeading: "The Cost of What Cannot Fall",
    aboutParagraphs: [
      "Krontium is a metal drawn from the bones of a god. Cities made from it do not collapse, and crowns made from it do not let kings die.",
      "Instead, the metal collects the memories of the living like tax. This serial follows what an eternal city must consume in order to endure.",
      "The site stays static-deploy friendly while using an experimental web interface to present episodes and fragments of the world."
    ]
  }
} as const;

export function isLanguage(value: string | undefined): value is Language {
  return value === "ko" || value === "en";
}

export function formatReadingTime(lang: Language, minutes: number) {
  const t = copy[lang];
  return lang === "ko" ? `${t.minutesPrefix} ${minutes}${t.minutesSuffix}` : `${minutes} ${t.minutesSuffix}`;
}
