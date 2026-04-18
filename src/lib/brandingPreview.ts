export const BRANDING_BROADCAST_CHANNEL = "gyc-branding-sync";
export const BRANDING_DRAFT_BROADCAST_CHANNEL = "gyc-branding-draft-sync";
export const BRANDING_PREVIEW_QUERY_PARAM = "__brandingPreviewId";

export const getBrandingPreviewId = (search?: string) => {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = typeof search === "string" ? search : window.location.search;
  return new URLSearchParams(searchParams).get(BRANDING_PREVIEW_QUERY_PARAM);
};

export const getBrandingDraftStorageKey = (previewId: string) =>
  `${BRANDING_DRAFT_BROADCAST_CHANNEL}:${previewId}`;

export const readBrandingDraft = <T>(previewId: string | null) => {
  if (typeof window === "undefined" || !previewId) {
    return null;
  }

  try {
    const storedDraft = localStorage.getItem(getBrandingDraftStorageKey(previewId));
    return storedDraft ? (JSON.parse(storedDraft) as T) : null;
  } catch {
    return null;
  }
};