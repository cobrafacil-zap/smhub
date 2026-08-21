"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAgenciaMember } from "@/lib/auth/session";
import {
  STORAGE_BUCKETS,
  TAREFA_ANEXO_MIME_PERMITIDOS,
  TAREFA_ANEXO_MAX_BYTES,
} from "@/lib/constants";
import { sanitizeFilename } from "@/lib/utils";

// ============================================================================
// SCHEMAS
// ============================================================================
const uuidSchema = z.string().uuid();

export type AnexoState = {
  error?: string;
  ok?: boolean;
  id?: string;
  signedUrl?: string;
} | undefined;

// ============================================================================
// HELPERS
// ============================================================================

/** Gera um ID curto pra usar no path (12 chars do UUID v4 sem traços). */
function shortId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

async function tarefaNaAgencia(
  supabase: ReturnType<typeof createClient>,
  aid: string,
  tarefaId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("tarefas")
    .select("id, agencia_id")
    .eq("id", tarefaId)
    .maybeSingle();
  return !!data && data.agencia_id === aid;
}

// ============================================================================
// UPLOAD
//
// Recebe FormData com `arquivo` (File) + `tarefa_id` (string).
// Valida MIME e tamanho no servidor (cliente pode burlar).
// Path convencionado: {agencia_id}/tarefa/{tarefa_id}/{shortId}-{nome}
// ============================================================================
export async function uploadAnexoAction(
  tarefaId: string,
  formData: FormData
): Promise<AnexoState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(tarefaId).success) {
    return { error: "Tarefa inválida." };
  }
  if (!(await tarefaNaAgencia(supabase, aid, tarefaId))) {
    return { error: "Tarefa não encontrada." };
  }

  const file = formData.get("arquivo");
  if (!(file instanceof File)) {
    return { error: "Arquivo não enviado." };
  }
  if (file.size === 0) {
    return { error: "Arquivo vazio." };
  }
  if (file.size > TAREFA_ANEXO_MAX_BYTES) {
    return { error: "Arquivo muito grande (máx. 50 MB)." };
  }
  if (
    !TAREFA_ANEXO_MIME_PERMITIDOS.includes(
      file.type as (typeof TAREFA_ANEXO_MIME_PERMITIDOS)[number]
    )
  ) {
    return { error: `Tipo de arquivo não permitido (${file.type || "desconhecido"}).` };
  }

  const path = `${aid}/tarefa/${tarefaId}/${shortId()}-${sanitizeFilename(
    file.name
  )}`;

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKETS.tarefaAnexos)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (upErr) {
    console.error("[uploadAnexoAction] supabase storage error:", upErr);
    return { error: `Erro ao enviar arquivo: ${upErr.message}` };
  }

  const { data, error } = await supabase
    .from("tarefa_anexos")
    .insert({
      tarefa_id: tarefaId,
      agencia_id: aid,
      nome_original: file.name.slice(0, 200),
      path,
      mime: file.type,
      tamanho: file.size,
      uploaded_by: session.profile.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    // Rollback do storage pra não deixar lixo órfão
    await supabase.storage.from(STORAGE_BUCKETS.tarefaAnexos).remove([path]);
    return { error: "Erro ao registrar anexo." };
  }

  revalidatePath("/admin/tarefas");
  return { ok: true, id: data.id };
}

// ============================================================================
// EXCLUIR (remove do storage E da tabela)
// ============================================================================
export async function excluirAnexoAction(anexoId: string): Promise<AnexoState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(anexoId).success) return { error: "Anexo inválido." };

  const { data: anexo } = await supabase
    .from("tarefa_anexos")
    .select("id, agencia_id, path")
    .eq("id", anexoId)
    .maybeSingle();
  if (!anexo || anexo.agencia_id !== aid) {
    return { error: "Anexo não encontrado." };
  }

  // Remove do storage (best-effort: se falhar, ainda assim remove do banco
  // pra evitar lixo no banco apontando pra arquivo inexistente — em todo caso,
  // logamos o erro pra investigação).
  const { error: rmErr } = await supabase.storage
    .from(STORAGE_BUCKETS.tarefaAnexos)
    .remove([anexo.path]);
  if (rmErr) {
    console.error("[excluirAnexoAction] storage remove error:", rmErr);
  }

  const { error } = await supabase
    .from("tarefa_anexos")
    .delete()
    .eq("id", anexoId);
  if (error) return { error: "Erro ao excluir anexo." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id: anexoId };
}

// ============================================================================
// SIGNED URL (pra download/preview de arquivo privado)
// ============================================================================
export async function getAnexoSignedUrlAction(
  anexoId: string,
  expiresIn = 3600
): Promise<AnexoState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(anexoId).success) return { error: "Anexo inválido." };

  const { data: anexo } = await supabase
    .from("tarefa_anexos")
    .select("id, agencia_id, path")
    .eq("id", anexoId)
    .maybeSingle();
  if (!anexo || anexo.agencia_id !== aid) {
    return { error: "Anexo não encontrado." };
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.tarefaAnexos)
    .createSignedUrl(anexo.path, expiresIn);
  if (error || !data) return { error: "Erro ao gerar URL." };
  return { ok: true, signedUrl: data.signedUrl };
}
