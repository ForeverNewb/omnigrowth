"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Slugs are appended to /dash/b/<brandId>/ at render time. Listed here without
// the brand prefix so the same array drives both href construction and active-
// state matching.
const PRIMARY = [
  { slug: "dashboard", icon: "01", label: "Dashboard" },
  { slug: "calendar", icon: "02", label: "Calendar" },
  { slug: "analytics", icon: "03", label: "Analytics" },
];

const PLATFORMS = [
  { key: "x", label: "X / Twitter", color: "#1A1A1A" },
  { key: "li", label: "LinkedIn", color: "#0A66C2" },
  { key: "ig", label: "Instagram", color: "#E1306C" },
  { key: "fb", label: "Facebook", color: "#1877F2" },
  { key: "tt", label: "TikTok", color: "#25F4EE" },
  { key: "yt", label: "YouTube", color: "#FF0000" },
  { key: "th", label: "Threads", color: "#101010" },
  { key: "pi", label: "Pinterest", color: "#E60023" },
];

export function AppSideNav() {
  const pathname = usePathname();

  // pathname looks like /dash/b/<brandId>/<sub...>; index 3 is the brandId.
  // On non-brand routes (e.g. /dash/onboarding) brandId is undefined and the
  // primary nav renders as disabled spans rather than links to /dash/b/undefined/...
  const parts = pathname.split("/");
  const brandId = parts[2] === "b" ? parts[3] : undefined;
  const activeSlug = brandId ? parts[4] : undefined;

  return (
    <nav className="app-sidenav">
      <div className="sidenav-list">
        {PRIMARY.map((item) => {
          const isActive = activeSlug === item.slug;
          if (!brandId) {
            return (
              <span
                key={item.slug}
                className="sidenav-item"
                aria-disabled="true"
                style={{ opacity: 0.4, cursor: "not-allowed" }}
              >
                <span className="sidenav-icon">{item.icon}</span>
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.slug}
              href={`/dash/b/${brandId}/${item.slug}`}
              className={`sidenav-item ${isActive ? "active" : ""}`}
            >
              <span className="sidenav-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="sidenav-section">
        <div className="sidenav-section-label">Channels</div>
        <div className="sidenav-list">
          {PLATFORMS.map((p) => (
            <a key={p.key} href="#" className="sidenav-item">
              <span className="pf-dot" style={{ background: p.color }} />
              {p.label}
            </a>
          ))}
        </div>
      </div>

      <div className="sidenav-section">
        <div className="sidenav-section-label">Workspace</div>
        <div className="sidenav-list">
          {/* Brand voices is unimplemented (brand-profile v2). Renders as a
              disabled span until the feature lands so the slot is reserved. */}
          <span
            className="sidenav-item"
            aria-disabled="true"
            style={{ opacity: 0.4, cursor: "not-allowed" }}
          >
            <span className="sidenav-icon">B</span>
            Brand voices
          </span>
          {brandId ? (
            <Link
              href={`/dash/b/${brandId}/media`}
              className={`sidenav-item ${activeSlug === "media" ? "active" : ""}`}
            >
              <span className="sidenav-icon">M</span>
              Media library
            </Link>
          ) : (
            <span
              className="sidenav-item"
              aria-disabled="true"
              style={{ opacity: 0.4, cursor: "not-allowed" }}
            >
              <span className="sidenav-icon">M</span>
              Media library
            </span>
          )}
          {/* Settings is unimplemented. Disabled span same as Brand voices. */}
          <span
            className="sidenav-item"
            aria-disabled="true"
            style={{ opacity: 0.4, cursor: "not-allowed" }}
          >
            <span className="sidenav-icon">⚙</span>
            Settings
          </span>
        </div>
      </div>
    </nav>
  );
}
