import { useState } from "react";

export default function BottomSheet({
  header,
  children,
  snapPoints = [0.1, 0.4, 0.85],
  initialSnap = 0,
  heightOffset = 0,
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  heightOffset?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-md text-white rounded-t-2xl transition-all duration-500`}
      style={{
        height: open ? `80%` : `12%`,
        transform: open ? "translateY(0%)" : "translateY(calc(80% - 70px))",
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        className="cursor-pointer py-3 px-5 flex items-center justify-between border-b border-white/10"
      >
        {header || <div className="font-semibold">나의 예술 기록</div>}
        <span className="text-xs text-gray-400">{open ? "▼" : "▲"}</span>
      </div>

      <div className="overflow-y-auto h-[calc(100%-50px)] p-3">{children}</div>
    </div>
  );
}