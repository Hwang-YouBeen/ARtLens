import { useState } from "react";
import CameraTab from "../pages/CameraTab";
import MapTab from "../pages/MapTab";

const NAV_H = 70; // 탭바 높이(px)

// 골드(금가루) 색상 — 필요하면 여기만 바꿔서 전체 톤 조절
const GOLD = "#F2B950";

export default function AppShell() {
  const [tab, setTab] = useState<"camera" | "map">("camera"); // 기본: 카메라

  return (
    <main
      className="relative w-full h-[100dvh] text-white overflow-hidden"
      style={{
        // 탭바만큼 컨텐츠 하단 여백 확보 (가림 방지)
        paddingBottom: `calc(${NAV_H}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {/* ---------- 배경 레이어: 다크 네이비 + 금가루 ---------- */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* 1) 네이비 그라디언트 베이스 */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b1220_0%,#0d1530_55%,#0b1220_100%)]" />

        {/* 2) 은은한 골드 광량(라디얼) */}
        <div className="absolute inset-0 mix-blend-screen opacity-60">
          <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_15%_10%,rgba(242,185,80,0.10),transparent_60%),radial-gradient(1000px_700px_at_85%_25%,rgba(242,185,80,0.07),transparent_60%),radial-gradient(800px_600px_at_50%_85%,rgba(242,185,80,0.05),transparent_60%)]" />
        </div>

        {/* 3) 금가루 질감(노이즈 마스크) */}
        <div
          className={[
            "absolute inset-0 pointer-events-none mix-blend-screen",
            "opacity-25", // ← 금가루 양(진하기) 조절: 0.15 ~ 0.35 권장
            "bg-[color:var(--gold)]",
            // CSS 마스크로 점묘(노이즈) 패턴을 뿌림 (WebKit 계열 우선)
            "[mask-image:url('data:image/svg+xml;utf8,",
            encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>
                <filter id='f'>
                  <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7'/>
                  <!-- threshold 비슷한 효과: 알파를 낮은 값만 통과시켜 점으로 -->
                  <feColorMatrix type='matrix' values='0 0 0 0 0
                                                       0 0 0 0 0
                                                       0 0 0 0 0
                                                       0 0 0 6 -3'/>
                </filter>
                <rect width='100%' height='100%' filter='url(%23f)' fill='white'/>
              </svg>`
            ),
            "')]",
            "[mask-size:cover] [mask-repeat:no-repeat]",
            "[-webkit-mask-image:url('data:image/svg+xml;utf8,",
            encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>
                <filter id='f'>
                  <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7'/>
                  <feColorMatrix type='matrix' values='0 0 0 0 0
                                                       0 0 0 0 0
                                                       0 0 0 0 0
                                                       0 0 0 6 -3'/>
                </filter>
                <rect width='100%' height='100%' filter='url(%23f)' fill='white'/>
              </svg>`
            ),
            "')]",
            "[-webkit-mask-size:cover] [-webkit-mask-repeat:no-repeat]",
          ].join(" ")}
          style={{ ["--gold" as any]: GOLD }}
        />
      </div>
      {/* ---------- /배경 레이어 ---------- */}

      {/* 컨텐츠 */}
      {tab === "camera" ? <CameraTab /> : <MapTab />}

      {/* 탭바 (고정) */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-[70px] border-t border-white/10 backdrop-blur-md bg-[rgba(10,16,30,0.72)] flex items-center justify-around z-[50]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* 상단에 얇은 골드 라인(고급스러운 디테일) */}
        <span
          className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F2B950]/40 to-transparent"
          aria-hidden
        />
        <button
          onClick={() => setTab("camera")}
          className={[
            "px-4 py-2 font-medium transition",
            tab === "camera" ? "text-white" : "text-white/70 hover:text-white",
          ].join(" ")}
        >
          카메라
          <span
            className={[
              "block mx-auto mt-1 h-[3px] rounded-full transition-all",
              tab === "camera" ? "w-6 bg-white/90" : "w-0 bg-transparent",
            ].join(" ")}
          />
        </button>
        <button
          onClick={() => setTab("map")}
          className={[
            "px-4 py-2 font-medium transition",
            tab === "map" ? "text-white" : "text-white/70 hover:text-white",
          ].join(" ")}
        >
          지도
          <span
            className={[
              "block mx-auto mt-1 h-[3px] rounded-full transition-all",
              tab === "map" ? "w-6 bg-white/90" : "w-0 bg-transparent",
            ].join(" ")}
          />
        </button>
      </nav>
    </main>
  );
}