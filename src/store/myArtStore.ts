import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* =========================================
 * Types
 * =======================================*/

/** 한 번의 촬영/저장으로 생성되는 사용자 기록 */
export type MyArtItem = {
  id: string;
  image: string;              // 원본 이미지(Data URL 또는 HTTPS URL)
  thumb: string;              // 썸네일(Data URL, 가급적 ≤ 300px)
  comment: string;
  lat: number | null;
  lng: number | null;
  shotAt: string;             // ISO 문자열
  recognizedWorkId?: string;  // 예: "kkachi_tiger"
  museumName?: string;        // 역지오코딩/인식 결과로 추정된 장소명
};

type AddFromCameraArgs = {
  image: string;
  thumb: string;
  comment: string;
  lat: number | null;
  lng: number | null;
  recognizedWorkId?: string;
  museumName?: string;
};

type MyArtState = {
  items: MyArtItem[];
  /** 맨 앞에 새 항목 추가 */
  addItem: (item: MyArtItem) => void;
  /**
   * 카메라 캡처 결과로 항목 생성 후 추가
   * @returns 생성된 항목
   */
  addFromCamera: (args: AddFromCameraArgs) => Promise<MyArtItem>;
  /** 모든 기록 삭제 */
  clear: () => void;
  /** 개별 기록 삭제 */
  remove: (id: string) => void;
};

/* =========================================
 * Selectors
 * =======================================*/

export const selectCount = (s: MyArtState) => s.items.length;
export const selectItems = (s: MyArtState) => s.items;

/* =========================================
 * Store
 * =======================================*/

export const useMyArtStore = create<MyArtState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => set({ items: [item, ...get().items] }),

      addFromCamera: async (args) => {
        const newItem: MyArtItem = {
          id: crypto.randomUUID(),
          image: args.image,
          thumb: args.thumb,
          comment: args.comment,
          lat: args.lat ?? null,
          lng: args.lng ?? null,
          shotAt: new Date().toISOString(),
          recognizedWorkId: args.recognizedWorkId,
          museumName: args.museumName,
        };
        set({ items: [newItem, ...get().items] });
        return newItem;
      },

      clear: () => set({ items: [] }),

      remove: (id) => set({ items: get().items.filter((it) => it.id !== id) }),
    }),
    {
      name: "artlens:v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);