"use client";

import { useRef } from "react";
import type { Avatar } from "@/lib/outfits/types";
import { resolveImageUrl } from "@/lib/items/image-url";

type AnchorEditorProps = {
  avatar: Avatar;
  previewUrl: string | null;
  anchorX: number;
  anchorY: number;
  onChange: (anchorX: number, anchorY: number) => void;
};

export function AnchorEditor({
  avatar,
  previewUrl,
  anchorX,
  anchorY,
  onChange,
}: AnchorEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  function setFromClientPoint(clientX: number, clientY: number) {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    onChange(Number(x.toFixed(4)), Number(y.toFixed(4)));
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        Click the stage to place the item anchor (center of the piece on the body).
      </p>
      <div
        ref={stageRef}
        role="presentation"
        onClick={(e) => setFromClientPoint(e.clientX, e.clientY)}
        className="relative cursor-crosshair overflow-hidden rounded-3xl border border-border bg-stage"
        style={{ aspectRatio: `${avatar.body_width} / ${avatar.body_height}` }}
      >
        <img
          src={resolveImageUrl(avatar.image_path)}
          alt={avatar.name}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Item preview"
            className="pointer-events-none absolute max-h-[55%] max-w-[70%] -translate-x-1/2 -translate-y-1/2 object-contain"
            style={{
              left: `${anchorX * 100}%`,
              top: `${anchorY * 100}%`,
              zIndex: 20,
            }}
            draggable={false}
          />
        )}
        <div
          className="pointer-events-none absolute z-30 h-5 w-5 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${anchorX * 100}%`, top: `${anchorY * 100}%` }}
        >
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-accent" />
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-accent" />
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-white" />
        </div>
      </div>
      <p className="text-xs text-muted">
        Anchor: {anchorX.toFixed(3)}, {anchorY.toFixed(3)}
      </p>
    </div>
  );
}
