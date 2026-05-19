"use client";

// Used by /dash/onboarding (which navigates to the new brand's dashboard) and the
// "+ New brand" entry in the BrandSwitcher (which calls `onCreated` to handle
// its own navigation). The form itself is intentionally minimal: just a name
// field. description and voice are out of scope for v1; they can be edited
// later from a brand settings screen (also out of scope for v1).

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";

interface Props {
  onCreated: (brandId: Id<"brand_profiles">) => void;
}

interface QuotaError {
  code: "BRAND_QUOTA_EXCEEDED";
  limit: number;
  tier: "free" | "pro" | "agency";
}

function isQuotaError(data: unknown): data is QuotaError {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { code?: string }).code === "BRAND_QUOTA_EXCEEDED"
  );
}

export function CreateBrandForm({ onCreated }: Props) {
  const create = useMutation(api.brandProfile.brands.create);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const brandId = await create({ name: name.trim() });
      onCreated(brandId);
    } catch (err) {
      // ConvexError surfaces structured payloads on `err.data` in the client SDK.
      const data = (err as { data?: unknown }).data;
      if (isQuotaError(data)) {
        setError(
          `You've reached your ${data.tier}-tier limit of ${data.limit} brand${
            data.limit === 1 ? "" : "s"
          }. Upgrade in Settings → Billing to add more.`,
        );
      } else {
        setError(err instanceof Error ? err.message : "Could not create brand.");
      }
      setSubmitting(false);
    }
  };

  return (
    <form className="brand-form" onSubmit={onSubmit}>
      <label className="brand-form-label" htmlFor="brand-name">
        Brand name
      </label>
      <input
        id="brand-name"
        className="brand-form-input"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Lumen Botanicals"
        disabled={submitting}
        required
      />
      {error && <p className="brand-form-error">{error}</p>}
      <button type="submit" className="brand-form-submit" disabled={submitting || !name.trim()}>
        {submitting ? "Creating…" : "Create brand"}
      </button>
    </form>
  );
}
