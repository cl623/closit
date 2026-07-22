"use client";

import type { ReactNode } from "react";
import type { Avatar, FashionItem } from "@/lib/outfits/types";
import { resolveImageUrl } from "@/lib/items/image-url";

type AvatarStageProps = {
  avatar: Avatar;
  equippedItems: FashionItem[];
  className?: string;
  /** Optional overlay for anchor editing (render children above layers). */
  children?: ReactNode;
};

/**
 * Items are positioned by centering each image on (anchor_x, anchor_y)
 * expressed as fractions of the stage width/height.
 */
export function AvatarStage({ avatar, equippedItems, className, children }: AvatarStageProps) {
  const layers = [...equippedItems].sort((a, b) => a.z_index - b.z_index);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-border bg-stage ${className ?? ""}`}
      style={{
        aspectRatio: `${avatar.body_width} / ${avatar.body_height}`,
      }}
    >
      <img
        src={resolveImageUrl(avatar.image_path)}
        alt={avatar.name}
        className="absolute inset-0 h-full w-full object-contain"
        style={{ zIndex: 0 }}
        draggable={false}
      />
      {layers.map((item) => (
        <img
          key={item.id}
          src={resolveImageUrl(item.image_path)}
          alt={item.name}
          className="pointer-events-none absolute max-h-[55%] max-w-[70%] -translate-x-1/2 -translate-y-1/2 object-contain"
          style={{
            left: `${item.anchor_x * 100}%`,
            top: `${item.anchor_y * 100}%`,
            zIndex: item.z_index,
          }}
          draggable={false}
        />
      ))}
      {children}
    </div>
  );
}
