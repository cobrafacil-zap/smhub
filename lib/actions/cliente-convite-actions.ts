"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgenciaAdmin, requireAgenciaMember, requireCliente } from "@/lib/auth/session";
import type { Cliente } from "@/types/database";

// ============================================================================
// CONVIDAR CLIENTE — gera link único para o cliente definir a própria senha
// ============================================================================

const convidarSchema = z.object({
  cliente_id: z.string().uuid(),
});

export type ConvidarClienteState =
  | { ok: true; email: string; nome: string; link: string; expiraEm: string }
  | { ok: false; error: string }
  | undefined;

export async function convidarClienteAction(
  _prev: ConvidarClienteState,
  formData: FormData
): Promise<ConvidarClienteState> {
  const session = await requireAgenciaAdmin();
  const aid = session.profile.agencia_id!;

  const parsed = convidarSchema.safeParse({ cliente_id: formData.get("cliente_id") });
  if (!parsed.success) return { ok: false, error: "Cliente inválido." };

  // 1) Buscar cliente da agência
  const supabase = createClient();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome_empresa, nome_responsavel, email, user_id")
    .eq("id", parsed.data.cliente_id)
    .eq("agencia_id", aid)
    .maybeSingle();

  if (!cliente) return { ok: false, error: "Cliente não encontrado." };
  const c = cliente as Pick<Cliente, "id" | "nome_empresa" | "nome_responsavel" | "email" | "user_id">;

  if (!c.email) {
    return { ok: false, error: "Cadastre um e-mail para o cliente antes de convidá-lo." };
  }

  const admin = createAdminClient();
  let userId = c.user_id;

  // 2) Se cliente ainda não tem user_id, cria agora (primeira vez)
  if (!userId) {
    const senhaTemp = crypto.randomUUID() + Math.random().toString(36);
    const { data: signData, error: signErr } = await admin.auth.admin.createUser({
      email: c.email,
      password: senhaTemp,
      email_confirm: true,
      user_metadata: { nome: c.nome_responsavel, role: "cliente" },
    });

    if (signErr || !signData.user) {
      return { ok: false, error: signErr?.message ?? "Erro ao criar usuário." };
    }
    userId = signData.user.id;

    // 3) Insere em `usuarios` com role=cliente (apenas se não existir)
    const { data: existente } = await admin
      .from("usuarios")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existente) {
      const { error: userErr } = await admin.from("usuarios").insert({
        user_id: userId,
        agencia_id: aid,
        nome: c.nome_responsavel,
        email: c.email,
        role: "cliente",
        ativo: true,
      });
      if (userErr) {
        await admin.auth.admin.deleteUser(userId);
        return { ok: false, error: `Erro ao vincular: ${userErr.message}` };
      }
    }

    // 4) Vincula user_id ao cliente (só se ainda não estiver)
    const { error: linkErr } = await admin
      .from("clientes")
      .update({ user_id: userId })
      .eq("id", c.id)
      .eq("agencia_id", aid);
    if (linkErr) {
      return { ok: false, error: `Erro ao vincular cliente: ${linkErr.message}` };
    }
  }

  // 5) Gera SEMPRE um novo token (permite reenviar o link a qualquer momento)
  const tokenBytes = new Uint8Array(24);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");

  const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: convErr } = await admin.from("convites").insert({
    token,
    cliente_id: c.id,
    agencia_id: aid,
    email: c.email,
    role: "cliente",
    user_id: userId,
    expira_em: expiraEm,
  });
  if (convErr) {
    return { ok: false, error: `Erro ao gerar link: ${convErr.message}` };
  }

  revalidatePath(`/admin/clientes/${c.id}`);
  revalidatePath("/admin/clientes");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://smhub.com.br";
  const link = `${baseUrl}/definir-senha?token=${token}`;

  return {
    ok: true,
    email: c.email,
    nome: c.nome_responsavel,
    link,
    expiraEm: new Date(expiraEm).toLocaleDateString("pt-BR"),
  };
}

// ============================================================================
// DEFINIR SENHA (página pública) — valida token, troca a senha
// ============================================================================

const definirSenhaSchema = z.object({
  token: z.string().min(20),
  nova_senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres."),
});

export type DefinirSenhaState = { error?: string; ok?: boolean } | undefined;

