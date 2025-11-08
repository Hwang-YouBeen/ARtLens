import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type MyArtItem = {
  id: string;
  image: string;        // dataURL or https
  thumb: string;        // ≤300px dataURL
  comment: string;
  lat: number | null;
  lng: number | null;
  shotAt: string;       // ISO
  recognizedWorkId?: string; // "kkachi_tiger" 등
  museumName?: string;       // 역지오코딩 등으로 붙일 때 사용
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

// ...기존 import/타입 동일

type MyArtState = {
    items: MyArtItem[];
    addItem: (item: MyArtItem) => void;
    addFromCamera: (args: AddFromCameraArgs) => Promise<MyArtItem>;
    clear: () => void;
    /** ✅ 개별 기록 삭제 */
    remove: (id: string) => void;
  };
  
  export const selectCount = (s: MyArtState) => s.items.length;
  export const selectItems = (s: MyArtState) => s.items;
  
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
  
        /** ✅ 삭제 구현 */
        remove: (id) => set({ items: get().items.filter((it) => it.id !== id) }),
      }),
      {
        name: "artlens:v1",
        storage: createJSONStorage(() => localStorage),
      }
    )
  );