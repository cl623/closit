"use client";

type OutfitToolbarProps = {
  name: string;
  canSave: boolean;
  saving: boolean;
  statusMessage?: string | null;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onReset: () => void;
};

export function OutfitToolbar({
  name,
  canSave,
  saving,
  statusMessage,
  onNameChange,
  onSave,
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
          disabled={!canSave || saving}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
      </div>
      {statusMessage && <p className="w-full text-sm text-muted sm:order-last">{statusMessage}</p>}
    </div>
  );
}
