"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleItemLike, toggleItemSave, toggleOutfitLike } from "@/lib/data/social";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type OutfitLikeButtonProps = {
  outfitId: string;
  liked: boolean;
  likeCount: number;
  signedIn: boolean;
  onChange?: (next: { liked: boolean; like_count: number }) => void;
  className?: string;
};

export function OutfitLikeButton({
  outfitId,
  liked,
  likeCount,
  signedIn,
  onChange,
  className,
}: OutfitLikeButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [localLiked, setLocalLiked] = useState(liked);
  const [localCount, setLocalCount] = useState(likeCount);

  async function handleClick() {
    if (!isSupabaseConfigured()) return;
    if (!signedIn) {
      router.push("/login");
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      const result = await toggleOutfitLike(outfitId);
      setLocalLiked(result.liked);
      setLocalCount(result.like_count);
      onChange?.(result);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={
        className ??
        "rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:border-accent disabled:opacity-50"
      }
      aria-pressed={localLiked}
    >
      {localLiked ? "Liked" : "Like"} · {localCount}
    </button>
  );
}

type ItemEngagementButtonsProps = {
  itemId: string;
  liked: boolean;
  likeCount: number;
  saved: boolean;
  saveCount: number;
  signedIn: boolean;
  onLikeChange?: (next: { liked: boolean; like_count: number }) => void;
  onSaveChange?: (next: { saved: boolean; save_count: number }) => void;
};

export function ItemEngagementButtons({
  itemId,
  liked,
  likeCount,
  saved,
  saveCount,
  signedIn,
  onLikeChange,
  onSaveChange,
}: ItemEngagementButtonsProps) {
  const router = useRouter();
  const [busyLike, setBusyLike] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [localLiked, setLocalLiked] = useState(liked);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount);
  const [localSaved, setLocalSaved] = useState(saved);
  const [localSaveCount, setLocalSaveCount] = useState(saveCount);

  function requireAuth() {
    if (!signedIn) {
      router.push("/login");
      return false;
    }
    return true;
  }

  async function handleLike() {
    if (!isSupabaseConfigured() || !requireAuth() || busyLike) return;
    setBusyLike(true);
    try {
      const result = await toggleItemLike(itemId);
      setLocalLiked(result.liked);
      setLocalLikeCount(result.like_count);
      onLikeChange?.(result);
    } finally {
      setBusyLike(false);
    }
  }

  async function handleSave() {
    if (!isSupabaseConfigured() || !requireAuth() || busySave) return;
    setBusySave(true);
    try {
      const result = await toggleItemSave(itemId);
      setLocalSaved(result.saved);
      setLocalSaveCount(result.save_count);
      onSaveChange?.(result);
    } finally {
      setBusySave(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleLike}
        disabled={busyLike}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-accent disabled:opacity-50"
        aria-pressed={localLiked}
      >
        {localLiked ? "Liked" : "Like"} · {localLikeCount}
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={busySave}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-accent disabled:opacity-50"
        aria-pressed={localSaved}
      >
        {localSaved ? "Saved" : "Save"} · {localSaveCount}
      </button>
      {!signedIn && (
        <Link href="/login" className="self-center text-xs text-muted underline-offset-2 hover:underline">
          Sign in
        </Link>
      )}
    </div>
  );
}
