"use client";

import { useState, useRef } from "react";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS } from "@/lib/constants";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/**
 * Upload do logo da agência para o bucket público `agency-assets`.
 * Mantém um hidden input `logo_url` sincronizado, então o form pai (server
 * action) salva a URL final junto com os demais campos.
 */
export function LogoUpload({ initialUrl }: { initialUrl?: string | null }) {
  const [logoUrl, setLogoUrl] = useState<string>(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Use PNG, JPG, WebP ou SVG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Logo muito grande (máx 2 MB).");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("bucket", STORAGE_BUCKETS.agency);
      // path dentro do bucket — a rota prefixa com o agencia_id.
      const ext = file.name.split(".").pop() ?? "png";
      fd.set("path", `logos/logo-${Date.now()}.${ext}`);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Erro no upload");
      }
      // json.data.path é o caminho relativo ao bucket (agenciaId/logos/...).
      const path = (json.data?.path as string) ?? "";
      const supabase = createClient();
      const { data } = supabase.storage
        .from(STORAGE_BUCKETS.agency)
        .getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`; // cache-bust no preview
      setLogoUrl(url);
      toast.success("Logo enviada. Salve as configurações para confirmar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remover() {
    setLogoUrl("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      {/* hidden input que viaja no form pai */}
      <input type="hidden" name="logo_url" value={logoUrl} />

      <div className="flex items-center gap-4">
        {/* Preview / placeholder */}
        <div className="h-20 w-20 rounded-lg border border-border bg-bg-elevated flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo da agência"
              className="h-full w-full object-contain"
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-slate-500" />
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-slate-400">
            Logo da agência. Aparece no menu lateral e no portal do cliente.
          </p>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-royal-500 hover:bg-royal-600 text-white disabled:opacity-50 transition"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              {uploading ? "Enviando..." : logoUrl ? "Trocar logo" : "Enviar logo"}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={remover}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border text-slate-400 hover:text-danger-300 hover:border-danger-500/40 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">PNG, JPG, WebP ou SVG — máx 2 MB.</p>
        </div>
      </div>
    </div>
  );
}