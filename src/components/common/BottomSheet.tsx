// src/components/common/BottomSheet.tsx
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  header?: React.ReactNode;
  children: React.ReactNode;
  /** 0~1 사이 비율. 예: [0.12, 0.5, 0.9] */
  snapPoints?: number[];
  /** 시작 스냅 인덱스 */
  initialSnap?: number;
  /** 하단 고정 UI 높이(px) 만큼 여유(지도/탭바 겹침 방지) */
  heightOffset?: number;
  /** 스냅 변경 콜백(선택) */
  onSnapChange?: (idx: number) => void;
};

export default function BottomSheet({
  header,
  children,
  snapPoints = [0.12, 0.5, 0.9],
  initialSnap = 0,
  heightOffset = 70,
  onSnapChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startTop = useRef(0);
  const [snapIdx, setSnapIdx] = useState(initialSnap);
  const [topPx, setTopPx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 화면 높이(탭바 여백 포함)
  const fullH = useMemo(() => {
    const safe = Number(getComputedStyle(document.documentElement).getPropertyValue("--sat"))
      || 0;
    return window.innerHeight - (heightOffset + safe);
  }, [heightOffset]);

  // 현재 스냅의 top 계산
  const snapToTop = (idx: number) => {
    const frac = 1 - snapPoints[idx]; // 아래 기준 top 비율
    const t = Math.round(frac * fullH);
    setTopPx(t);
    setSnapIdx(idx);
    onSnapChange?.(idx);
  };

  useEffect(() => {
    // iOS safe-area 값을 CSS var 로 노출 (grab 영역 계산용)
    const safe = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)") || "0",
      10
    );
    document.documentElement.style.setProperty("--sat", String(safe || 0));
  }, []);

  useEffect(() => {
    snapToTop(initialSnap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullH]);

  // 드래그 시작
  const onStart = (clientY: number) => {
    setIsDragging(true);
    startY.current = clientY;
    startTop.current = topPx ?? 0;
  };

  // 드래그 중
  const onMove = (clientY: number) => {
    if (!isDragging) return;
    const delta = clientY - startY.current;
    const next = Math.min(Math.max(startTop.current + delta, 0), fullH); // 0 ~ fullH
    setTopPx(next);
  };

  // 드래그 끝 -> 가장 가까운 스냅으로
  const onEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (topPx == null) return;

    // 각 스냅의 top(px) 계산
    const tops = snapPoints.map((p) => Math.round((1 - p) * fullH));
    const closest = tops.reduce(
      (best, t, i) => {
        const d = Math.abs(t - topPx);
        return d < best.dist ? { i, dist: d } : best;
      },
      { i: 0, dist: Infinity }
    ).i;
    snapToTop(closest);
  };

  useEffect(() => {
    const down = (e: TouchEvent | MouseEvent) => {
      const target = e.target as HTMLElement;
      // 핸들이나 헤더 부분만 드래그 허용
      if (!dragRef.current || !dragRef.current.contains(target)) return;

      if (e instanceof TouchEvent) onStart(e.touches[0].clientY);
      else onStart((e as MouseEvent).clientY);
    };
    const move = (e: TouchEvent | MouseEvent) => {
      if (!isDragging) return;
      if (e instanceof TouchEvent) onMove(e.touches[0].clientY);
      else onMove((e as MouseEvent).clientY);
    };
    const up = () => onEnd();

    const opts: AddEventListenerOptions = { passive: false };
    window.addEventListener("touchstart", down, opts);
    window.addEventListener("touchmove", move, opts);
    window.addEventListener("touchend", up, opts);
    window.addEventListener("mousedown", down, false);
    window.addEventListener("mousemove", move, false);
    window.addEventListener("mouseup", up, false);

    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [isDragging, topPx, fullH, snapPoints]);

  // 헤더 탭하면 다음 스냅으로 토글(편의기능)
  const jumpNext = () => {
    const next = (snapIdx + 1) % snapPoints.length;
    snapToTop(next);
  };

  return (
    <div
      ref={rootRef}
      className="fixed left-0 right-0 z-[40] pointer-events-auto"
      style={{
        top: topPx ?? 0,
        height: fullH + heightOffset, // 밑으로 조금 더 내려가도록
        willChange: "top",
        transition: isDragging ? "none" : "top 220ms cubic-bezier(.2,.8,.2,1)",
      }}
    >
      <div className="mx-auto max-w-[1000px] h-full px-3">
        <div className="rounded-t-2xl bg-neutral-900/85 backdrop-blur border border-white/10 shadow-xl overflow-hidden">
          {/* Grab Header */}
          <div
            ref={dragRef}
            onClick={jumpNext}
            className="relative select-none touch-none px-4 pt-3 pb-2 cursor-grab active:cursor-grabbing"
          >
            <div className="mx-auto h-2 w-14 rounded-full bg-white/30" />
            <div className="mt-2 text-white">
              {header ?? <div className="text-sm opacity-70">나의 예술 기록 · 모아보기</div>}
            </div>
          </div>

          {/* Content */}
          <div
            className="px-4 pb-[calc(70px+env(safe-area-inset-bottom,0px))] overflow-y-auto"
            style={{ maxHeight: `calc(100vh - ${topPx ?? 0}px)` }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}