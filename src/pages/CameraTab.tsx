// CameraTab.tsx 최최종
// - 카메라 프리뷰 시작/유지
// - OpenCV 템플릿 매칭으로 작품 인식(rect)
// - 인식 영역 기준 말풍선(버블) AR 오버레이 배치
// - 캡처 + 썸네일 생성 + 위치/메타 저장

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useMyArtStore } from "../store/myArtStore";
import { buildRefDescriptor, matchAndLocate, waitCv, type RefDesc } from "../lib/vision";

/* =========================================================================
 * Config: Overlay / Bubble
 * ========================================================================= */
const OVERLAY_SAFE_PAD = 6;        // 오버레이 전체 안전 여백(px)
const RIGHT_EDGE_PAD   = 3;        // 오른쪽 화면 가장자리에서 띄울 여백(px) — 0이면 완전 밀착
const BUBBLE_MARGIN    = 30;       // 말풍선 간 최소 간격(px)   (향후 충돌 회피 로직에서 활용)
const BUBBLE_MAX_WIDTH = 220;      // 말풍선 최대 너비(px)
const BUBBLE_Y_OFFSET  = 10;       // 앵커 기준 위로 올릴 오프셋(px)

type Bubble = { id: string; text: string; isUser?: boolean };

const MAX_BUBBLES = 7;
const PRESET_BUBBLES: Bubble[] = [
  { id: "b1", text: "Got lost—\nfound luck here" },
  { id: "b2", text: "케데헌의 모티브!" },
  { id: "b3", text: "우리 엄마가 좋아했던\n그 민화 느낌:)" },
  { id: "b4", text: "호랑이 표정:\n'간식 있냐?'" },
  { id: "b5", text: "레퍼런스 저장\n감정도 저장" },
  { id: "b6", text: "전공 병 발동:\n프레이밍부터 본다" },
];

type Rect = { x: number; y: number; w: number; h: number };

/* =========================================================================
 * Recognition metadata
 * ========================================================================= */
const HOJAKDO_ID = "kkachi_tiger";
const HOAM_LABEL = "호암미술관";
const RECENT_DETECT_WINDOW_MS = 3000; // 최근 인식 허용 윈도우(ms)

/* =========================================================================
 * Component
 * ========================================================================= */
