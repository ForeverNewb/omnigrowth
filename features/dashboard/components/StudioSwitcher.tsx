"use client";

// Brand-aware "studio bar" on the dashboard. Reads brands.list (live), shows
// the active brand by name, opens a dropdown for switching or creating a new
// brand. Switching preserves the current sub-route.

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PLATFORMS = [
  { color: "#1A1A1A" },
  { color: "#0A66C2" },
  { color: "#E1306C" },
  { color: "#1877F2" },
  { color: "#25F4EE" },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function StudioSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const brands = useQuery(api.brandProfile.brands.list);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // pathname looks like /dash/b/<brandId>/<subRoute...>
  const parts = pathname.split("/");
  const activeBrandId = parts[3] as Id<"brand_profiles"> | undefined;
  const subRoute = parts.slice(4).join("/") || "dashboard";

  const active = brands?.find((b) => b._id === activeBrandId) ?? null;
  const displayName = active?.name ?? "…";

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const switchTo = (id: Id<"brand_profiles">) => {
    setOpen(false);
    if (id !== activeBrandId) router.push(`/dash/b/${id}/${subRoute}`);
  };

  const goNew = () => {
    setOpen(false);
    router.push("/dash/onboarding");
  };

  return (
    <div className="studio-switch" ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="studio-mark"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch brand"
      >
        {active ? initials(active.name) : "·"}
      </button>
      <button
        type="button"
        className="studio-info"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          color: "inherit",
          font: "inherit",
        }}
      >
        <div className="studio-eyebrow">Brand · click to switch</div>
        <div
          className="studio-name"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <span>{displayName}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 160ms ease",
              opacity: 0.7,
              flexShrink: 0,
            }}
          >
            <path
              d="M3 5l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>
      <div className="studio-pills">
        <div className="studio-platforms">
          {PLATFORMS.map((p, i) => (
            <span key={i} className="pf-dot" style={{ background: p.color }} />
          ))}
        </div>
        <span className="studio-pill">
          <strong>—</strong> accounts
        </span>
        <span className="studio-pill">
          <strong>—</strong> queued
        </span>
        <span className="studio-pill">
          <strong>{brands?.length ?? 0}</strong> {brands?.length === 1 ? "brand" : "brands"}
        </span>
      </div>

      {open && (
        <div
          aria-label="Brands"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            minWidth: 280,
            padding: 6,
            background: "var(--paper-2)",
            border: "1px solid var(--paper-edge)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--shadow-paper-soft)",
            zIndex: 50,
          }}
        >
          {brands?.map((b) => {
            const isActive = b._id === activeBrandId;
            return (
              <button
                key={b._id}
                type="button"
                onClick={() => switchTo(b._id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  background: isActive ? "var(--paper-3)" : "transparent",
                  border: "none",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--ink-1)",
                  fontFamily: "var(--sans)",
                  fontSize: "var(--t-14)",
                  fontWeight: isActive ? 600 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--paper-3)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "var(--brass-1)",
                    color: "var(--ink-1)",
                    fontFamily: "var(--serif)",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {initials(b.name)}
                </span>
                <span style={{ flex: 1 }}>{b.name}</span>
                {isActive && (
                  <span aria-hidden style={{ color: "var(--ink-3)", fontSize: 12 }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
          <div
            style={{
              height: 1,
              background: "var(--paper-edge)",
              margin: "6px 4px",
            }}
            aria-hidden
          />
          <button
            type="button"
            onClick={goNew}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "8px 10px",
              background: "transparent",
              border: "none",
              borderRadius: "var(--r-sm)",
              cursor: "pointer",
              textAlign: "left",
              color: "var(--accent-2)",
              fontFamily: "var(--sans)",
              fontSize: "var(--t-14)",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--paper-3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            + New brand
          </button>
        </div>
      )}
    </div>
  );
}
