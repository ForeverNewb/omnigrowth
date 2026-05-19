"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export function WelcomeHeading() {
  const viewer = useQuery(api.shared.users.viewer);

  // Best-effort label until we capture a proper display name during signup.
  const label = (() => {
    if (viewer === undefined) return " "; // nbsp keeps line height while loading
    if (!viewer) return "back";
    if (viewer.name) return viewer.name;
    if (viewer.email) return viewer.email.split("@")[0];
    return "back";
  })();

  return (
    <h1>
      Welcome, <em>{label}</em>.
    </h1>
  );
}