export async function definirSenhaAction(
  _prev: DefinirSenhaState,
  formData: FormData
): Promise<DefinirSenhaState> {
  const parsed = definirSenhaSchema.safeParse({
    token: formData.get("token"),
    nova_senha: formData.get("nova_senha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();

  // 1) Buscar convite pelo token
  const { data: convite } = await admin
    .from("convites")
    .select("id, user_id, expira_em, usado_em, email")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!convite) return { error: "Link inválido ou expirado." };
  if (convite.usado_em) return { error: "Este link já foi utilizado." };
  if (new Date(convite.expira_em) < new Date()) {
    return { error: "Este link expirou. Peça um novo convite à agência." };
  }
  if (!convite.user_id) return { error: "Convite inválido." };

  // 2) Atualizar a senha do user
  const { error: updErr } = await admin.auth.admin.updateUserById(convite.user_id, {
    password: parsed.data.nova_senha,
  });
  if (updErr) return { error: `Erro ao definir senha: ${updErr.message}` };

  // 3) Marcar convite como usado
  await admin.from("convites").update({ usado_em: new Date().toISOString() }).eq("id", convite.id);

  return { ok: true };
}

// ============================================================================
// TROCAR PRÓPRIA SENHA (cliente logado)
// ============================================================================

const trocarSenhaSchema = z.object({
  senha_atual: z.string().min(6, "Senha atual deve ter no mínimo 6 caracteres."),
  nova_senha: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres."),
});

export type TrocarSenhaState = { error?: string; ok?: boolean } | undefined;

export async function trocarMinhaSenhaAction(
  _prev: TrocarSenhaState,
  formData: FormData
): Promise<TrocarSenhaState> {
  const session = await requireCliente();
  const parsed = trocarSenhaSchema.safeParse({
    senha_atual: formData.get("senha_atual"),
    nova_senha: formData.get("nova_senha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();
  const supabase = createClient();

  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email: session.email!,
    password: parsed.data.senha_atual,
  });
  if (loginErr) return { error: "Senha atual incorreta." };

  const { error: updateErr } = await admin.auth.admin.updateUserById(session.id, {
    password: parsed.data.nova_senha,
  });
  if (updateErr) return { error: "Erro ao atualizar senha." };

  return { ok: true };
}

// ============================================================================
// EXCLUIR CLIENTE (hard delete)
// ============================================================================

export async function excluirClienteAction(id: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const admin = createAdminClient();

  // Confirma que o cliente pertence à agência
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, user_id")
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!)
    .maybeSingle();

  if (!cliente) {
    return { error: "Cliente não encontrado." };
  }
  const c = cliente as { id: string; user_id: string | null };

  // Deleta cliente (cascade apaga planejamentos, faturas, etc. via FK).
  // Usa o admin client (service-role, bypassa RLS) porque NÃO existe policy de
  // DELETE em public.clientes — com o client RLS-bound o PostgREST nega o comando.
  // O ownership check acima (select via RLS) já garantiu que o cliente pertence
  // à agência, então o delete scoped por agencia_id aqui é seguro.
  const { error } = await admin
    .from("clientes")
    .delete()
    .eq("id", c.id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: error.message };

  // Apaga o user auth (e o registro em usuarios via cascade)
  if (c.user_id) {
    try {
      await admin.auth.admin.deleteUser(c.user_id);
    } catch {
      // ignora — user pode já ter sido removido
    }
    try {
      await admin.from("usuarios").delete().eq("user_id", c.user_id);
    } catch {
      // ignora
    }
  }

  revalidatePath("/admin/clientes");
  return { ok: true };
}

// ============================================================================
// ATUALIZAR STATUS DO CLIENTE (ativo / inativo / pausado)
// ============================================================================
export type ClienteStatusValue = "ativo" | "inativo" | "pausado";

export async function atualizarClienteStatusAction(
  id: string,
  status: ClienteStatusValue
) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ status })
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: error.message };
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: true };
}

// ============================================================================
// ATUALIZAR CREDENCIAIS DE ACESSO (label/url/usuario/senha/observacao)
// ============================================================================
export type CredencialCliente = {
  label: string;
  url?: string;
  usuario?: string;
  senha?: string;
  observacao?: string;
};

export async function atualizarClienteCredenciaisAction(
  id: string,
  credenciais: CredencialCliente[]
) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  // Sanitiza: cada item precisa ter label não-vazio
  const lista = (credenciais ?? []).filter(
    (c) => c && typeof c.label === "string" && c.label.trim().length > 0
  );
  const { error } = await supabase
    .from("clientes")
    .update({ credenciais: lista as unknown as Record<string, unknown>[] })
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: error.message };
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: true };
}

// ============================================================================
// EXCLUIR MEMBRO DA EQUIPE
// ============================================================================

