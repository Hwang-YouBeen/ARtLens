# ARtLens

예술 작품을 인식하고, 관람객이 남긴 감상 코멘트를 AR로 시각화하며 지도 기반으로 예술 경험을 기록·공유하는 앱


**Tech Stack**: React · TypeScript · Vite · Tailwind CSS · OpenCV.js (wasm) · Google Maps JavaScript API · Zustand

TEAM. 황이팅
---

## 1) 주요 기능 (Features)

- **카메라 AR**
  - OpenCV 템플릿 매칭으로 작품 인식 → 화면에 말풍선(코멘트) 오버레이
  - 감지 직후 촬영해도 인식 판정 유지(최근 N초 내 감지 윈도우)
  - iOS/Safari 대응(playsinline, user gesture 처리)

- **기록 & 갤러리**
  - 촬영 이미지/썸네일, 코멘트, GPS 위치, 촬영 시각 저장
  - 내 기록 그리드(삭제/정렬 가능)

- **지도 뷰**
  - 내 기록 핀: **최신** 기록은 골드, 과거 기록은 레드
  - 박물관 핀: 방문 및 기록 데이터 제공
  - 핀 클릭 시 방문일/장소 정보 카드(Overlay)

- **PWA & 아이콘**
  - `manifest.json`, 다중 해상도 아이콘, `apple-touch-icon.png`
  - 네이비/골드 브랜딩, 금가루 텍스처 배경


## 2)주요 기능 (Features)
	+	카메라 AR
	  +	OpenCV 템플릿 매칭으로 작품 인식 → 화면에 말풍선(코멘트) 오버레이
	  +	최근 N초 내 감지 윈도우(촬영 직전에도 인식 판정 유지)
	  +	iOS/Safari 사용자 제스처(탭) 요구 상황 처리
	+	기록 & 갤러리
	  +	촬영 이미지/썸네일, 코멘트, GPS 위치, 촬영 시각 저장
	  +	삭제/정렬 가능한 내 기록 그리드
	+	지도 뷰
	  +	내 기록 핀: 최신 = 골드, 나머지 = 레드
	  +	박물관 핀 샘플 제공, 핀 클릭 시 방문일/장소 카드(Overlay)
	+	PWA & 아이콘
	  +	manifest.json, 다중 해상도 아이콘, apple-touch-icon.png
	  +	네이비/골드 브랜딩 + 금가루 텍스처 배경

## 3)기술 스택 (Tech Stack)
	+	Frontend: React, TypeScript, Vite, Tailwind CSS
	+	Vision: OpenCV.js (WebAssembly)
	+	Map: Google Maps JavaScript API
	+	State: Zustand (+ persist to localStorage)
	+	PWA: Web App Manifest, Icons