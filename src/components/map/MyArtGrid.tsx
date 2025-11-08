import { useState } from "react";
import { useMyArtStore } from "../../store/myArtStore";
import type { MyArtItem } from "../../store/myArtStore";

type ArtItem = {
  title: string;
  artist: string; // 여기선 '박물관'처럼 쓰고 있음
  file: string;
};

const artworks: ArtItem[] = [
  { title: "금동미륵보살반가사유상 (국보 83호)", artist: "국립중앙박물관", file: "gilt_bodhisattva_statue.jpeg" },
  { title: "묘법 – 박서보", artist: "국립현대미술관 서울관", file: "ecriture_parkseobo.jpeg" },
  { title: "노란 옷을 입은 여인상 – 이인성", artist: "대구미술관", file: "lady_in_yellow_leeinseong.jpeg" },
  { title: "05-IV-71#200 (Universe) – 김환기", artist: "리움미술관", file: "universe_kimwhanki.jpeg" },
  { title: "공간 – 이우환", artist: "부산시립미술관", file: "space_leewoo-hwan.jpeg" },
  { title: "별이 빛나는 밤 – 빈센트 반 고흐", artist: "MoMA", file: "starry_night_vangogh.jpeg" },
  { title: "춤추는 하니와", artist: "도쿄국립박물관", file: "dancing_haniwa.jpeg" },
  { title: "모나리자 – 레오나르도 다 빈치", artist: "루브르", file: "mona_lisa_davinci.jpeg" },
  { title: "눈 속의 사냥꾼 – 브뤼겔", artist: "빈 미술사박물관(KHM)", file: "hunters_in_the_snow_breughel.jpeg" },
  { title: "Whaam! – 로이 리히텐슈타인", artist: "테이트 모던", file: "whaam_lichtenstein.jpeg" },
];

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";

type Selected =
  | { kind: "user"; item: MyArtItem }
  | { kind: "static"; art: ArtItem }
  | null;

export default function MyArtGrid() {
  const items = useMyArtStore((s) => s.items);
  const remove = useMyArtStore((s) => s.remove);
  const [selected, setSelected] = useState<Selected>(null);

  const close = () => setSelected(null);

  const handleDelete = (id: string) => {
    if (confirm("이 기록을 삭제할까요?")) {
      remove(id);
      close();
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-3 px-4 pb-8">
        {/* ✅ 내 촬영 기록(최신순) */}
        {items.map((it) => (
          <button
            type="button"
            key={it.id}
            className="relative group"
            onClick={() => setSelected({ kind: "user", item: it })}
          >
            <img
              src={it.thumb || it.image}
              alt={it.comment || "my-art"}
              loading="lazy"
              className="w-full h-[110px] object-cover rounded-lg bg-white/10"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] transition">
              <p className="font-semibold text-center px-2 leading-tight">
                {it.recognizedWorkId === "kkachi_tiger" ? "호작도 · 호암미술관" : it.museumName ?? "내 기록"}
              </p>
              <p className="text-gray-300 text-[9px] mt-1">{fmt(it.shotAt)}</p>
              {it.comment && <p className="text-[9px] mt-1 px-2 text-center truncate w-10/12">{it.comment}</p>}
            </div>
          </button>
        ))}

        {/* ✅ 정적 10장 */}
        {artworks.map((a) => (
          <button
            type="button"
            key={a.file}
            className="relative group"
            onClick={() => setSelected({ kind: "static", art: a })}
          >
            <img
              src={`/MapTabPics/${a.file}`}
              alt={a.title}
              loading="lazy"
              className="w-full h-[110px] object-cover rounded-lg bg-white/10"
            />
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] transition">
              <p className="font-semibold text-center px-2 leading-tight">{a.title}</p>
              <p className="text-gray-300 text-[9px] mt-1">{a.artist}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ✅ 라이트박스(확대 + 정보 + 삭제) */}
      {selected && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-[720px] rounded-2xl overflow-hidden bg-neutral-900/95 border border-white/10 shadow-2xl">
            {/* 닫기 */}
            <button
              onClick={close}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-black text-lg leading-9 text-center hover:bg-white"
              aria-label="닫기"
            >
              ×
            </button>

            {/* 이미지 */}
            <div className="w-full bg-black">
              <img
                src={
                  selected.kind === "user"
                    ? selected.item.image
                    : `/MapTabPics/${selected.art.file}`
                }
                alt={selected.kind === "user" ? (selected.item.comment || "my-art") : selected.art.title}
                className="w-full max-h-[60vh] object-contain"
              />
            </div>

            {/* 정보 */}
            <div className="p-4 text-white/90 space-y-1">
              {selected.kind === "user" ? (
                <>
                  <div className="text-base font-semibold">
                    {selected.item.recognizedWorkId === "kkachi_tiger" ? "호작도(까치호랑이)" : "내 기록"}
                  </div>
                  <div className="text-sm text-white/80">
                    {selected.item.recognizedWorkId === "kkachi_tiger"
                      ? "호암미술관"
                      : selected.item.museumName ?? "내 위치"}
                  </div>
                  <div className="text-sm text-white/70">촬영일: {fmt(selected.item.shotAt)}</div>
                  {selected.item.comment && (
                    <div className="pt-2 text-[13px] leading-5">{selected.item.comment}</div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-base font-semibold">{selected.art.title}</div>
                  <div className="text-sm text-white/80">{selected.art.artist}</div>
                </>
              )}
            </div>

            {/* 삭제 버튼 (내 기록일 때만) */}
            {selected.kind === "user" && (
              <div className="p-4 pt-0 flex justify-end">
                <button
                  onClick={() => handleDelete(selected.item.id)}
                  className="px-4 py-2 rounded-lg bg-red-500/90 hover:bg-red-600 text-white text-sm"
                >
                  기록 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}