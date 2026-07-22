import Link from "next/link";

export default function HomePage() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-16 sm:px-12 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 40%, #f0d7c4 100%), radial-gradient(circle at 80% 20%, #dce8e0, transparent 35%)",
        }}
      />
      <div className="relative max-w-xl">
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-muted">Digital closet</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl leading-tight text-foreground sm:text-6xl">
          clos.it
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted">
          Dress a 2D avatar, upload your own pieces, and build outfits that sit right on the body.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/studio"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-deep"
          >
            Open studio
          </Link>
          <Link
            href="/upload"
            className="rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:border-accent"
          >
            Upload an item
          </Link>
        </div>
      </div>
    </section>
  );
}
