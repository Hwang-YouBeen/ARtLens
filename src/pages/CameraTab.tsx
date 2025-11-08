// import { useEffect, useRef, useState } from "react";
// import { useMyArtStore } from "../store/myArtStore";
// import { MVP_HOJAKDO } from "../lib/artworks";

// export default function CameraTab() {
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [comment, setComment] = useState("");
//   const add = useMyArtStore((s) => s.add);

//   // 카메라 프리뷰 시작
//   useEffect(() => {
//     let stream: MediaStream;
//     (async () => {
//       try {
//         stream = await navigator.mediaDevices.getUserMedia({
//           video: { facingMode: "environment" }, audio: false,
//         });
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//           await videoRef.current.play();
//         }
//       } catch (e) {
//         console.error("camera error", e);
//         alert("카메라 권한을 허용해주세요.");
//       }
//     })();
//     return () => { stream?.getTracks().forEach(t => t.stop()); };
//   }, []);

//   // 300px 썸네일 생성
//   function makeThumb(dataUrl: string): Promise<string> {
//     return new Promise((resolve) => {
//       const img = new Image();
//       img.onload = () => {
//         const max = 300;
//         const scale = Math.min(1, max / Math.max(img.width, img.height));
//         const w = Math.round(img.width * scale);
//         const h = Math.round(img.height * scale);
//         const c = document.createElement("canvas");
//         c.width = w; c.height = h;
//         const ctx = c.getContext("2d")!;
//         ctx.drawImage(img, 0, 0, w, h);
//         resolve(c.toDataURL("image/jpeg", 0.85));
//       };
//       img.src = dataUrl;
//     });
//   }

//   async function shoot() {
//     const v = videoRef.current!;
//     const c = canvasRef.current!;
//     const w = v.videoWidth, h = v.videoHeight;
//     if (!w || !h) return;

//     c.width = w; c.height = h;
//     const ctx = c.getContext("2d")!;
//     ctx.drawImage(v, 0, 0, w, h);
//     const photoUrl = c.toDataURL("image/jpeg", 0.9);
//     const thumbUrl = await makeThumb(photoUrl);

//     // ✅ MVP: ‘호작도’ 자동 태깅 (데모용)
//     const item = {
//       id: crypto.randomUUID(),
//       artworkId: MVP_HOJAKDO.id,
//       artworkTitle: MVP_HOJAKDO.title,
//       placeName: MVP_HOJAKDO.museum, // 기본 장소: 국립중앙박물관
//       comment: comment.trim(),
//       takenAt: new Date().toISOString(),
//       photoUrl,
//       thumbUrl,
//     };
//     add(item);
//     setComment("");
//     alert("촬영 기록을 저장했어요! (바텀시트 최신순으로 표시)");
//   }

//   return (
//     <div className="w-full h-full relative bg-black">
//       <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
//       {/* 하단 입력 바 */}
//       <div className="absolute left-0 right-0 bottom-[80px] p-3 flex gap-2">
//         <input
//           value={comment}
//           onChange={(e) => setComment(e.target.value)}
//           placeholder="코멘트를 입력하세요"
//           className="flex-1 rounded-lg bg-white/90 px-3 py-2 text-black"
//           maxLength={140}
//         />
//         <button
//           onClick={shoot}
//           className="rounded-full px-4 py-2 bg-blue-500 text-white font-semibold"
//           title="촬영하고 저장"
//         >
//           촬영
//         </button>
//       </div>
//       {/* 캔버스는 숨김(촬영용) */}
//       <canvas ref={canvasRef} className="hidden" />
//     </div>
//   );
// }

// src/pages/CameraTab.tsx
// src/pages/CameraTab.tsx

export default function CameraTab() {
  return (
    <div className="w-full h-full grid place-items-center bg-black text-white">
      카메라 기능은 잠시 비활성화됨 (지도 탭 먼저 완성 중)
    </div>
  );
}