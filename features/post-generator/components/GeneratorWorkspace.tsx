"use client";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import { BriefPanel } from "./BriefPanel";
import { HistoryRail } from "./HistoryRail";
import { PreviewPanel } from "./PreviewPanel";

interface GeneratorWorkspaceProps {
  brandId: Id<"brand_profiles">;
}

export function GeneratorWorkspace({ brandId }: GeneratorWorkspaceProps) {
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  // Fetch all drafts so we can look up the full Doc after selecting by id
  const drafts = useQuery(api.postGenerator.drafts.listByBrand, { brandId, limit: 50 });

  const selectedDraft: Doc<"postgen_drafts"> | null =
    selectedDraftId && drafts ? (drafts.find((d) => d._id === selectedDraftId) ?? null) : null;

  // Brand name for brand voice eyebrow (cheap read, already cached by sidenav)
  const brand = useQuery(api.brandProfile.brands.get, { brandId });

  function handleDraftCreated(draftId: string) {
    setSelectedDraftId(draftId);
  }

  function handleHistorySelect(draft: Doc<"postgen_drafts">) {
    setSelectedDraftId(draft._id);
  }

  return (
    <div className="gen-page-grid mt-32">
      <BriefPanel
        brandId={brandId}
        brandVoice={brand?.name ?? null}
        onDraftCreated={handleDraftCreated}
      />
      <PreviewPanel draft={selectedDraft} />
      <HistoryRail
        brandId={brandId}
        selectedDraftId={selectedDraftId}
        onSelect={handleHistorySelect}
      />
    </div>
  );
}
