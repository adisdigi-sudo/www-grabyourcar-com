import { supabase } from "@/integrations/supabase/client";

type DownloadBrochureInput = {
  brochureUrl?: string | null;
  carName: string;
  carSlug?: string;
  carId?: string | number;
};

const sanitizeFilePart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "car";

const isHostedBrochure = (url: string) =>
  url.includes("/storage/v1/object/public/brochures/") || url.includes("supabase.co/storage/v1/object/public/brochures/");

const saveBlob = (blob: Blob, fileName: string) => {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1200);
};

export const downloadBrochureSafely = async ({
  brochureUrl,
  carName,
  carSlug,
  carId,
}: DownloadBrochureInput) => {
  if (!brochureUrl) {
    throw new Error("Brochure not available");
  }

  const fileName = `${sanitizeFilePart(carSlug || carName)}-brochure.pdf`;
  let downloadUrl = brochureUrl;

  if (!isHostedBrochure(downloadUrl)) {
    const { data, error } = await supabase.functions.invoke("download-brochure", {
      body: {
        carId: carId ? String(carId) : undefined,
        oemUrl: downloadUrl,
        carSlug: carSlug || sanitizeFilePart(carName),
      },
    });

    if (error || !data?.success || !data?.url) {
      throw new Error(data?.error || error?.message || "Brochure download failed");
    }

    downloadUrl = data.url;
  }

  const response = await fetch(downloadUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Brochure file is unavailable");
  }

  const blob = await response.blob();
  saveBlob(blob, fileName);
  return true;
};