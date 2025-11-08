// src/lib/places.ts
export function museumNameFor(item: { recognizedWorkId?: string; museumName?: string }) {
    // 호작도(까치호랑이)는 무조건 호암미술관
    if (item.recognizedWorkId === "kkachi_tiger") return "호암미술관";
    if (item.museumName) return item.museumName;
    return "미확인 장소";
  }
  
  export function formatShotDate(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }