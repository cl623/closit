"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AvatarStage } from "@/components/studio/AvatarStage";
import { OutfitToolbar } from "@/components/studio/OutfitToolbar";
import { WardrobePanel } from "@/components/studio/WardrobePanel";
import {
  deleteUserItem,
  fetchAvatars,
  fetchOutfit,
  fetchWardrobeItems,
  saveOutfitDraft,
} from "@/lib/data/catalog";
import type { ItemCategory } from "@/lib/items/categories";
import type { Avatar, EquippedSlots, FashionItem } from "@/lib/outfits/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LOCAL_AVATAR_ID } from "@/lib/seed/local-data";

type StudioClientProps = {
  outfitId?: string;
};

export function StudioClient({ outfitId }: StudioClientProps) {
  const router = useRouter();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [items, setItems] = useState<FashionItem[]>([]);
  const [avatarId, setAvatarId] = useState(LOCAL_AVATAR_ID);
  const [equipped, setEquipped] = useState<EquippedSlots>({});
  const [activeCategory, setActiveCategory] = useState<ItemCategory>("top");
  const [name, setName] = useState("Untitled outfit");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentOutfitId, setCurrentOutfitId] = useState<string | null>(outfitId ?? null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  const loadCatalog = useCallback(async (uid: string | null) => {
    const [nextAvatars, nextItems] = await Promise.all([
      fetchAvatars(),
      fetchWardrobeItems(uid),
    ]);
    setAvatars(nextAvatars);
    setItems(nextItems);
    if (nextAvatars[0] && !outfitId) {
      setAvatarId(nextAvatars[0].id);
    }
  }, [outfitId]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      let uid: string | null = null;

      if (configured) {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        uid = data.user?.id ?? null;
        if (!cancelled) setUserId(uid);
      }

      await loadCatalog(uid);

      if (outfitId && configured) {
        const outfit = await fetchOutfit(outfitId);
        if (outfit && !cancelled) {
          setCurrentOutfitId(outfit.id);
          setAvatarId(outfit.avatar_id);
          setName(outfit.name);
          const nextEquipped: EquippedSlots = {};
          for (const item of outfit.items) {
            nextEquipped[item.category] = item;
          }
          setEquipped(nextEquipped);
        }
      }

      if (!cancelled) setLoading(false);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [configured, loadCatalog, outfitId]);

  const avatar = useMemo(
    () => avatars.find((a) => a.id === avatarId) ?? avatars[0],
    [avatars, avatarId],
  );

  const equippedList = useMemo(() => Object.values(equipped).filter(Boolean) as FashionItem[], [equipped]);

  function equipItem(item: FashionItem) {
    setEquipped((prev) => ({ ...prev, [item.category]: item }));
    setStatusMessage(null);
  }

  function unequipCategory(category: ItemCategory) {
    setEquipped((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  }

  function resetOutfit() {
    setEquipped({});
    setName("Untitled outfit");
    setStatusMessage("Outfit cleared.");
  }

  async function handleSave() {
    if (!configured) {
      setStatusMessage("Configure Supabase to save drafts.");
      return;
    }
    if (!userId) {
      setStatusMessage("Sign in to save drafts.");
      return;
    }
    if (!avatar) return;

    setSaving(true);
    setStatusMessage(null);
    try {
      const result = await saveOutfitDraft({
        outfitId: currentOutfitId,
        userId,
        avatarId: avatar.id,
        name: name.trim() || "Untitled outfit",
        equipped,
      });
      setCurrentOutfitId(result.id);
      setStatusMessage("Draft saved.");
      if (!outfitId) {
        router.replace(`/studio/${result.id}`);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(item: FashionItem) {
    if (!userId || item.owner_id !== userId) return;
    const confirmed = window.confirm(`Delete “${item.name}”?`);
    if (!confirmed) return;

    try {
      await deleteUserItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setEquipped((prev) => {
        if (prev[item.category]?.id !== item.id) return prev;
        const next = { ...prev };
        delete next[item.category];
        return next;
      });
      setStatusMessage(`Deleted ${item.name}.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  if (loading || !avatar) {
    return <p className="text-muted">Loading studio…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Outfit studio</h1>
          <p className="text-sm text-muted">
            Layer items by category. Jackets sit over tops; shoes under pants.
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent"
        >
          Upload item
        </Link>
      </div>

      {!userId && configured && (
        <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Browsing as a guest —{" "}
          <Link href="/login" className="text-accent underline-offset-2 hover:underline">
            sign in
          </Link>{" "}
          to save drafts or see your uploads.
        </p>
      )}

      <OutfitToolbar
        name={name}
        canSave={Boolean(userId && configured)}
        saving={saving}
        statusMessage={statusMessage}
        onNameChange={setName}
        onSave={handleSave}
        onReset={resetOutfit}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <AvatarStage avatar={avatar} equippedItems={equippedList} className="w-full" />
        <WardrobePanel
          items={items}
          activeCategory={activeCategory}
          equipped={equipped}
          currentUserId={userId}
          onCategoryChange={setActiveCategory}
          onEquip={equipItem}
          onUnequip={unequipCategory}
          onDeleteItem={userId ? handleDeleteItem : undefined}
        />
      </div>
    </div>
  );
}
