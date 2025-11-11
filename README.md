ARtLens

카메라로 작품을 인식하고, 즉석 감상(말풍선)을 남겨 위치와 함께 저장한 뒤 지도로 모아보는 PWA.

Tech Stack: React + TypeScript + Vite, Tailwind CSS, OpenCV.js (wasm), Google Maps JavaScript API, Zustand

⸻

1. 주요 기능 (Features)
	•	카메라 AR
	•	iOS/Safari 대응
	•	OpenCV 템플릿 매칭으로 작품 인식 → 화면에 말풍선(코멘트) 오버레이
	•	감지 직후 촬영해도 인식 판정 유지(최근 N초 내 감지 윈도우)
	•	기록 & 갤러리
	•	촬영 이미지/썸네일, 코멘트, GPS 위치, 촬영시각 저장
	•	삭제/정렬 가능한 내 기록 그리드
	•	지도 뷰
	•	내 기록 핀: 최신 기록은 골드, 나머지는 레드
	•	박물관 핀: 방문 및 기록 데이터 제공
	•	핀 클릭 시 방문일/장소 정보 카드(Overlay)
	•	PWA & 아이콘
	•	manifest.json, 다중 해상도 아이콘, apple-touch-icon.png 포함
	•	네이비/골드 브랜딩, 금가루 텍스처 배경

2. 프로젝트 구조 (Project Structure)
  ARtLens/
├─ public/
│  ├─ icons/                 # app & map pins (red/gold)
│  ├─ opencv/                # OpenCV.js + opencv_js.wasm
│  ├─ ref/                   # template 이미지(데모용)
│  ├─ textures/              # gold-noise 텍스처
│  ├─ favicon-16.png, ...
│  ├─ apple-touch-icon.png
│  └─ manifest.json
├─ src/
│  ├─ app/AppShell.tsx       # 탭 네비(카메라/지도) + 배경
│  ├─ pages/
│  │  ├─ CameraTab.tsx       # 카메라/AR/인식/촬영/저장
│  │  └─ MapTab.tsx          # 지도/핀/오버레이/바텀시트
│  ├─ components/
│  │  ├─ common/BottomSheet.tsx
│  │  └─ map/MyArtGrid.tsx
│  ├─ lib/
│  │  ├─ vision.ts           # waitCv, matchAndLocate, buildRefDescriptor
│  │  ├─ places.ts           # 장소 유틸
│  │  └─ artworks.ts         # 작품/데모 데이터
│  ├─ store/myArtStore.ts    # Zustand + persist(localStorage)
│  ├─ styles/tailwind.css
│  ├─ types/opencv.d.ts
│  ├─ App.tsx
│  └─ main.tsx
├─ index.html                # OpenCV wasm locate 설정
├─ package.json
├─ .env.example              # 환경변수 샘플
└─ tsconfig.app.json

3. 시작하기 (Getting Started)
# 설치
npm install

# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build
npm run preview    # 로컬 미리보기

4. 지도/핀
	•	정적 박물관 핀: /src/pages/MapTab.tsx museums 배열 샘플
	•	내 기록 핀:
	•	최신 기록: /public/icons/pin-gold.png
	•	과거 기록: /public/icons/pin-red.png

5. 상태 관리
	•	Zustand + persist 로 localStorage에 기록 저장
	•	타입: src/store/myArtStore.ts의 MyArtItem
  type MyArtItem = {
  id: string;
  image: string;   // dataURL or https
  thumb: string;   // ≤300px dataURL
  comment: string;
  lat: number | null;
  lng: number | null;
  shotAt: string;  // ISO
  recognizedWorkId?: string;
  museumName?: string;
};

6. PWA & 아이콘
	•	public/manifest.json에 앱 이름/아이콘 정의
	•	public/apple-touch-icon.png (iOS 홈 화면 아이콘)
	•	아이콘 교체 시 동일 파일명을 유지하거나 manifest.json을 업데이트 하세요.

7. 트러블슈팅 (Troubleshooting)
	•	HTTPS 환경 확인, 브라우저 권한(카메라/위치) 허용
	•	OpenCV wasm 404
	•	public/opencv/opencv.js, public/opencv/opencv_js.wasm가 실제로 배포되었는지 확인
	•	index.html의 locateFile 경로가 배포 경로와 일치하는지 확인
	•	지도 API 에러
	•	브라우저 콘솔의 Google Maps 에러 메시지를 확인
	•	API Key, 도메인 리퍼러 제한, 결제 설정 확인