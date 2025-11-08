// src/pages/MapTab.tsx
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { useMemo, useState } from "react";
import BottomSheet from "../components/common/BottomSheet";
import MyArtGrid from "../components/map/MyArtGrid";
import { useMyArtStore } from "../store/myArtStore";

// ---------- 타입 & 유틸 ----------
type Museum = {
  name: string;
  lat: number;
  lng: number;
  visitedAt?: string; // "YYYY-MM-DD"
};

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    : "—";

const fmtYMD = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    : "—";

// ---------- 데이터(정적 10개) ----------
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

// ---------- 컴포넌트 ----------
type SelectedUserPin = { kind: "user"; lat: number; lng: number; shotAt?: string; museumName?: string };
type SelectedStatic = { kind: "static"; lat: number; lng: number; name: string; visitedAt?: string };
type Selected = SelectedUserPin | SelectedStatic;

export default function MapTab() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  const items = useMyArtStore((s) => s.items); // ✅ 촬영 내역
  const [selected, setSelected] = useState<Selected | null>(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);

  if (loadError) {
    console.error("Google Maps loadError:", loadError);
    return <div className="text-red-400 grid place-items-center">Map load error</div>;
  }
  if (!isLoaded) {
    return <div className="text-gray-400 grid place-items-center">Loading map...</div>;
  }

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
        {/* ✅ 정적 10핀 */}
        {museums.map((m, i) => (
          <Marker
            key={`static-${i}`}
            position={{ lat: m.lat, lng: m.lng }}
            onClick={() => setSelected({ kind: "static", lat: m.lat, lng: m.lng, name: m.name, visitedAt: m.visitedAt })}
            icon={{
              url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
              scaledSize: new window.google.maps.Size(40, 40),
            }}
          />
        ))}

        {/* ✅ 내 촬영 핀 */}
        {items
          .filter((it) => it.lat != null && it.lng != null)
          .map((it) => (
            <Marker
              key={it.id}
              position={{ lat: it.lat as number, lng: it.lng as number }}
              onClick={() =>
                setSelected({
                  kind: "user",
                  lat: it.lat as number,
                  lng: it.lng as number,
                  shotAt: it.shotAt,
                  // 규칙: 호작도라면 호암미술관, 아니면 저장된 museumName 또는 '내 위치'
                  museumName: it.recognizedWorkId === "kkachi_tiger" ? "호암미술관" : it.museumName ?? "내 위치",
                })
              }
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                scaledSize: new window.google.maps.Size(40, 40),
              }}
            />
          ))}

        {/* ✅ 인포윈도우 */}
        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -2) }}
          >
            <div className="text-black text-sm leading-5">
              {selected.kind === "user" ? (
                <>
                  <div>
                    <span className="text-neutral-500">방문일: </span>
                    <span className="font-medium">{fmtDate(selected.shotAt)}</span>
                  </div>
                  <div className="mt-1 font-semibold">{selected.museumName}</div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-neutral-500">방문일: </span>
                    <span className="font-medium">{fmtYMD(selected.visitedAt)}</span>
                  </div>
                  <div className="mt-1 font-semibold">{selected.name}</div>
                </>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* 바텀시트: 내 기록 그리드(정적 10개와 별개) */}
      <BottomSheet
        snapPoints={[0.12, 0.45, 0.88]}
        initialSnap={0}
        heightOffset={70}
        header={
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">나의 예술 기록</div>
              <div className="text-base font-semibold">모아보기</div>
            </div>
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