import { useState } from "react";
import CameraTab from "../pages/CameraTab";
import MapTab from "../pages/MapTab";

export default function AppShell() {
  const [tab, setTab] = useState<"camera" | "map">("camera");

  return (
    <main className="w-full h-[100dvh] flex flex-col bg-black text-white">
      {/* 현재 선택된 탭의 콘텐츠 */}
      <div
        className="overflow-hidden"
        style={{ height: "calc(100dvh - 70px)" }}   // ✅ 하단 탭 70px 제외한 실높이
      >
        {tab === "camera" ? <CameraTab /> : <MapTab />}
      </div>

      {/* 하단 탭 바 */}
      <nav className="h-[70px] flex justify-around items-center bg-black/80 border-t border-white/10 backdrop-blur">
        <button
          onClick={() => setTab("camera")}
          className={`px-4 py-2 transition-colors ${
            tab === "camera" ? "text-blue-400" : "text-gray-400"
          }`}
        >
          카메라
        </button>
        <button
          onClick={() => setTab("map")}
          className={`px-4 py-2 transition-colors ${
            tab === "map" ? "text-blue-400" : "text-gray-400"
          }`}
        >
          지도
        </button>
      </nav>
    </main>
  );
}