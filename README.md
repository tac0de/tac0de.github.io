# Tacode Arcade

플레이 가능한 웹 게임 실험 포트폴리오.

## 현재 방향

- 루트는 게임 선택 화면
- `/games/backrooms/`는 첫 번째 playable title인 Backrooms Drift
- `/games/cards/`는 Stacklands-inspired card survival prototype
- 카드 게임은 drag, stack, timed production, day hunger loop 지원
- 모바일 우선 1인칭 탐색
- 플레이어 주변 청크만 렌더링하는 절차적 백룸
- `InstancedMesh` 기반 벽, 바닥, 천장 렌더링
- 단순 grid 충돌
- 저해상도 render target 업스케일, 8-bit 팔레트 양자화, VHS식 노이즈
- 신호를 따라 exit에 도달하면 암전 후 다음 상태로 전환
- echo 3개를 수집해야 exit 신호가 열리는 짧은 세션 루프
- `AudioDirector` 기반 저역 hum, 전기 노이즈, 발소리, 불협화음, 짧은 drop-out
- Level 0과 Lost Time의 맵 패턴, 색감, 신호 안정성 차별화
- `InstancedMesh` 기반 천장등, 바닥 얼룩, echo, 랜드마크 props
- GitHub Pages Actions 배포

## 다음 고도화

### 구현됨

- WebAudio 사운드 디렉터 분리
- 레벨별 hum, 노이즈, 필터, 불협화음 프로필
- 플레이어 이동 속도 기반 발소리
- signal 강도에 따른 stereo pan 흔들림, drop-out
- Level 0과 Lost Time의 다른 색감, fog, 팔레트, 맵 패턴
- 신호 강도별 HUD 상태 피드백
- echo 수집 후 exit unlock
- 모바일 성능을 유지하는 `InstancedMesh` 기반 반복 props
- favicon/OG image SVG
- GitHub Pages workflow

### 사운드

- 레벨별 리버브 프로필
- 바닥 재질별 마찰음
- exit 접근, 레벨 전환, Lost Time 진입용 이벤트 사운드 강화
- 추후 커스텀 음원 파일을 `public/audio/`에서 로드하는 구조

### 게임 플레이

- 실패 조건, 세션 점수 또는 기록
- exit 도달 조건, 클리어 판정, 다음 상태 전환 연출 정교화
- Level 0과 Lost Time의 다른 위험 요소
- 간단한 추격자보다 먼저 시야/소리/공간 왜곡 기반 위협
- 3-5분 세션 기준의 시작, 긴장 상승, 탈출, 실패 루프

### 비주얼

- 문틀, 표지판, 파이프, 젖은 바닥 같은 저비용 반복 props
- 저해상도 render target, VHS tearing, 색수차 강도 조절
- exit 근처에서 공간이 접히거나 벽 UV가 밀리는 왜곡
- 레벨별 랜드마크 방과 기억 가능한 공간

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run build
```
