"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function initialsFromEmail(email: string | undefined): string {
  if (!email) return "·";
  const local = email.split("@")[0];
  if (!local) return "·";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function AppHeader() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.shared.users.viewer);

  const initials = initialsFromEmail(viewer?.email ?? undefined);
  const label = viewer?.email ?? "Account";

  const onSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="app-header">
      <Link className="brand" href="/dash">
        <span className="brand-mark" />
        OmniGrowth
      </Link>
      <div className="app-search">
        <span className="caption mono" aria-hidden>
          ⌕
        </span>
        <input type="text" placeholder="Search posts, drafts, channels…" />
        <span className="caption mono" style={{ opacity: 0.6 }}>
          ⌘K
        </span>
      </div>
      <div className="app-header-right">
        <ThemeToggle variant="icon" />
        <button type="button" className="icon-btn" aria-label="Notifications">
          ✦<span className="icon-dot" />
        </button>
        <button type="button" className="icon-btn" aria-label="Help">
          ?
        </button>
        <button
          type="button"
          className="avatar"
          onClick={onSignOut}
          aria-label={`Sign out (${label})`}
          title={`Sign out · ${label}`}
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
