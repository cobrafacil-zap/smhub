import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL ?? "noreply@smhub.com.br";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Se RESEND_API_KEY não estiver configurada, usa console.log como fallback
 * (útil em dev). Em produção é obrigatório.
 */
const resend = apiKey ? new Resend(apiKey) : null;

export type EmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: EmailParams) {
  if (!resend) {
    // Dev fallback
    console.info("[email:dev] to=", to, "subject=", subject);
    console.info("[email:dev] html length=", html.length);
    return { ok: true, dev: true };
  }
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ""),
  });
  if (error) {
    console.error("[email] erro ao enviar:", error);
    return { ok: false, error };
  }
  return { ok: true, id: data?.id };
}

export function emailBoasVindas(nome: string) {
  return {
    subject: "Bem-vindo à SM Hub!",
    html: `
      <h1 style="font-family:Inter,sans-serif;color:#0A1A40;">Olá, ${nome}!</h1>
      <p>Sua agência foi cadastrada com sucesso na SM Hub.</p>
      <p>Você tem <strong>14 dias de trial gratuito</strong> para experimentar todos os recursos.</p>
      <p><a href="${appUrl}/admin" style="display:inline-block;background:#3D5AFE;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Acessar painel</a></p>
    `,
  };
}

export function emailFatura({
  clienteNome,
  valor,
  vencimento,
  numero,
  link,
}: {
  clienteNome: string;
  valor: number;
  vencimento: string;
  numero: string;
  link?: string;
}) {
  return {
    subject: `Fatura ${numero} — ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor)}`,
    html: `
      <h1 style="font-family:Inter,sans-serif;color:#0A1A40;">Olá, ${clienteNome}!</h1>
      <p>Uma nova fatura foi gerada para você.</p>
      <ul>
        <li><strong>Número:</strong> ${numero}</li>
        <li><strong>Valor:</strong> ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor)}</li>
        <li><strong>Vencimento:</strong> ${vencimento}</li>
      </ul>
      ${link ? `<p><a href="${link}" style="display:inline-block;background:#3D5AFE;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Ver fatura</a></p>` : ""}
    `,
  };
}

export function emailContrato({
  clienteNome,
  titulo,
  link,
}: {
  clienteNome: string;
  titulo: string;
  link: string;
}) {
  return {
    subject: `Contrato disponível para assinatura — ${titulo}`,
    html: `
      <h1 style="font-family:Inter,sans-serif;color:#0A1A40;">Olá, ${clienteNome}!</h1>
      <p>Há um novo contrato disponível para sua assinatura: <strong>${titulo}</strong>.</p>
      <p><a href="${link}" style="display:inline-block;background:#3D5AFE;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Visualizar e assinar</a></p>
      <p style="color:#64748b;font-size:12px;">A assinatura é registrada com data, IP e hash para sua segurança.</p>
    `,
  };
}

export function emailBoasVindasPlataforma({
  nome,
  nomeAgencia,
  link,
}: {
  nome: string;
  nomeAgencia: string;
  link: string;
}) {
  return {
    subject: `Bem-vindo à SM Hub — defina sua senha`,
    html: `
      <h1 style="font-family:Inter,sans-serif;color:#0A1A40;">Olá, ${nome}!</h1>
      <p>Recebemos o pagamento da assinatura do plano <strong>SM Hub</strong> para a agência <strong>${nomeAgencia}</strong>.</p>
      <p>Para começar a usar a plataforma, defina sua senha de acesso pelo link abaixo:</p>
      <p><a href="${link}" style="display:inline-block;background:#3D5AFE;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Definir minha senha</a></p>
      <p>Você tem <strong>7 dias grátis</strong> de trial para experimentar todos os recursos antes da primeira cobrança.</p>
      <p style="color:#64748b;font-size:12px;">O link expira em 7 dias. Se precisar de um novo, entre em contato com o suporte.</p>
    `,
  };
}

export function emailPagamentoAprovado({
  nome,
  valor,
  link,
}: {
  nome: string;
  valor: number;
  link: string;
}) {
  return {
    subject: `Pagamento aprovado — SM Hub`,
    html: `
      <h1 style="font-family:Inter,sans-serif;color:#0A1A40;">Olá, ${nome}!</h1>
      <p>Confirmamos o pagamento da sua assinatura no valor de <strong>${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor)}</strong>.</p>
      <p>Sua plataforma está liberada por mais 30 dias. Agradecemos a confiança!</p>
      <p><a href="${link}" style="display:inline-block;background:#3D5AFE;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Acessar painel</a></p>
    `,
  };
}
