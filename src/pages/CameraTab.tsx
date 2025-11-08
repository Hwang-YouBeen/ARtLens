// src/pages/CameraTab.tsx
import { useEffect, useRef, useState } from "react";
import { useMyArtStore } from "../store/myArtStore";

const OTHER_PEOPLE_COMMENTS = [
  "호랑이 표정이 귀여워요",
  "먹선이 리듬감 있어요",
  "까치랑의 대비가 재밌네요",
  "행운의 상징 같아요",
];

export default function CameraTab() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 입력 중 코멘트
  const [comment, setComment] = useState("");
  // 전송되어 화면에 떠있는(아직 저장 전) 내 코멘트들
  const [myBubbles, setMyBubbles] = useState<string[]>([]);
  // 시연용: 호작도 인식 토글
  const [recognized, setRecognized] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const addItem = useMyArtStore((s) => s.addItem);

  // ✅ 1) 카메라 접근
  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        alert("카메라 접근 권한이 필요합니다 📸");
        console.error(err);
      }
    }
    initCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, []);

  // ✅ 2) “전송” → AR 말풍선(저장 전)으로 즉시 표시
  const sendComment = () => {
    if (!comment.trim()) return;
    setMyBubbles((prev) => [comment.trim(), ...prev]);
    // 저장은 촬영 버튼에서!
  };

  // ✅ 3) 촬영 → 캡처 + 위치 + 스토어 저장
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsSaving(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.8);

    // 썸네일 (최대 300px)
    const thumbCanvas = document.createElement("canvas");
    const scale = 300 / Math.max(canvas.width, canvas.height);
    thumbCanvas.width = Math.max(1, Math.round(canvas.width * scale));
    thumbCanvas.height = Math.max(1, Math.round(canvas.height * scale));
    const tctx = thumbCanvas.getContext("2d");
    tctx?.drawImage(video, 0, 0, thumbCanvas.width, thumbCanvas.height);
    const thumbData = thumbCanvas.toDataURL("image/jpeg", 0.7);

    // 위치 정보
    const save = (lat: number | null, lng: number | null) => {
      addItem({
        id: crypto.randomUUID(),
        image: imageData,
        thumb: thumbData,
        comment,                         // 입력창의 내용 1개를 저장
        lat,
        lng,
        shotAt: new Date().toISOString(),
        recognizedWorkId: recognized ? "kkachi_tiger" : undefined,
        museumName: recognized ? "호암미술관" : undefined, // 규칙: 호작도면 호암미술관
      });
      alert("✅ 저장 완료! 지도 탭에서 확인해보세요.");
      setIsSaving(false);
      setComment("");
      setMyBubbles([]);
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => save(pos.coords.latitude, pos.coords.longitude),
      () => save(null, null)
    );
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white overflow-hidden">
      {/* 카메라 프리뷰 */}
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

      {/* 촬영용 캔버스(숨김) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ===== AR 말풍선 (호작도 인식되었을 때만) ===== */}
      {recognized && (
        <div className="pointer-events-none absolute inset-0">
          {/* 좌/우/상단 고정 포지션 몇 군데 */}
          <Bubble style={{ top: "15%", left: "8%" }} text={OTHER_PEOPLE_COMMENTS[0]} />
          <Bubble style={{ top: "20%", right: "10%" }} text={OTHER_PEOPLE_COMMENTS[1]} />
          <Bubble style={{ bottom: "22%", left: "12%" }} text={OTHER_PEOPLE_COMMENTS[2]} />
          <Bubble style={{ bottom: "18%", right: "14%" }} text={OTHER_PEOPLE_COMMENTS[3]} />
          {myBubbles.map((b, i) => (
            <Bubble key={i} style={{ top: `${30 + i * 8}%`, left: "50%" }} text={b} center />
          ))}
        </div>
      )}

      {/* 하단 UI */}
      <div
        className="absolute left-0 right-0 bg-black/50 backdrop-blur p-4 flex gap-2 items-center z-[40]"
        style={{ bottom: "var(--bottom-safe)", }}
      >
        {/* 시연 토글(나중에 MindAR로 대체) */}
        <button
          onClick={() => setRecognized((v) => !v)}
          className={`px-3 py-2 rounded-lg text-xs mr-2 ${
            recognized ? "bg-emerald-600" : "bg-gray-600"
          }`}
          title="시연용: 호작도 인식 토글"
        >
          {recognized ? "호작도 인식됨" : "인식 대기"}
        </button>

        <input
          type="text"
          placeholder="코멘트를 입력하세요…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="flex-1 rounded-lg px-3 py-2 text-white"
        />
        {/* 전송 → AR 말풍선으로 즉시 보이기(저장 아님) */}
        <button
          onClick={sendComment}
          className="px-3 py-2 rounded-lg bg-blue-500 disabled:bg-blue-300"
          disabled={!comment.trim()}
          title="전송(AR 표시)"
        >
          ⤴︎
        </button>

        {/* 촬영/저장 */}
        <button
          onClick={handleCapture}
          disabled={isSaving}
          className={`w-14 h-14 rounded-full ${isSaving ? "bg-gray-400" : "bg-red-500"}`}
          title="촬영 및 저장"
        >
          {isSaving ? "…" : "●"}
        </button>
      </div>
    </div>
  );
}

function Bubble({
  text,
  style,
  center,
}: {
  text: string;
  style?: React.CSSProperties;
  center?: boolean;
}) {
  return (
    <div
      className={`absolute max-w-[70vw] px-3 py-2 rounded-xl backdrop-blur bg-white/70 text-black text-xs shadow ${
        center ? "-translate-x-1/2" : ""
      }`}
      style={style}
    >
      {text}
    </div>
  );
}