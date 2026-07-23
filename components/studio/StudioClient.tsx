"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AvatarStage } from "@/components/studio/AvatarStage";
import { LayerStack } from "@/components/studio/LayerStack";
import { OutfitToolbar } from "@/components/studio/OutfitToolbar";
import { WardrobePanel } from "@/components/studio/WardrobePanel";
import {
  deleteUserItem,
  fetchAvatars,
  fetchOutfit,
  fetchWardrobeItems,
  saveOutfitDraft,
} from "@/lib/data/catalog";
import { publishOutfit, unpublishOutfit } from "@/lib/data/social";
import type { ItemCategory } from "@/lib/items/categories";
import type { Avatar, EquippedPiece, FashionItem } from "@/lib/outfits/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LOCAL_AVATAR_ID } from "@/lib/seed/local-data";

type StudioClientProps = {
  outfitId?: string;
};

function nextLayerZ(equipped: EquippedPiece[], item: FashionItem): number {
  const sameCategory = equipped.filter((p) => p.category === item.category);
  if (sameCategory.length === 0) return item.z_index;
  const maxInCategory = Math.max(...sameCategory.map((p) => p.layer_z));
  return maxInCategory + 1;
}

function swapLayerOrder(equipped: EquippedPiece[], itemId: string, direction: "forward" | "back") {
  const ordered = [...equipped].sort((a, b) => a.layer_z - b.layer_z);
  const index = ordered.findIndex((p) => p.id === itemId);
  if (index < 0) return equipped;

  const swapWith = direction === "forward" ? index + 1 : index - 1;
  if (swapWith < 0 || swapWith >= ordered.length) return equipped;

  const a = ordered[index];
  const b = ordered[swapWith];
  const aZ = a.layer_z;
  const bZ = b.layer_z;

  return equipped.map((piece) => {
    if (piece.id === a.id) return { ...piece, layer_z: bZ };
    if (piece.id === b.id) return { ...piece, layer_z: aZ };
    return piece;
  });
}

export function StudioClient({ outfitId }: StudioClientProps) {
  const router = useRouter();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [items, setItems] = useState<FashionItem[]>([]);
  const [avatarId, setAvatarId] = useState(LOCAL_AVATAR_ID);
  const [equipped, setEquipped] = useState<EquippedPiece[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ItemCategory>("top");
  const [name, setName] = useState("Untitled outfit");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentOutfitId, setCurrentOutfitId] = useState<string | null>(outfitId ?? null);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
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
          setIsPublished(outfit.is_published);
          setEquipped(outfit.items);
          setSelectedItemId(outfit.items[outfit.items.length - 1]?.id ?? null);
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

  const equippedCount = equipped.length;

  function toggleEquip(item: FashionItem) {
    setEquipped((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (exists) {
        setSelectedItemId((current) => (current === item.id ? null : current));
        return prev.filter((p) => p.id !== item.id);
      }
      const piece: EquippedPiece = { ...item, layer_z: nextLayerZ(prev, item) };
      setSelectedItemId(item.id);
      return [...prev, piece];
    });
    setStatusMessage(null);
  }

  function unequipItem(itemId: string) {
    setEquipped((prev) => prev.filter((p) => p.id !== itemId));
    setSelectedItemId((current) => (current === itemId ? null : current));
  }

  function resetOutfit() {
    setEquipped([]);
    setSelectedItemId(null);
    setName("Untitled outfit");
    setStatusMessage("Outfit cleared.");
  }

  async function persistDraft(): Promise<string | null> {
    if (!userId || !avatar) return null;

    const result = await saveOutfitDraft({
      outfitId: currentOutfitId,
      userId,
      avatarId: avatar.id,
      name: name.trim() || "Untitled outfit",
      equipped,
    });
    setCurrentOutfitId(result.id);
    setIsPublished(false);
    if (!outfitId) {
      router.replace(`/studio/${result.id}`);
    }
    return result.id;
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
      await persistDraft();
      setStatusMessage("Draft saved.");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!configured) {
      setStatusMessage("Configure Supabase to publish.");
      return;
    }
    if (!userId) {
      setStatusMessage("Sign in to publish.");
      return;
    }
    if (equippedCount < 1) {
      setStatusMessage("Equip at least one item before publishing.");
      return;
    }

    setPublishing(true);
    setStatusMessage(null);
    try {
      const id = await persistDraft();
      if (!id) throw new Error("Failed to save outfit before publish.");
      await publishOutfit(id);
      setIsPublished(true);
      setStatusMessage("Published to the feed.");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    if (!configured || !userId || !currentOutfitId) return;

    setPublishing(true);
    setStatusMessage(null);
    try {
      await unpublishOutfit(currentOutfitId);
      setIsPublished(false);
      setStatusMessage("Removed from the feed.");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to unpublish");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDeleteItem(item: FashionItem) {
    if (!userId || item.owner_id !== userId) return;
    const confirmed = window.confirm(`Delete “${item.name}”?`);
    if (!confirmed) return;

    try {
      await deleteUserItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      unequipItem(item.id);
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
            Stack multiple pieces per category and reorder layers. Jackets can sit over tops.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/outfits"
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent"
          >
            My outfits
          </Link>
          <Link
            href="/upload"
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:border-accent"
          >
            Upload item
          </Link>
        </div>
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
        publishing={publishing}
        isPublished={isPublished}
        canPublish={Boolean(userId && configured && (isPublished || equippedCount > 0))}
        statusMessage={statusMessage}
        onNameChange={setName}
        onSave={handleSave}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onReset={resetOutfit}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <div className="space-y-4">
          <AvatarStage avatar={avatar} equippedItems={equipped} className="w-full" />
          <LayerStack
            equipped={equipped}
            selectedItemId={selectedItemId}
            onSelect={setSelectedItemId}
            onBringForward={(id) => setEquipped((prev) => swapLayerOrder(prev, id, "forward"))}
            onSendBackward={(id) => setEquipped((prev) => swapLayerOrder(prev, id, "back"))}
            onUnequip={unequipItem}
          />
        </div>
        <WardrobePanel
          items={items}
          activeCategory={activeCategory}
          equipped={equipped}
          currentUserId={userId}
          onCategoryChange={setActiveCategory}
          onToggleEquip={toggleEquip}
          onUnequipItem={unequipItem}
          onDeleteItem={userId ? handleDeleteItem : undefined}
        />
      </div>
    </div>
  );
}