export async function excluirEquipeAction(id: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const admin = createAdminClient();

  // Busca o membro e garante que pertence à agência + não é admin
  const { data: membro } = await supabase
    .from("usuarios")
    .select("id, user_id, role, agencia_id")
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!)
    .maybeSingle();

  if (!membro) throw new Error("Membro não encontrado.");
  const m = membro as { id: string; user_id: string; role: string; agencia_id: string };

  // Não permite excluir outro admin (apenas desativar)
  if (m.role === "admin_agencia") {
    throw new Error("Não é possível excluir outro admin. Use desativar.");
  }
  // Não permite excluir a si mesmo
  if (m.user_id === session.id) {
    throw new Error("Você não pode excluir a si mesmo.");
  }

  // Apaga da tabela usuarios
  const { error } = await supabase
    .from("usuarios")
    .delete()
    .eq("id", m.id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) throw new Error(error.message);

  // Apaga o user auth
  if (m.user_id) {
    try {
      await admin.auth.admin.deleteUser(m.user_id);
    } catch {
      // ignora
    }
  }

  revalidatePath("/admin/equipe");
  redirect("/admin/equipe");
}

// ============================================================================// APROVAÇÃO DE PLANEJAMENTO — cliente decide, admin responde
// ============================================================================

type DecisaoCliente = "aprovado" | "rejeitado" | "alteracao_solicitada";

/**
 * Cliente (autenticado) aprova, recusa ou pede mudança em uma entrada.
 *
 * Segurança: a action valida que a entrada pertence ao `cliente_id` da sessão
 * antes de gravar. Cliente não consegue mexer em entradas de outros clientes.
 *
 * Se a decisão for `alteracao_solicitada`, o `comentario` é obrigatório
 * (a cliente precisa dizer o que quer mudar).
 */
export async function clienteAprovarEntradaAction(
  entradaId: string,
  decisao: DecisaoCliente,
  comentario?: string
) {
  const session = await requireCliente();
  const supabase = createClient();
  const comentarioLimpo = comentario?.trim() ?? "";
  if (decisao === "alteracao_solicitada" && comentarioLimpo.length === 0) {
    return { error: "Conte o que você quer mudar antes de enviar." };
  }
  // valida propriedade da entrada
  const { data: entrada, error: lookupErr } = await supabase
    .from("planejamento_entradas")
    .select("id, planejamento_id, planejamentos!inner(cliente_id)")
    .eq("id", entradaId)
    .maybeSingle();
  if (lookupErr || !entrada) {
    return { error: "Entrada não encontrada." };
  }
  const clienteIdDaEntrada = (entrada as unknown as {
    planejamentos: { cliente_id: string } | { cliente_id: string }[];
  }).planejamentos;
  const cid = Array.isArray(clienteIdDaEntrada)
    ? clienteIdDaEntrada[0]?.cliente_id
    : clienteIdDaEntrada?.cliente_id;
  if (cid !== session.profile.cliente_id) {
    return { error: "Sem permissão para alterar esta entrada." };
  }
  const { error } = await supabase
    .from("planejamento_entradas")
    .update({
      status: decisao,
      aprovacao_comentario: comentarioLimpo || null,
      aprovado_por: session.id,
      aprovado_em: new Date().toISOString(),
    })
    .eq("id", entradaId);
  if (error) return { error: "Erro ao registrar decisão." };
  revalidatePath("/cliente/planejamento");
  if (cid) revalidatePath(`/admin/clientes/${cid}`);
  return { ok: true };
}

/**
 * Admin da agência responde a uma entrada que estava com `alteracao_solicitada`
 * ou `rejeitado`. Volta o status para `aprovado` ou `pendente` e limpa/atualiza
 * o comentário de feedback.
 */
export async function adminResponderEntradaAction(
  entradaId: string,
  novoStatus: "pendente" | "aprovado",
  comentarioResposta?: string
) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { data: entrada } = await supabase
    .from("planejamento_entradas")
    .select("planejamento_id, planejamentos(cliente_id)")
    .eq("id", entradaId)
    .single();
  // valida que a entrada é da mesma agência
  const cid = (entrada?.planejamentos as unknown as { cliente_id?: string } | null)?.cliente_id;
  if (cid) {
    const { data: cliente } = await supabase
      .from("clientes")
      .select("id")
      .eq("id", cid)
      .eq("agencia_id", session.profile.agencia_id!)
      .maybeSingle();
    if (!cliente) return { error: "Sem permissão." };
  }
  const { error } = await supabase
    .from("planejamento_entradas")
    .update({
      status: novoStatus,
      aprovacao_comentario: comentarioResposta?.trim() || null,
      aprovado_por: session.id,
      aprovado_em: new Date().toISOString(),
    })
    .eq("id", entradaId);
  if (error) return { error: "Erro ao responder." };
  if (cid) {
    revalidatePath(`/admin/clientes/${cid}`);
    revalidatePath(`/cliente/planejamento`);
  }
  return { ok: true };
}
