import { useState } from "react";
import CameraTab from "../pages/CameraTab";
import MapTab from "../pages/MapTab";

/**
 * AppShell
 * - 네비게이션이 고정된 전체 레이아웃 컨테이너
 * - 다크 네이비 배경 + 골드 텍스처(노이즈 마스크)
 * - 하단 탭바: 카메라 / 지도
 */

/* Layout */
const NAV_H = 70; // 탭바 높이(px)

/* Theme */
const GOLD = "#F2B950"; // 골드 톤(필요 시 여기만 조절)

/* Gold noise mask (CSS mask에 얹을 SVG) */
const GOLD_NOISE_MASK_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>
     <filter id='f'>
       <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7'/>
       <!-- 낮은 알파만 통과시켜 점묘처럼 보이게 함 -->
       <feColorMatrix type='matrix' values='0 0 0 0 0
                                            0 0 0 0 0
                                            0 0 0 0 0
                                            0 0 0 6 -3'/>
     </filter>
     <rect width='100%' height='100%' filter='url(%23f)' fill='white'/>
   </svg>`
)}`;

export default function AppShell() {
  const [tab, setTab] = useState<"camera" | "map">("camera"); // 기본 탭: 카메라

  return (
    <main
      className="relative w-full h-[100dvh] text-white overflow-hidden"
      // 콘텐츠가 탭바에 가려지지 않도록 하단 패딩 확보
      style={{ paddingBottom: `calc(${NAV_H}px + env(safe-area-inset-bottom, 0px))` }}
    >
      {/* =========================================================
         =                   Background Layers                   =
         =  1) 네이비 그라디언트 베이스                           =
         =  2) 라디얼 골드 글로우                                =
         =  3) 골드 노이즈(마스크)                                =
         ========================================================= */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* 1) 네이비 그라디언트 */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b1220_0%,#0d1530_55%,#0b1220_100%)]" />

        {/* 2) 은은한 골드 라이트(라디얼) */}
        <div className="absolute inset-0 mix-blend-screen opacity-60">
          <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_15%_10%,rgba(242,185,80,0.10),transparent_60%),radial-gradient(1000px_700px_at_85%_25%,rgba(242,185,80,0.07),transparent_60%),radial-gradient(800px_600px_at_50%_85%,rgba(242,185,80,0.05),transparent_60%)]" />
        </div>

        {/* 3) 골드 파티클(노이즈 마스크) */}
        <div
          className={[
            "absolute inset-0 pointer-events-none mix-blend-screen",
            "opacity-25", // 골드 파티클 강도(0.15~0.35 권장)
            "bg-[color:var(--gold)]",
            // 표준 마스크
            `[mask-image:url('${GOLD_NOISE_MASK_DATA_URL}')]`,
            "[mask-size:cover] [mask-repeat:no-repeat]",
            // WebKit(사파리) 마스크
            `[-webkit-mask-image:url('${GOLD_NOISE_MASK_DATA_URL}')]`,
            "[-webkit-mask-size:cover] [-webkit-mask-repeat:no-repeat]",
          ].join(" ")}
          style={{ ["--gold" as any]: GOLD }}
        />
      </div>
      {/* ============================ /Background ============================ */}

      {/* Content */}
      {tab === "camera" ? <CameraTab /> : <MapTab />}

      {/* Bottom Tab Bar (fixed) */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-[70px] border-t border-white/10 backdrop-blur-md bg-[rgba(10,16,30,0.72)] flex items-center justify-around z-[50]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* 상단 골드 헤어라인 */}
        <span
          className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F2B950]/40 to-transparent"
          aria-hidden
        />

        {/* Camera Tab */}
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

        {/* Map Tab */}
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