import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

// The KYC columns/RPCs are new, so the generated Supabase types don't know them yet.
// Once the types are regenerated this cast can be removed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const ID_TYPES = [
  "National ID (NIN slip or card)",
  "International passport",
  "Driver's licence",
  "Voter's card",
] as const;

const MAX_BYTES = 5 * 1024 * 1024;

type KycState = {
  kyc_status: "not_submitted" | "pending" | "verified" | "rejected";
  kyc_id_type: string | null;
  kyc_note: string | null;
};

function useKyc(userId: string) {
  return useQuery({
    queryKey: ["clipper-kyc", userId],
    queryFn: async (): Promise<KycState | null> => {
      const { data, error } = await db
        .from("clipper_profiles")
        .select("kyc_status, kyc_id_type, kyc_note")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as KycState | null;
    },
  });
}

function useSubmitKyc(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ idType, file }: { idType: string; file: File }) => {
      if (file.size > MAX_BYTES) throw new Error("File is too large — 5 MB maximum");
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        throw new Error("Upload a photo (JPG/PNG) or a PDF");
      }
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${userId}/id-${Date.now()}.${ext || "jpg"}`;
      const { error: upErr } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error } = await db.rpc("submit_kyc", { _id_type: idType, _document_path: path });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ID submitted. We'll review it and notify you.");
      queryClient.invalidateQueries({ queryKey: ["clipper-kyc", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function KycSection({ userId }: { userId: string }) {
  const { data, isLoading } = useKyc(userId);
  const submit = useSubmitKyc(userId);
  const [idType, setIdType] = useState("");
  const [file, setFile] = useState<File | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const status = data?.kyc_status ?? "not_submitted";

  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Identity verification (KYC)
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Required before your first payout. Your ID is only seen by the Cloutbase team.
      </p>

      {status === "verified" ? (
        <p className="mt-4 rounded-xl border border-border px-4 py-3 text-sm">
          Verified ✓ — you're clear for payouts.
        </p>
      ) : status === "pending" ? (
        <p className="mt-4 rounded-xl border border-[#4DA3FF]/40 px-4 py-3 text-sm text-[#4DA3FF]">
          Under review. You'll get a notification once it's checked.
        </p>
      ) : (
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!idType || !file) return;
            submit.mutate({ idType, file });
          }}
        >
          {status === "rejected" ? (
            <div className="rounded-xl border border-foreground p-4 text-xs leading-relaxed">
              <p className="font-medium">Verification rejected</p>
              <p className="mt-1 text-muted-foreground">
                {data?.kyc_note ?? "Please upload a clearer photo of a valid ID."}
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="kyc_type">ID type</Label>
            <Select value={idType} onValueChange={setIdType}>
              <SelectTrigger id="kyc_type">
                <SelectValue placeholder="Choose an ID" />
              </SelectTrigger>
              <SelectContent>
                {ID_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kyc_file">Photo or PDF of the ID</Label>
            <input
              id="kyc_file"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:text-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              Name on the ID must match your real name above. 5 MB max.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={!idType || !file || submit.isPending}>
            {submit.isPending ? "Submitting…" : "Submit for verification"}
          </Button>
        </form>
      )}
    </section>
  );
}
