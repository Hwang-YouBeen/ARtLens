// src/lib/artworks.ts

export type Artwork = {
  id: string;
  museum: string;
  title: string;
  artist?: string;
  alias?: string;
};

export const ARTWORKS: Artwork[] = [
  { id: "kr-01", museum: "국립중앙박물관", title: "금동미륵보살반가사유상(국보 83호)" },
  { id: "kr-02", museum: "국립현대미술관 서울관", title: "묘법", artist: "박서보" },
  { id: "kr-03", museum: "대구미술관", title: "노란 옷을 입은 여인상", artist: "이인성" },
  { id: "kr-04", museum: "리움미술관", title: "05-IV-71#200 (Universe)", artist: "김환기" },
  { id: "kr-05", museum: "부산시립미술관 별관", title: "공간", artist: "이우환" },
  { id: "mo-01", museum: "MoMA (뉴욕 현대미술관)", title: "별이 빛나는 밤", artist: "빈센트 반 고흐" },
  { id: "jp-01", museum: "도쿄국립박물관", title: "춤추는 하니와" },
  { id: "fr-01", museum: "루브르 박물관", title: "모나리자", artist: "레오나르도 다 빈치" },
  { id: "at-01", museum: "빈 미술사박물관(KHM)", title: "눈 속의 사냥꾼", artist: "브뤼겔" },
  { id: "uk-01", museum: "테이트 모던", title: "Whaam!", artist: "로이 리히텐슈타인" },
];

// ✅ MVP 데모용 ‘호작도(까치호랑이)’ 더미 작품 (국립중앙박물관으로 귀속)
export const MVP_HOJAKDO: Artwork = {
  id: "mvp-hojakdo",
  museum: "국립중앙박물관",
  title: "호작도(까치호랑이)",
  alias: "호작도",
};