export default function CameraTab() {
  // ---- Refs ----
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastDetectedAtRef = useRef<number>(0);

  // ---- State: Camera / CV ----
  const [camState, setCamState] = useState<"idle" | "ready" | "needTap" | "error">("idle");
  const [camMsg, setCamMsg] = useState("");
  const [cvReady, setCvReady] = useState(false);
  const [refDesc, setRefDesc] = useState<RefDesc | null>(null);

  // ---- State: Detection / Overlay ----
  const [detected, setDetected] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>(PRESET_BUBBLES);

  // ---- State: Comment / Save ----
  const [comment, setComment] = useState("");
  const [pendingComment, setPendingComment] = useState(""); // 전송 직후 저장까지 보관
  const [isSaving, setIsSaving] = useState(false);
  const addItem = useMyArtStore((s) => s.addItem);

  const canSend = comment.trim().length > 0;

  // -----------------------------------------------------------------------
  // Camera: initialize stream (iOS playsinline 포함)
  // -----------------------------------------------------------------------
  useEffect(() => {
    let stopped = false;

    const start = async () => {
      try {
        const tries: MediaStreamConstraints[] = [
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          { video: { facingMode: "environment" }, audio: false },
          { video: true, audio: false },
        ];

        let stream: MediaStream | null = null;
        for (const c of tries) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(c);
            break;
          } catch {/* 폴백 계속 시도 */}
        }
        if (!stream) throw new Error("getUserMedia failed");

        const v = videoRef.current!;
        v.srcObject = stream;
        v.setAttribute("playsinline", "true");
        v.muted = true;

        // 메타데이터 로드(해상도 확보) 대기
        await new Promise<void>((resolve) => {
          if (v.readyState >= 1 && v.videoWidth && v.videoHeight) return resolve();
          const onMeta = () => {
            if (v.videoWidth && v.videoHeight) {
              v.removeEventListener("loadedmetadata", onMeta);
              resolve();
            }
          };
          v.addEventListener("loadedmetadata", onMeta);
        });

        try {
          await v.play();
          if (!stopped) setCamState("ready");
        } catch {
          if (!stopped) {
            setCamState("needTap");
            setCamMsg("화면을 탭해 카메라를 시작하세요");
          }
        }
      } catch (e: any) {
        console.error("initCamera error:", e);
        setCamState("error");
        setCamMsg(e?.name || String(e));
      }
    };

    start();

    return () => {
      stopped = true;
      const v = videoRef.current;
      if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    };
  }, []);

  // -----------------------------------------------------------------------
  // OpenCV: load and build reference descriptor
  // -----------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      await waitCv();
      setCvReady(true);
      const ref = await buildRefDescriptor("/ref/hojakdo.jpeg");
      setRefDesc(ref);
    })();
  }, []);

  // -----------------------------------------------------------------------
  // Detection loop: template match → rect
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!cvReady || !refDesc) return;
    let stop = false;

    const loop = async () => {
      if (stop) return;
      try {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (v && c) {
          if (v.readyState < 2 || !v.videoWidth || !v.videoHeight) {
            setTimeout(loop, 150);
            return;
          }
          // 최신 프레임을 원본 해상도로 캔버스에 반영
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(v, 0, 0, c.width, c.height);

          const res = await matchAndLocate(c, refDesc, 0.58);
          if (res.ok && res.rect) {
            setRect(res.rect);
            setDetected(true);
            lastDetectedAtRef.current = performance.now();
          } else {
            setDetected(false);
            setRect(null);
          }
        }
      } catch (e) {
        console.warn("vision error:", e);
      } finally {
        setTimeout(loop, 350);
      }
    };

    loop();
    return () => { stop = true; };
  }, [cvReady, refDesc]);

  // -----------------------------------------------------------------------
  // Send comment: prepend as user bubble (slot 0)
  // -----------------------------------------------------------------------
  const sendComment = () => {
    const t = comment.trim();
    if (!t) return;
    setPendingComment(t);
    setBubbles((prev) => [{ id: crypto.randomUUID(), text: t, isUser: true }, ...prev].slice(0, MAX_BUBBLES));
    setComment("");
  };

  const onCommentKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) sendComment();
    }
  };

  // -----------------------------------------------------------------------
  // Capture & save: re-draw → re-match → save with location
  // -----------------------------------------------------------------------
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;

    setIsSaving(true);

    // 최신 프레임으로 캔버스 갱신
    if (v.readyState >= 2 && v.videoWidth && v.videoHeight) {
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(v, 0, 0, c.width, c.height);
    }

    // 저장 직전 재매칭(신뢰도 보강)
    let matchedNow = false;
    try {
      if (cvReady && refDesc) {
        const finalRes = await matchAndLocate(c, refDesc, 0.58);
        matchedNow = !!(finalRes.ok && finalRes.rect);
      }
    } catch (e) {
      console.warn("final match error:", e);
    }

    // 최근 인식 인정
    const recentlyDetected = performance.now() - lastDetectedAtRef.current < RECENT_DETECT_WINDOW_MS;
    const recognizedNow = matchedNow || recentlyDetected;

    // 원본 이미지/썸네일
    const dataURL = c.toDataURL("image/jpeg", 0.9);
    const thumbCanvas = document.createElement("canvas");
    const max = 300;
    const scale = max / Math.max(c.width, c.height);
    thumbCanvas.width = Math.round(c.width * scale);
    thumbCanvas.height = Math.round(c.height * scale);
    const tctx = thumbCanvas.getContext("2d")!;
    tctx.drawImage(c, 0, 0, thumbCanvas.width, thumbCanvas.height);
    const thumbData = thumbCanvas.toDataURL("image/jpeg", 0.8);

    const commentToSave = (pendingComment || comment || "").trim();

    if (navigator.vibrate) navigator.vibrate(20);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        addItem({
          id: crypto.randomUUID(),
          image: dataURL,
          thumb: thumbData,
          comment: commentToSave,
          lat: latitude,
          lng: longitude,
          shotAt: new Date().toISOString(),
          recognizedWorkId: recognizedNow ? HOJAKDO_ID : undefined,
          museumName: recognizedNow ? HOAM_LABEL : undefined,
        });

        console.log("[SAVE] recognizedNow=", recognizedNow, {
          matchedNow,
          recentlyDetected,
          msSinceLastDetect: performance.now() - lastDetectedAtRef.current,
        });

        alert("✅ 저장 완료! 지도 탭에서 확인해보세요.");
        setPendingComment("");
        setComment("");
        setIsSaving(false);
      },
      (err) => {
        console.error(err);
        alert("위치 정보를 불러올 수 없습니다.");
        setIsSaving(false);
      },
      { enableHighAccuracy: true, timeout: 4000 }
    );
  };

  // ---- Derived flags ----
  const bubbleAnchors = rect ? getBubbleAnchorsFromRect(rect) : [];
  const showAR = detected && !!rect && bubbleAnchors.length > 0;
  const showHint = cvReady && camState === "ready" && !detected;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="relative w-full h-[100dvh] bg-black text-white overflow-hidden">
      {/* Camera Preview */}
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

      {/* Hidden process canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Debug badge */}
      <div className="absolute top-3 left-3 z-[60] text-[11px] px-2 py-1 rounded bg-black/60">
        {camState === "idle" && "CAM: idle"}
        {camState === "ready" && "CAM: ready"}
        {camState === "needTap" && "CAM: tap to start"}
        {camState === "error" && `CAM: error (${camMsg})`}
        {" · "}
        {!cvReady ? "CV: loading…" : detected ? "Hojakdo: DETECTED" : "CV: ready"}
      </div>

      {/* Play gesture (iOS) */}
      {camState === "needTap" && (
        <button
          onClick={async () => {
            try {
              await videoRef.current?.play();
              setCamState("ready");
            } catch {
              setCamState("error");
              setCamMsg("카메라 시작 실패");
            }
          }}
          className="absolute left-1/2 -translate-x-1/2 bottom-[calc(120px+env(safe-area-inset-bottom))] px-4 py-2 rounded-xl bg-white/90 text-black text-sm z-[45]"
        >
          카메라 켜기
        </button>
      )}

      {/* Detection hint */}
      {showHint && (
        <div className="absolute inset-0 pointer-events-none grid place-items-center z-[35]">
          <div className="relative text-center">
            <div className="w-[68vw] max-w-[520px] aspect-square rounded-full border-2 border-dashed border-white/70 animate-pulse" />
            <p className="mt-3 text-[13px] text-white/85">
              작품 전체가 화면에 들어오도록{" "}
              <span className="text-[#F2B950] font-semibold">카메라를 조절</span> 해주세요
            </p>
          </div>
        </div>
      )}

      {/* AR Overlay */}
      {showAR && rect && (
        <div ref={overlayRef} className="pointer-events-none absolute inset-0">
          {computeWallPlacements(rect, bubbles.slice(0, MAX_BUBBLES), overlayRef.current, measureCanvasRef).map(
            (pl) => (
              <div
                key={pl.id}
                className="absolute ar-bubble ar-bubble--gold ar-bubble-appear"
                style={{ left: pl.left, top: pl.top, transform: "none" }}
              >
                <span className="ar-bubble__text whitespace-pre-line leading-tight break-words">
                  {pl.text}
                </span>
              </div>
            )
          )}
        </div>
      )}

      {/* Bottom UI */}
      <div
        className="absolute left-0 right-0 bg-black/50 backdrop-blur p-3 flex items-center gap-3 z-[40]"
        style={{ bottom: "calc(70px + env(safe-area-inset-bottom, 0px) + 10px)" }}
      >
        {/* Comment input + send */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="나의 감상 남기기..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={onCommentKeyDown}
            className="w-full rounded-2xl px-4 py-3 pr-12 text-black shadow-sm bg-white/95 focus:outline-none"
          />
          <button
            type="button"
            aria-label="전송"
            disabled={!canSend}
            onClick={sendComment}
            className={[
              "absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full",
              "grid place-items-center transition",
              "ring-1 ring-[#F2B950]/60 bg-black/30",
              "hover:bg-[#F2B950]/15 active:translate-x-0.5 active:-translate-y-0.5",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0B1224" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>

        {/* iOS-like shutter */}
        <button
          onClick={handleCapture}
          disabled={isSaving}
          aria-label="셔터"
          className={[
            "group relative w-20 h-20 rounded-full border-4 border-white bg-transparent",
            "grid place-items-center select-none transition active:scale-95",
            isSaving ? "opacity-60" : "",
          ].join(" ")}
        >
          <span className="w-14 h-14 rounded-full bg-white transition-transform duration-150 group-active:scale-90" />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
 * Geometry helpers
 * ========================================================================= */
function getBubbleAnchorsFromRect(r: { x: number; y: number; w: number; h: number }) {
  const pad = Math.max(8, Math.min(r.w, r.h) * 0.06);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return [
    { x: cx, y: r.y - pad },               // top-center
    { x: r.x - pad, y: cy },               // left-center
    { x: r.x + r.w + pad, y: cy },         // right-center
    { x: cx, y: r.y + r.h + pad },         // bottom-center
    { x: r.x - pad, y: r.y - pad },        // top-left (outside)
    { x: r.x + r.w + pad, y: r.y - pad },  // top-right (outside)
    { x: r.x - pad, y: r.y + r.h + pad },  // bottom-left (outside)
  ];
}

type BubblePlacement = { id: string; text: string; left: number; top: number; w: number; h: number };

/**
 * 말풍선 실제 박스 크기(가로/세로) 측정
 * - 텍스트 줄바꿈 고려(최대 3줄까지 반영)
 */
function measureBubble(
  text: string,
  measureCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
) {
  const maxW = BUBBLE_MAX_WIDTH, minW = 88, lineH = 18, vPad = 12, hPad = 16;

  let cvs = measureCanvasRef.current;
  if (!cvs) {
    cvs = document.createElement("canvas");
    measureCanvasRef.current = cvs;
  }
  const ctx = cvs.getContext("2d")!;
  ctx.font = '13px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif';

  const lines = text.split("\n");
  const contentMax = Math.max(1, maxW - hPad * 2);

  // 가장 긴 라인의 폭
  const longest = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));

  // 가로폭: 좌/우 패딩 포함
  const w = Math.min(maxW, Math.max(minW, Math.min(longest, contentMax) + hPad * 2));

  // 줄바꿈 + 래핑 라인 수 추정
  const wrapLines = lines.reduce((acc, l) => {
    const wLine = ctx.measureText(l).width;
    return acc + Math.max(1, Math.ceil(wLine / contentMax));
  }, 0);

  // 세로높이: 상/하 패딩 + 라인 수(최대 3줄)
  const h = vPad * 2 + lineH * Math.max(1, Math.min(3, wrapLines));

  return { w, h };
}

/* -------------------------------------------------------------------------
 * (옵션) Edge 배치 알고리즘
 * - 현재 화면 가장자리 6 슬롯을 쓰는 대안 레이아웃 (사용하지 않지만 보관)
 * ------------------------------------------------------------------------- */
function computeEdgePlacements(
  bubbles: { id: string; text: string; isUser?: boolean }[],
  overlayEl: HTMLDivElement | null,
  measureCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  pad = 12
): BubblePlacement[] {
  if (!overlayEl) return [];
  const vw = overlayEl.clientWidth;
  const vh = overlayEl.clientHeight;

  const LEFT_PAD = pad;
  const RIGHT_PAD = Math.max(0, pad - 10);
  const RIGHT_X_SHIFT = 50;
  const DOWN_SHIFT = 16;
  const USER_Y_SHIFT = 8;

  const topCenter = (w: number, h: number) => ({
    left: Math.round((vw - w) / 2),
    top: pad + USER_Y_SHIFT,
  });

  const ringSlots = [
    (w: number, h: number) => ({ left: vw - RIGHT_PAD - w + RIGHT_X_SHIFT, top: Math.round((vh - h) / 2) + DOWN_SHIFT }),
    (w: number, h: number) => ({ left: Math.round((vw - w) / 2),            top: vh - pad - h }),
    (w: number, h: number) => ({ left: LEFT_PAD,                             top: Math.round((vh - h) / 2) + DOWN_SHIFT }),
    (w: number, h: number) => ({ left: vw - RIGHT_PAD - w + RIGHT_X_SHIFT,   top: pad + DOWN_SHIFT }),
    (w: number, h: number) => ({ left: LEFT_PAD,                             top: pad + DOWN_SHIFT }),
    (w: number, h: number) => ({ left: vw - RIGHT_PAD - w + RIGHT_X_SHIFT,   top: vh - pad - h }),
  ];

  const out: BubblePlacement[] = [];

  if (bubbles.length && bubbles[0].isUser) {
    const b0 = bubbles[0];
    const s0 = measureBubble(b0.text, measureCanvasRef);
    const p0 = topCenter(s0.w, s0.h);
    out.push({ id: b0.id, text: b0.text, left: p0.left, top: p0.top, w: s0.w, h: s0.h });
  }

  const start = bubbles.length && bubbles[0].isUser ? 1 : 0;
  const rest = bubbles.slice(start, start + 6);
  for (let i = 0; i < rest.length && i < ringSlots.length; i++) {
    const b = rest[i];
    const s = measureBubble(b.text, measureCanvasRef);
    const p = ringSlots[i](s.w, s.h);
    out.push({ id: b.id, text: b.text, left: p.left, top: p.top, w: s.w, h: s.h });
  }

  return out;
}

/* -------------------------------------------------------------------------
 * Anchor-based greedy placement (작품 주변 배치)
 * ------------------------------------------------------------------------- */
function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function computeBubblePlacements(
  rect: { x: number; y: number; w: number; h: number },
  bubbles: { id: string; text: string }[],
  overlayEl: HTMLDivElement | null,
  measureCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
): BubblePlacement[] {
  if (!overlayEl) return [];
  const vw = overlayEl.clientWidth, vh = overlayEl.clientHeight;
  const margin = 4, tailGap = 8;

  const bases = getBubbleAnchorsFromRect(rect);
  const order = [0, 3, 2, 1, 5, 4, 6];
  const offsets = [{ dx: 0, dy: 0 }, { dx: -24, dy: -8 }, { dx: 24, dy: -8 }, { dx: -48, dy: -12 }, { dx: 48, dy: -12 }, { dx: 0, dy: -24 }];
  const placed: BubblePlacement[] = [];

  for (const b of bubbles) {
    const size = measureBubble(b.text, measureCanvasRef);
    let placedOne: BubblePlacement | null = null;

    outer: for (const idx of order) {
      const base = bases[idx];
      for (const o of offsets) {
        const x = base.x + o.dx;
        const y = base.y + o.dy;
        const left = Math.round(x - size.w / 2);
        const top  = Math.round(y - size.h - tailGap);
        const box = { x: left, y: top, w: size.w, h: size.h };

        if (box.x < margin || box.y < margin || box.x + box.w > vw - margin || box.y + box.h > vh - margin) continue;
        if (placed.some(p => rectsOverlap(box, { x: p.left, y: p.top, w: p.w, h: p.h }))) continue;

        placedOne = { id: b.id, text: b.text, left, top, w: size.w, h: size.h };
        break outer;
      }
    }

    if (!placedOne) {
      const base = bases[0];
      placedOne = {
        id: b.id, text: b.text,
        left: Math.round(base.x - size.w / 2),
        top:  Math.round(base.y - size.h - tailGap - placed.length * (size.h + 6)),
        w: size.w, h: size.h
      };
    }
    placed.push(placedOne);
  }
  return placed;
}

/* -------------------------------------------------------------------------
 * Final wall layout: 좌 3 / 우 3 / 상단 사용자 1 (safe-area 고려)
 * - 오른쪽 3개는 SCREEN RIGHT 에 거의 붙게 계산
 * ------------------------------------------------------------------------- */
const LEFT_COL_X_SHIFT  = 10; // 왼쪽 열: 화면 안쪽(+)으로
const RIGHT_COL_X_SHIFT = 6;  // 오른쪽 열: rightLimit + 이 값(일반적으로 0~음수로 미세 조정)
const GLOBAL_Y_SHIFT    = 50; // 전체 Y 하향 이동(+)
const USER_TOP_Y_SHIFT  = 8;  // 사용자 버블만 추가 Y 하향
const BOTTOM_RESERVE    = 170; // 하단 UI 회피 여유

let __safeInsets: { top: number; right: number; bottom: number; left: number } | null = null;

function getSafeAreaInsets() {
  if (__safeInsets) return __safeInsets;
  const probe = document.createElement("div");
  probe.style.cssText = `
    position: fixed; inset: 0;
    padding-top: env(safe-area-inset-top);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    visibility: hidden; pointer-events: none;
  `;
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const n = (v: string) => parseFloat(v || "0") || 0;
  __safeInsets = {
    top: n(cs.paddingTop),
    right: n(cs.paddingRight),
    bottom: n(cs.paddingBottom),
    left: n(cs.paddingLeft),
  };
  document.body.removeChild(probe);
  return __safeInsets!;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

function computeWallPlacements(
  _rect: { x: number; y: number; w: number; h: number } | null,
  bubblesAll: { id: string; text: string; isUser?: boolean }[],
  overlayEl: HTMLDivElement | null,
  measureCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
): BubblePlacement[] {
  if (!overlayEl) return [];
  const vw = overlayEl.clientWidth;
  const vh = overlayEl.clientHeight;
  const insets = getSafeAreaInsets();
  const pad = OVERLAY_SAFE_PAD;

  // 세로 경계 (하단 UI 여유 포함)
  const topBound = pad + insets.top;
  const bottomBound = Math.max(topBound, vh - pad - insets.bottom - BOTTOM_RESERVE);
  const usableH = bottomBound - topBound;

  // 세로 3슬롯 (상/중/하)
  const slotFracs = [1 / 8, 4 / 8, 7 / 8];
  const slotCenters = slotFracs.map((f) => topBound + usableH * f);

  const out: BubblePlacement[] = [];

  // 0) 사용자 버블(상단 중앙)
  let startIdx = 0;
  if (bubblesAll.length && bubblesAll[0].isUser) {
    const b0 = bubblesAll[0];
    const s0 = measureBubble(b0.text, measureCanvasRef);
    const left0 = clamp(Math.round((vw - s0.w) / 2), pad + insets.left, vw - pad - insets.right - s0.w);
    const top0  = clamp(topBound + USER_TOP_Y_SHIFT + GLOBAL_Y_SHIFT, topBound, bottomBound - s0.h);
    out.push({ id: b0.id, text: b0.text, left: left0, top: top0, w: s0.w, h: s0.h });
    startIdx = 1;
  }

  // 좌 3 / 우 3
  const rest = bubblesAll.slice(startIdx, startIdx + 6);
  const leftCol  = rest.slice(0, 3);
  const rightCol = rest.slice(3, 6);

  // 1) 왼쪽 열
  leftCol.forEach((b, i) => {
    const s  = measureBubble(b.text, measureCanvasRef);
    const cy = slotCenters[i] ?? slotCenters[slotCenters.length - 1];

    let top = Math.round(cy - s.h / 2) + GLOBAL_Y_SHIFT;
    top = clamp(top, topBound, bottomBound - s.h);

    let left = pad + insets.left + LEFT_COL_X_SHIFT;
    left = clamp(left, pad + insets.left, vw - pad - insets.right - s.w);

    out.push({ id: b.id, text: b.text, left, top, w: s.w, h: s.h });
  });

  // 2) 오른쪽 열: 화면 오른쪽 벽에 거의 붙여 배치
  rightCol.forEach((b, i) => {
    const s  = measureBubble(b.text, measureCanvasRef);
    const cy = slotCenters[i] ?? slotCenters[slotCenters.length - 1];

    let top = Math.round(cy - s.h / 2) + GLOBAL_Y_SHIFT;
    top = clamp(top, topBound, bottomBound - s.h);

    // 우측 한계치 = 화면 - 안전여백 - RIGHT_EDGE_PAD - 말풍선너비
    const rightLimit = vw - insets.right - RIGHT_EDGE_PAD - s.w;

    // 기본은 한계치에 붙이고, RIGHT_COL_X_SHIFT로 (주로 음수) 미세 조정
    let left = rightLimit + RIGHT_COL_X_SHIFT;
    left = Math.max(left, pad + insets.left); // 좌측 초과 방지

    out.push({ id: b.id, text: b.text, left, top, w: s.w, h: s.h });
  });

  return out;
}