import { useState } from "react";
import CameraTab from "../pages/CameraTab";
import MapTab from "../pages/MapTab";

const NAV_H = 70; // 탭바 높이(px)

export default function AppShell() {
  const [tab, setTab] = useState<"camera" | "map">("camera"); //기본을 카메라로 햇음

  return (
    <main
      className="w-full h-[100dvh] flex flex-col bg-black text-white"
    >
      {tab === "camera" ? <CameraTab /> : <MapTab />}
      {/* 탭바는 항상 보이게 고정 */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-[70px] border-t border-white/10 backdrop-blur bg-black/80 flex items-center justify-around z-[50]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          onClick={() => setTab("camera")}
          className={`px-4 py-2 ${tab === "camera" ? "text-blue-400" : "text-gray-400"}`}
        >
          카메라
        </button>
        <button
          onClick={() => setTab("map")}
          className={`px-4 py-2 ${tab === "map" ? "text-blue-400" : "text-gray-400"}`}
        >
          지도
        </button>
      </nav>
    </main>
  );
}