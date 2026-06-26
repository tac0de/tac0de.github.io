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
    openLedger: "연재 읽기",
    forged: "주조",
    forgedValue: "신의 뼈",
    published: "공개",
    cost: "대가",
    costValue: "기억세",
    latest: "새 회차",
    part: "CHAPTER",
    taxStream: ["어머니의 수프 냄새", "처음 배운 이름", "돌아갈 집의 윤곽", "왕의 마지막 숨", "젖은 신발의 습관"],
    memoryShards: ["냄새", "이름", "맹세"],
    archiveEyebrow: "Archive",
    archiveTitle: "공개된 장",
    allEpisodes: "전체 보기",
    archiveDepthEyebrow: "Endless Archive",
    archiveDepthTitle: "도시는 잊힌 것을 줄 세워 보관한다",
    archiveDepthIntro: "Krontium에 납부된 기억은 사라지지 않는다. 이름을 잃은 기록, 냄새만 남은 방, 돌아갈 곳의 윤곽이 도시의 금속층 아래에서 계속 이동한다.",
    archiveLoopLabel: "징수 단면",
    archiveRecords: [
      "부엌에 남아야 했던 수프 냄새",
      "대관식 전날 사라진 죽음의 표정",
      "문을 바라보는 아이의 기다림",
      "북문 광장의 첫 번째 침묵",
      "왕관 안쪽의 작은 가시",
      "젖은 신발을 벗던 집의 문턱"
    ],
    cadence: "매주 3편 연재",
    previousEpisode: "이전 회차",
    nextEpisode: "다음 회차",
    continueReading: "계속 읽기",
    continueHint: "다음 장으로 넘어가기",
    returnToArchive: "공개된 장 전체 보기",
    noPreviousEpisode: "첫 회차입니다",
    noNextEpisode: "다음 회차 준비 중",
    episodesTitle: "연재 목록 | Krontium",
    episodesIntro: "Krontium은 왕국을 보존하는 대신 시민의 기억을 도시의 금속 속에 남긴다. 각 장은 누군가에게서 사라진 이름, 냄새, 얼굴, 맹세의 일부다.",
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
    openLedger: "Read serial",
    forged: "Forged",
    forgedValue: "God-bone",
    published: "Published",
    cost: "Cost",
    costValue: "Memory tax",
    latest: "Latest chapter",
    part: "CHAPTER",
    taxStream: ["mother's soup scent", "a first learned name", "the outline of home", "the king's final breath", "the habit of wet shoes"],
    memoryShards: ["scent", "name", "oath"],
    archiveEyebrow: "Archive",
    archiveTitle: "Published Chapters",
    allEpisodes: "View all",
    archiveDepthEyebrow: "Endless Archive",
    archiveDepthTitle: "The city shelves what it has made people forget",
    archiveDepthIntro: "Memory paid into Krontium does not disappear. Records without names, rooms reduced to scent, and outlines of home keep moving beneath the city's metal skin.",
    archiveLoopLabel: "collection section",
    archiveRecords: [
      "the soup scent that should have remained in a kitchen",
      "the king's missing expression before coronation",
      "the child's waiting fixed toward a doorway",
      "the first silence in the north gate square",
      "small thorns inside the crown",
      "the threshold where wet shoes were removed"
    ],
    cadence: "3 episodes weekly",
    previousEpisode: "Previous",
    nextEpisode: "Next",
    continueReading: "Continue reading",
    continueHint: "Move to the next chapter",
    returnToArchive: "View all published chapters",
    noPreviousEpisode: "First episode",
    noNextEpisode: "Next episode pending",
    episodesTitle: "Episodes | Krontium",
    episodesIntro: "Krontium preserves the kingdom by leaving citizen memories inside the city's metal. Each chapter is a missing name, scent, face, or oath.",
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
