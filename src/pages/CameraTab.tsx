// src/pages/CameraTab.tsx
import { useEffect, useRef, useState } from "react";
import { useMyArtStore } from "../store/myArtStore";
import { buildRefDescriptor, matchAndLocate, waitCv, type RefDesc } from "../lib/vision";

type Bubble = { id: string; text: string };
const PRESET_BUBBLES: Bubble[] = [
  { id: "b1", text: "호랑이 표정이 귀여워요" },
  { id: "b2", text: "까치가 위에서 잔소리하는 느낌 😂" },
  { id: "b3", text: "문양이 생각보다 세밀하다" },
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
  const [isSaving, setIsSaving] = useState(false);
  const addItem = useMyArtStore((s) => s.addItem);

  const [cvReady, setCvReady] = useState(false);
  const [refDesc, setRefDesc] = useState<RefDesc | null>(null);

  const [detected, setDetected] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>(PRESET_BUBBLES);

  // 내 코멘트를 AR 말풍선에 즉시 추가
  const sendComment = () => {
    const t = comment.trim();
    if (!t) return;
    setBubbles((prev) => [{ id: crypto.randomUUID(), text: t }, ...prev].slice(0, 6));
    setComment("");
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
      // 파일명/경로 정확히!
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
  // 4) 촬영 & 저장 (검은 썸네일 방지용 재그리기 포함)
  // ─────────────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;

    setIsSaving(true);

    if (v.readyState >= 2 && v.videoWidth && v.videoHeight) {
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(v, 0, 0, c.width, c.height);
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

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        addItem({
          id: crypto.randomUUID(),
          image: dataURL,
          thumb: thumbData,
          comment,
          lat: latitude,
          lng: longitude,
          shotAt: new Date().toISOString(),
          recognizedWorkId: detected ? "kkachi_tiger" : undefined,
          museumName: detected ? "호암미술관" : undefined,
        });
        alert("✅ 저장 완료! 지도 탭에서 확인해보세요.");
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

  // rect → 말풍선 앵커 3곳(상단 중앙, 좌중앙, 우중앙)
  const bubbleAnchors = rect ? getBubbleAnchorsFromRect(rect) : [];
  const showAR = detected && !!rect && bubbleAnchors.length > 0;

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

      {/* 사용자가 터치해서 play() 재시도 (iOS) */}
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
              key={i}
              className="absolute px-3 py-2 rounded-xl backdrop-blur bg-black/55 text-white text-xs shadow"
              style={{ left: p.x, top: p.y, transform: "translate(-50%,-100%)" }}
            >
              {bubbles[i].text}
            </div>
          ))}
        </div>
      )}

      {/* 하단 UI (탭바 위로 띄움) */}
      <div
        className="absolute left-0 right-0 bg-black/50 backdrop-blur p-3 flex gap-2 items-center z-[40]"
        style={{ bottom: "calc(70px + env(safe-area-inset-bottom, 0px) + 10px)" }}
      >
        <input
          type="text"
          placeholder="코멘트를 입력하세요..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="flex-1 rounded-lg px-3 py-2 text-black"
        />
        <button onClick={sendComment} className="px-3 h-10 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm">
          전송
        </button>
        <button
          onClick={handleCapture}
          disabled={isSaving}
          className={`w-14 h-14 rounded-full ${isSaving ? "bg-gray-400" : "bg-red-500"}`}
        >
          {isSaving ? "..." : "●"}
        </button>
      </div>
    </div>
  );
}

function getBubbleAnchorsFromRect(r: Rect) {
  const topCenter = { x: r.x + r.w / 2, y: Math.max(0, r.y - 12) };
  const leftCenter = { x: r.x, y: r.y + r.h / 2 };
  const rightCenter = { x: r.x + r.w, y: r.y + r.h / 2 };
  return [topCenter, leftCenter, rightCenter];
}