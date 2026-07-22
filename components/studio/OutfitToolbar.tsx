"use client";

type OutfitToolbarProps = {
  name: string;
  canSave: boolean;
  saving: boolean;
  publishing: boolean;
  isPublished: boolean;
  canPublish: boolean;
  statusMessage?: string | null;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onReset: () => void;
};

export function OutfitToolbar({
  name,
  canSave,
  saving,
  publishing,
  isPublished,
  canPublish,
  statusMessage,
  onNameChange,
  onSave,
  onPublish,
  onUnpublish,
  onReset,
}: OutfitToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
      <label className="block min-w-0 flex-1 text-sm">
        <span className="mb-1 block text-muted">Outfit name</span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-accent"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || saving || publishing}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
        {isPublished ? (
          <button
            type="button"
            onClick={onUnpublish}
            disabled={!canPublish || publishing || saving}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-accent disabled:opacity-50"
          >
            {publishing ? "Updating…" : "Unpublish"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onPublish}
            disabled={!canPublish || publishing || saving}
            className="rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent hover:text-white disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        )}
      </div>
      {statusMessage && <p className="w-full text-sm text-muted sm:order-last">{statusMessage}</p>}
    </div>
  );
}
