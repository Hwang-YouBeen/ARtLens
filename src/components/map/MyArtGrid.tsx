import { useState } from "react";
import { useMyArtStore } from "../../store/myArtStore";
import type { MyArtItem } from "../../store/myArtStore";

type ArtItem = {
    title: string;
    artist: string;   // <-'박물관'
    file: string;
    visitedAt?: string; // ← ISO 날짜 "YYYY-MM-DD"
    comment?: string;   // ← 코멘트
  };

  const artworks: ArtItem[] = [
    { title: "금동미륵보살반가사유상 (국보 83호)", artist: "국립중앙박물관", file: "gilt_bodhisattva_statue.jpeg", visitedAt: "2025-11-01", comment: "무게가 있는 금속인데도 마음은 오히려 가벼워지는 느낌." },
    { title: "묘법 – 박서보", artist: "국립현대미술관 서울관", file: "ecriture_parkseobo.jpeg", visitedAt: "2025-10-20", comment: "질감은 거칠지만 마음은 점점 고요해진다." },
    { title: "노란 옷을 입은 여인상 – 이인성", artist: "대구미술관", file: "lady_in_yellow_leeinseong.jpeg", visitedAt: "2025-09-13", comment: "햇빛 속에서도 마음은 늘 같은 색이 아닐 수 있음을 배운다." },
    { title: "05-IV-71#200 (Universe) – 김환기", artist: "리움미술관", file: "universe_kimwhanki.jpeg", visitedAt: "2025-08-30", comment: "끝이 없다는 사실이 오히려 안심이 된다." },
    { title: "공간 – 이우환", artist: "부산시립미술관", file: "space_leewoo-hwan.jpeg", visitedAt: "2025-08-01", comment: "덜어내는 용기—내 일상에도 조금씩 적용해보고 싶다." },
    { title: "별이 빛나는 밤 – 빈센트 반 고흐", artist: "MoMA", file: "starry_night_vangogh.jpeg", visitedAt: "2023-08-20", comment: "하늘이 소용돌이치는데, 이상하게 마음은 멈춰 선다." },
    { title: "춤추는 하니와", artist: "도쿄국립박물관", file: "dancing_haniwa.jpeg", visitedAt: "2024-04-14", comment: "역사도 결국 누군가의 장난기에서 출발할지 모른다." },
    { title: "모나리자 – 레오나르도 다 빈치", artist: "루브르", file: "mona_lisa_davinci.jpeg", visitedAt: "2024-12-05", comment: "정답이 없는 표정 앞에서 나도 설명을 멈춘다." },
    { title: "눈 속의 사냥꾼 – 브뤼겔", artist: "빈 미술사박물관(KHM)", file: "hunters_in_the_snow_breughel.jpeg", visitedAt: "2024-12-07", comment: "고요한 겨울에도 삶은 계속된다는 확신." },
    { title: "Whaam! – 로이 리히텐슈타인", artist: "테이트 모던", file: "whaam_lichtenstein.jpeg", visitedAt: "2022-11-03", comment: "보는 것과 느끼는 것 사이의 거리를 생각하게 된다." },
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
      <div className="grid grid-cols-3 gap-1.5 px-0 pb-8">
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
              className="w-full h-[110px] object-cover rounded-none bg-white/5"
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

            {/* ▼ 추가: 관람일 + 코멘트 요약 */}
            {a.visitedAt && <p className="text-gray-300 text-[9px] mt-1">{fmt(a.visitedAt)}</p>}
            {a.comment && (
                <p className="text-[9px] mt-1 px-2 text-center truncate w-10/12">{a.comment}</p>
            )}
            </div>
        </button>
        ))}
      </div>

      {/* ✅ 라이트박스(확대 + 정보 + 삭제) */}
      {selected && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm">
          <div
            className="absolute left-3 right-3 rounded-2xl overflow-hidden bg-neutral-900/95 border border-white/10 shadow-2xl flex flex-col"
            style={{
              top: 12,
              // 탭바(70px) + iOS/안드로이드 안전영역 + 여백
              bottom: "calc(70px + env(safe-area-inset-bottom, 0px) + 12px)",
              maxHeight: "calc(100svh - (70px + env(safe-area-inset-bottom, 0px) + 24px))",
            }}
          >
            {/* 닫기 */}
            <div className="absolute top-3 right-3 z-[5]">
                <button
                onClick={close}
                aria-label="닫기"
                className="px-3 py-1.5 rounded-lg border border-[#F2B950]/40 bg-black/30 text-[13px] text-white hover:bg-white/10"
                >
                X
                </button>
            </div>


            {/* 이미지 */}
            <div className="w-full bg-black">
              <img
                src={selected.kind === "user" ? selected.item.image : `/MapTabPics/${selected.art.file}`}
                alt={selected.kind === "user" ? (selected.item.comment || "my-art") : selected.art.title}
                className="w-full max-h-[50vh] object-contain"
              />
            </div>

            {/* 정보 */}
            <div className="p-4 text-white/90 space-y-1 overflow-y-auto">
              {selected.kind === "user" ? (
                <>
                  <div className="text-base font-semibold">
                    {selected.item.recognizedWorkId === "kkachi_tiger" ? "호작도(까치호랑이)" : "내 기록"}
                  </div>
                  <div className="text-sm text-white/80">
                    {selected.item.recognizedWorkId === "kkachi_tiger" ? "호암미술관" : selected.item.museumName ?? "내 위치"}
                  </div>
                  <div className="text-sm text-white/70">관람일: {fmt(selected.item.shotAt)}</div>
                  {selected.item.comment && <div className="pt-2 text-[13px] leading-5">{selected.item.comment}</div>}
                </>
              ) : (
                <>
                    <div className="text-base font-semibold">{selected.art.title}</div>
                    <div className="text-sm text-white/80">{selected.art.artist}</div>

                    {/* ▼ 추가: 관람일 + 코멘트 */}
                    {selected.art.visitedAt && (
                    <div className="text-sm text-white/70">관람일: {fmt(selected.art.visitedAt)}</div>
                    )}
                    {selected.art.comment && (
                    <div className="pt-2 text-[13px] leading-5">{selected.art.comment}</div>
                    )}
                </>
              )}
            </div>

            {/* ✅ 항상 보이게. 정적 항목이면 닫기 동작 */}
            <div className="p-4 pt-0 flex justify-end">
              <button
                onClick={() =>
                  selected.kind === "user" ? handleDelete(selected.item.id) : close()
                }
                className="px-4 py-2 rounded-lg bg-red-500/90 hover:bg-red-600 text-white text-sm"
              >
                기록 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}