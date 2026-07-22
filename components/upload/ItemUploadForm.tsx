"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnchorEditor } from "@/components/upload/AnchorEditor";
import {
  CATEGORY_LABELS,
  ITEM_CATEGORIES,
  type ItemCategory,
  zIndexForCategory,
} from "@/lib/items/categories";
import { fetchAvatars } from "@/lib/data/catalog";
import type { Avatar } from "@/lib/outfits/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LOCAL_AVATARS } from "@/lib/seed/local-data";

const MAX_BYTES = 2 * 1024 * 1024;

const DEFAULT_ANCHORS: Record<ItemCategory, { x: number; y: number }> = {
  hair: { x: 0.5, y: 0.14 },
  accessory: { x: 0.5, y: 0.18 },
  outerwear: { x: 0.5, y: 0.36 },
  top: { x: 0.5, y: 0.38 },
  bottom: { x: 0.5, y: 0.62 },
  shoes: { x: 0.5, y: 0.9 },
};

export function ItemUploadForm() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [avatar, setAvatar] = useState<Avatar>(LOCAL_AVATARS[0]);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ItemCategory>("top");
  const [color, setColor] = useState("");
  const [style, setStyle] = useState("");
  const [anchorX, setAnchorX] = useState(DEFAULT_ANCHORS.top.x);
  const [anchorY, setAnchorY] = useState(DEFAULT_ANCHORS.top.y);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const avatars = await fetchAvatars();
      if (!cancelled && avatars[0]) setAvatar(avatars[0]);

      if (!configured) {
        if (!cancelled) setAuthChecked(true);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!cancelled) {
        setUserId(data.user?.id ?? null);
        setAuthChecked(true);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canSubmit = useMemo(
    () => Boolean(configured && userId && file && name.trim()),
    [configured, userId, file, name],
  );

  function onCategoryChange(next: ItemCategory) {
    setCategory(next);
    const defaults = DEFAULT_ANCHORS[next];
    setAnchorX(defaults.x);
    setAnchorY(defaults.y);
  }

  function onFileChange(selected: File | null) {
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.type !== "image/png") {
      setError("Only transparent PNG files are supported.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("File must be 2MB or smaller.");
      setFile(null);
      return;
    }
    setFile(selected);
    if (!name) {
      setName(selected.name.replace(/\.png$/i, "").replace(/[-_]/g, " "));
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!configured) {
      setError("Configure Supabase env vars before uploading.");
      return;
    }
    if (!userId) {
      setError("Sign in to upload items.");
      return;
    }
    if (!file) {
      setError("Choose a PNG file.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const objectPath = `${userId}/${crypto.randomUUID()}.png`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("items")
        .upload(objectPath, file, {
          contentType: "image/png",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const imagePath = `items/${objectPath}`;
      const { error: insertError } = await supabase.from("items").insert({
        owner_id: userId,
        name: name.trim(),
        image_path: imagePath,
        category,
        color: color.trim() || "unspecified",
        style: style.trim() || "custom",
        anchor_x: anchorX,
        anchor_y: anchorY,
        z_index: zIndexForCategory(category),
        is_system: false,
      });
      if (insertError) {
        await supabase.storage.from("items").remove([objectPath]);
        throw insertError;
      }

      router.push("/studio");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authChecked) {
    return <p className="text-muted">Loading…</p>;
  }

  if (!configured) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Upload item</h1>
        <p className="mt-3 text-muted">
          Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, run the
          SQL migrations, then return here to upload PNGs.
        </p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Upload item</h1>
        <p className="mt-3 text-muted">Sign in to import transparent PNGs into your wardrobe.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Upload item</h1>
        <p className="text-sm text-muted">
          Transparent PNG, tag it, set the anchor so it sits correctly on the avatar.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">PNG file</span>
            <input
              type="file"
              accept="image/png"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-accent"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">Category</span>
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value as ItemCategory)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-accent"
            >
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Color</span>
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. red"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-accent"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Style</span>
              <input
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="e.g. grunge"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-accent"
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
          >
            {submitting ? "Uploading…" : "Save to wardrobe"}
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5">
          <AnchorEditor
            avatar={avatar}
            previewUrl={previewUrl}
            anchorX={anchorX}
            anchorY={anchorY}
            onChange={(x, y) => {
              setAnchorX(x);
              setAnchorY(y);
            }}
          />
        </div>
      </form>
    </div>
  );
}
