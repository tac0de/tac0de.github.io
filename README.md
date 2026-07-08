# Backrooms Drift

정적 배포 가능한 1인칭 anomaly 판정 공포게임.

## 제품 방향

- 사이트 루트가 바로 공포게임을 실행한다.
- 게임 선택 화면은 제거했다.
- 플레이어는 반복되는 백룸 복도를 관찰하고 `정상` 또는 `이상`을 판정한다.
- 정답이면 다음 출구로 진행하고, 오답이면 0번째 출구로 리셋된다.
- 8번째 출구까지 맞히면 클리어 기록이 저장된다.
- 진행도, 최고 기록, 실패 수, 발견한 anomaly는 `localStorage`에 저장된다.
- 서버 없이 GitHub Pages에서 동작하는 정적 게임이다.

## 현재 게임 루프

- 같은 구조의 복도가 반복된다.
- 매 루프마다 정상 복도이거나 하나의 anomaly가 섞인다.
- anomaly 예시:
  - 추가 문
  - 붉어진 경고 표지
  - 반대로 돌아간 화살표
  - 사라진 천장등
  - 길어진 복도
  - 눈처럼 보이는 벽지
  - 젖은 카펫 얼룩
  - 이중 출구 문틀
- WASD와 드래그로 이동/시야 조작을 지원한다.
- 모바일에서는 왼쪽 가상 스틱과 드래그 시야 조작을 지원한다.

## 기술

- Vite
- TypeScript
- Three.js
- WebAudio
- `localStorage` save
- GitHub Pages Actions 배포

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run build
```
