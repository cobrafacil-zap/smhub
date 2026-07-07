import { createClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/constants";

/** Buckets válidos. */
export type Bucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

interface UploadOptions {
  bucket: Bucket;
  /** Caminho dentro do bucket. ex: "agenciaId/logos/logo.png" */
  path: string;
  file: File | Blob;
  contentType?: string;
  cacheControl?: string;
}

/** Faz upload via cliente browser. */
export async function uploadFile({ bucket, path, file, contentType, cacheControl }: UploadOptions) {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: contentType ?? (file as File).type,
    cacheControl: cacheControl ?? "3600",
    upsert: true,
  });
  if (error) throw error;
  return data;
}

/** Retorna URL pública (bucket público) ou signed URL (bucket privado). */
export async function getFileUrl(bucket: Bucket, path: string, expiresIn = 3600) {
  const supabase = createClient();
  if (bucket === STORAGE_BUCKETS.agency || bucket === STORAGE_BUCKETS.client) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/** Upload server-side (route handlers). */
export async function uploadFileServer(opts: UploadOptions & { token: string }) {
  const supabase = createServerClient();
  const { data, error } = await supabase.storage.from(opts.bucket).upload(
    opts.path,
    opts.file,
    {
      contentType: opts.contentType ?? (opts.file as File).type,
      cacheControl: opts.cacheControl ?? "3600",
      upsert: true,
    }
  );
  if (error) throw error;
  return data;
}

/** Helper: caminho padrão para logos. */
export function logoPath(agenciaId: string, filename: string) {
  return `${agenciaId}/logos/${filename}`;
}
