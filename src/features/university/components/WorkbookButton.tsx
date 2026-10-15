import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

/** Accepts a storage path (new) or an old saved signed link (legacy) and returns the path. */
function toPath(value: string): string {
  const match = value.match(/\/object\/(?:sign|public|authenticated)\/course-assets\/([^?]+)/);
  return match ? decodeURIComponent(match[1]!) : value;
}

/** Asks for a 2-minute download link when clicked. Storage rules allow buyers and admins only. */
export function WorkbookButton({ value }: { value: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const { data, error } = await supabase.storage
        .from("course-assets")
        .createSignedUrl(toPath(value), 120, { download: true });
      if (error || !data?.signedUrl) throw new Error("Couldn’t open the workbook. Please try again.");
      window.location.assign(data.signedUrl);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="flex w-full items-center justify-between rounded-2xl border border-border p-4 text-left text-sm hover:border-foreground disabled:opacity-60"
    >
      <span>{busy ? "Preparing your download…" : "Download the workbook (PDF)"}</span>
      <span className="text-xs text-muted-foreground">↓</span>
    </button>
  );
}
