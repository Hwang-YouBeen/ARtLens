// src/pages/MapTab.tsx
import { GoogleMap, useJsApiLoader, Marker, OverlayView } from "@react-google-maps/api";import { useMemo, useState } from "react";
import BottomSheet from "../components/common/BottomSheet";
import MyArtGrid from "../components/map/MyArtGrid";
import { useMyArtStore } from "../store/myArtStore";

type Museum = { name: string; lat: number; lng: number; visitedAt?: string };

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";
const fmtYMD = (d?: string) =>
  d ? new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

const museums: Museum[] = [
  { name: "국립중앙박물관", lat: 37.523984, lng: 126.980355, visitedAt: "2025-11-09" },
  { name: "국립현대미술관 서울관", lat: 37.581717, lng: 126.979596, visitedAt: "2025-10-20" },
  { name: "리움미술관", lat: 37.538617, lng: 127.003118, visitedAt: "2025-09-13" },
  { name: "부산시립미술관", lat: 35.170759, lng: 129.130233, visitedAt: "2025-08-01" },
  { name: "대구미술관", lat: 35.829402, lng: 128.698918, visitedAt: "2025-07-22" },
  { name: "루브르 박물관", lat: 48.860611, lng: 2.337644, visitedAt: "2024-12-05" },
  { name: "빈 미술사박물관(KHM)", lat: 48.203889, lng: 16.361389, visitedAt: "2024-12-07" },
  { name: "도쿄국립박물관", lat: 35.718838, lng: 139.776522, visitedAt: "2024-04-14" },
  { name: "MoMA (뉴욕 현대미술관)", lat: 40.761433, lng: -73.977622, visitedAt: "2023-08-20" },
  { name: "테이트 모던", lat: 51.507595, lng: -0.099356, visitedAt: "2022-11-03" },
];

const defaultCenter = { lat: 37.523984, lng: 126.980355 };

type SelectedUserPin = { kind: "user"; lat: number; lng: number; shotAt?: string; museumName?: string };
type SelectedStatic  = { kind: "static"; lat: number; lng: number; name: string; visitedAt?: string };
type Selected = SelectedUserPin | SelectedStatic;

export default function MapTab() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  const items = useMyArtStore((s) => s.items);       // 내 촬영 기록
  const latestId = items[0]?.id;                     // 최신 기록 id

  const [selected, setSelected] = useState<Selected | null>(null);
  const [sheetSnap, setSheetSnap] = useState(0);
  const [sheetKey, setSheetKey] = useState(0);

  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);

  // ✅ 실제 파일명/경로와 일치!
  const RED_URL  = "/icons/pin-red.png";
  const GOLD_URL = "/icons/pin-gold.png";

  // isLoaded 이후에만 google.maps.Size/Point 사용
  const iconObj = (url: string): google.maps.Icon | undefined =>
    isLoaded
      ? {
          url,
          scaledSize: new window.google.maps.Size(36, 36),
          anchor: new window.google.maps.Point(18, 34),
        }
      : undefined;

  if (loadError) return <div className="text-red-400 grid place-items-center">Map load error</div>;
  if (!isLoaded) return <div className="text-gray-400 grid place-items-center">Loading map...</div>;

  const closeSheet = () => {
    setSheetSnap(0);
    setSheetKey((k) => k + 1);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={3}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
        onClick={() => setSelected(null)}
        onDragStart={() => setSelected(null)}
        onZoomChanged={() => setSelected(null)}
      >
        {/* 정적 박물관: 전부 빨간 압정 */}
        {museums.map((m, i) => (
          <Marker
            key={`static-${i}`}
            position={{ lat: m.lat, lng: m.lng }}
            onClick={() =>
              setSelected({ kind: "static", lat: m.lat, lng: m.lng, name: m.name, visitedAt: m.visitedAt })
            }
            icon={iconObj(RED_URL) ?? RED_URL}
          />
        ))}

        {/* 내 기록: 최신만 골드, 나머진 레드 */}
        {items
          .filter((it) => it.lat != null && it.lng != null)
          .map((it) => {
            const url = it.id === latestId ? GOLD_URL : RED_URL;
            return (
              <Marker
                key={it.id}
                position={{ lat: it.lat as number, lng: it.lng as number }}
                onClick={() =>
                  setSelected({
                    kind: "user",
                    lat: it.lat as number,
                    lng: it.lng as number,
                    shotAt: it.shotAt,
                    museumName: it.recognizedWorkId === "kkachi_tiger" ? "호암미술관" : it.museumName ?? "내 위치",
                  })
                }
                icon={iconObj(url) ?? url}
              />
            );
          })}

        {selected && (
            <OverlayView
                position={{ lat: selected.lat, lng: selected.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
                <div className="relative -translate-y-4">
                {/* 꼬리(핀 위에) */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0 h-0 border-l-8 border-r-8 border-b-8
                                border-l-transparent border-r-transparent border-b-[#0B1224]/90 drop-shadow" />
                {/* 카드 */}
                <div className="mt-2 min-w-[220px] max-w-[260px] rounded-xl bg-[#0B1224]/90 text-white shadow-xl
                                border border-[#F2B950]/35 p-3 backdrop-blur">
                    {selected.kind === "user" ? (
                    <>
                        <div className="text-[12px] text-white/65">방문일</div>
                        <div className="text-[13px] font-semibold">{fmtDate(selected.shotAt)}</div>
                        <div className="mt-1 text-[13px]">{selected.museumName}</div>
                    </>
                    ) : (
                    <>
                        <div className="text-[12px] text-white/65">방문일</div>
                        <div className="text-[13px] font-semibold">{fmtYMD(selected.visitedAt)}</div>
                        <div className="mt-1 text-[13px]">{selected.name}</div>
                    </>
                    )}
                </div>
                </div>
            </OverlayView>
            )}
      </GoogleMap>

      {/* 바텀시트: 헤더에서 닫기 버튼 제거한 버전 */}
      <BottomSheet
        key={sheetKey}
        snapPoints={[0.12, 0.45, 0.88]}
        initialSnap={sheetSnap}
        onSnapChange={setSheetSnap}
        heightOffset={70}
        header={
          <div className="flex items-center justify-between gap-2 pr-1">
            <div>
              <div className="text-sm text-white/60">나의 예술 기록</div>
              <div className="text-base font-semibold">모아보기</div>
            </div>
            {/* 닫기 버튼 제거 */}
          </div>
        }
      >
        <div style={{ paddingBottom: "calc(70px + env(safe-area-inset-bottom, 0px))" }}>
          <MyArtGrid />
        </div>
      </BottomSheet>
    </div>
  );
}