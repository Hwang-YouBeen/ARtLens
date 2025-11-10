// src/pages/CameraTab.tsx
import { useEffect, useRef, useState } from "react";
import { useMyArtStore } from "../store/myArtStore";
import { buildRefDescriptor, matchAndLocate, waitCv, type RefDesc } from "../lib/vision";

type Bubble = { id: string; text: string };
const MAX_BUBBLES = 7;
const PRESET_BUBBLES: Bubble[] = [
  { id: "b1", text: "숨 고른 호랑이의 밤" },
  { id: "b2", text: "여백이 나를 바라본다" },
  { id: "b3", text: "먹선 사이로 시간이 흐른다" },
  { id: "b4", text: "까치가 용기를 건넨다" },
  { id: "b5", text: "나는 오늘 맹수의 편" },
  { id: "b6", text: "고요가 크게 울린다" },
];

type Rect = { x: number; y: number; w: number; h: number };

export default function CameraTab() {
  // refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 카메라 상태 (iOS 대처)
  const [camState, setCamState] = useState<"idle" | "ready" | "needTap" | "error">("idle");
  const [camMsg, setCamMsg] = useState("");

  // state
  const [comment, setComment] = useState("");
  const [pendingComment, setPendingComment] = useState(""); // 전송된 코멘트 보관
  const [isSaving, setIsSaving] = useState(false);
  const addItem = useMyArtStore((s) => s.addItem);

  const [cvReady, setCvReady] = useState(false);
  const [refDesc, setRefDesc] = useState<RefDesc | null>(null);

  const [detected, setDetected] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>(PRESET_BUBBLES);

  // 입력 가능 여부 (엔터/버튼 공용)
  const canSend = comment.trim().length > 0;

  // 엔터 전송 핸들러 (상태 선언 뒤에 둬야 함)
  const onCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) sendComment();
    }
  };

  // 내 코멘트를 AR 말풍선에 즉시 추가
  const sendComment = () => {
    const t = comment.trim();
    if (!t) return;

    // 촬영 시 저장될 최종 코멘트로 보관
    setPendingComment(t);

    // AR 말풍선에도 즉시 반영
    setBubbles((prev) => [{ id: crypto.randomUUID(), text: t }, ...prev].slice(0, MAX_BUBBLES));
    setComment(""); // UX상 입력창은 비워도 pendingComment엔 남음
  };

  // ─────────────────────────────────────────────────────────────
  // 1) 카메라 시작 (오토플레이/권한/폴백 처리)
  // ─────────────────────────────────────────────────────────────
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
          } catch {
            // 다음 폴백
          }
        }
        if (!stream) throw new Error("getUserMedia failed");

        const v = videoRef.current!;
        v.srcObject = stream;
        v.setAttribute("playsinline", "true"); // iOS 필수
        v.muted = true;

        // 메타데이터(해상도) 로드까지 대기 → 0x0 방지
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
          // 사용자 제스처 필요
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

  // ─────────────────────────────────────────────────────────────
  // 2) OpenCV 로드 + 기준 디스크립터
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await waitCv();
      setCvReady(true);
      const ref = await buildRefDescriptor("/ref/hojakdo.jpeg");
      setRefDesc(ref);
    })();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 3) 인식 루프 (템플릿 매칭 → rect)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cvReady || !refDesc) return;
    let stop = false;

    const loop = async () => {
      if (stop) return;
      try {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (v && c) {
          // 비디오 준비 안됐으면 스킵
          if (v.readyState < 2 || !v.videoWidth || !v.videoHeight) {
            setTimeout(loop, 150);
            return;
          }
          // 원본 해상도로 처리
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(v, 0, 0, c.width, c.height);

          const res = await matchAndLocate(c, refDesc, 0.58);
          if (res.ok && res.rect) {
            setRect(res.rect);
            setDetected(true);
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
    return () => {
      stop = true;
    };
  }, [cvReady, refDesc]);

  // ─────────────────────────────────────────────────────────────
  // 4) 촬영 & 저장 (검은 썸네일 방지용 재그리기 + 저장 직전 재매칭)
  // ─────────────────────────────────────────────────────────────
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

    // 저장 직전 한 번 더 매칭해서 확정
    let recognized = false;
    try {
      if (cvReady && refDesc) {
        const finalRes = await matchAndLocate(c, refDesc, 0.58);
        recognized = !!(finalRes.ok && finalRes.rect);
      }
    } catch (e) {
      console.warn("final match error:", e);
    }

    const dataURL = c.toDataURL("image/jpeg", 0.9);

    // 썸네일
    const thumbCanvas = document.createElement("canvas");
    const max = 300;
    const scale = max / Math.max(c.width, c.height);
    thumbCanvas.width = Math.round(c.width * scale);
    thumbCanvas.height = Math.round(c.height * scale);
    const tctx = thumbCanvas.getContext("2d")!;
    tctx.drawImage(c, 0, 0, thumbCanvas.width, thumbCanvas.height);
    const thumbData = thumbCanvas.toDataURL("image/jpeg", 0.8);

    // 전송으로 확정한 게 있으면 그걸 우선 저장
    const commentToSave = (pendingComment || comment || "").trim();

    // 살짝 진동(지원 브라우저 한정)
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
          recognizedWorkId: recognized ? "kkachi_tiger" : undefined,
          museumName: recognized ? "호암미술관" : undefined,
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
      }
    );
  };

  // 앵커 포인트
  const bubbleAnchors = rect ? getBubbleAnchorsFromRect(rect) : [];
  const showAR = detected && !!rect && bubbleAnchors.length > 0;

  // ✅ 미검출 가이드 노출 조건
  const showHint = cvReady && camState === "ready" && !detected;

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white overflow-hidden">
      {/* 카메라 프리뷰 */}
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

      {/* 처리용 캔버스(숨김) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 디버그 배지 */}
      <div className="absolute top-3 left-3 z-[60] text-[11px] px-2 py-1 rounded bg-black/60">
        {camState === "idle" && "CAM: idle"}
        {camState === "ready" && "CAM: ready"}
        {camState === "needTap" && "CAM: tap to start"}
        {camState === "error" && `CAM: error (${camMsg})`}
        {" · "}
        {!cvReady ? "CV: loading…" : detected ? "Hojakdo: DETECTED" : "CV: ready"}
      </div>

      {/* 사용자 제스처 필요 버튼 */}
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

      {/* ✅ 미검출 가이드 오버레이 */}
      {showHint && (
        <div className="absolute inset-0 pointer-events-none grid place-items-center z-[35]">
          <div className="relative text-center">
            <div className="w-[68vw] max-w-[520px] aspect-[4/3] rounded-xl border-2 border-dashed border-white/55 animate-pulse" />
            <p className="mt-3 text-[13px] text-white/85">
              작품 전체가 화면에 들어오도록{" "}
              <span className="text-[#F2B950] font-semibold">카메라를 조절</span> 해주세요
            </p>
          </div>
        </div>
      )}

      {/* AR 오버레이 (rect) */}
      {showAR && rect && (
        <div className="pointer-events-none absolute inset-0">
          {/* 테두리 박스 */}
          <div
            className="absolute border-2 border-white/70 bg-white/5"
            style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
          />
          {/* 말풍선들 */}
          {bubbleAnchors.slice(0, bubbles.length).map((p, i) => (
            <div
              key={bubbles[i].id ?? i}
              className="absolute ar-bubble ar-bubble--gold ar-bubble-appear"
              style={{ left: p.x, top: p.y, transform: "translate(-50%,-110%)" }}
            >
              <span className="ar-bubble__text">{bubbles[i].text}</span>
            </div>
          ))}
        </div>
      )}

      {/* 하단 UI (탭바 위로 띄움) */}
      <div
        className="absolute left-0 right-0 bg-black/50 backdrop-blur p-3 flex items-center gap-3 z-[40]"
        style={{ bottom: "calc(70px + env(safe-area-inset-bottom, 0px) + 10px)" }}
      >
        {/* 입력창 + 내장 전송 아이콘 버튼 */}
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
            {/* 종이비행기 아이콘 (네이비 테마) */}
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="#0B1224"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>

        {/* 아이폰 스타일 셔터 */}
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

function getBubbleAnchorsFromRect(r: { x: number; y: number; w: number; h: number }) {
  const pad = Math.max(8, Math.min(r.w, r.h) * 0.06); // 사각형 바깥 여백
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;

  return [
    { x: cx, y: r.y - pad }, // top-center
    { x: r.x - pad, y: cy }, // left-center
    { x: r.x + r.w + pad, y: cy }, // right-center
    { x: cx, y: r.y + r.h + pad }, // bottom-center
    { x: r.x - pad, y: r.y - pad }, // top-left (outside)
    { x: r.x + r.w + pad, y: r.y - pad }, // top-right (outside)
    { x: r.x - pad, y: r.y + r.h + pad }, // bottom-left (outside)
  ];
}