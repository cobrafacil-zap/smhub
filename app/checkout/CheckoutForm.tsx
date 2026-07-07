"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import type { Plano } from "@/types/database";

export function CheckoutForm({
  plano,
  isRenovacao,
  initialEmail,
  initialNome,
}: {
  plano: Plano;
  isRenovacao: boolean;
  initialEmail: string;
  initialNome: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: {
      plano: Plano;
      dados?: { nome: string; email: string; telefone?: string; nomeAgencia: string };
    } = { plano };
    if (!isRenovacao) {
      payload.dados = {
        nome: String(fd.get("nome") ?? ""),
        email: String(fd.get("email") ?? ""),
        telefone: String(fd.get("telefone") ?? "") || undefined,
        nomeAgencia: String(fd.get("nomeAgencia") ?? ""),
      };
    }

    startTransition(async () => {
      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao iniciar pagamento.");
        return;
      }
      if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        setError("Resposta inválida do servidor.");
      }
    });
  };

  if (isRenovacao) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-slate-300">
          Ao continuar, você será redirecionado para o Mercado Pago para concluir o pagamento.
          A plataforma é liberada automaticamente em alguns segundos após a aprovação.
        </p>
        {error && (
          <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={pending} className="w-full">
          Ir para pagamento
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="nome">Seu nome</label>
        <Input
          id="nome"
          name="nome"
          required
          minLength={2}
          defaultValue={initialNome}
          placeholder="Maria Silva"
        />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={initialEmail}
          placeholder="voce@suaagencia.com.br"
        />
      </div>
      <div>
        <label className="label" htmlFor="telefone">Telefone (opcional)</label>
        <Input
          id="telefone"
          name="telefone"
          type="tel"
          placeholder="(11) 99999-9999"
        />
      </div>
      <div>
        <label className="label" htmlFor="nomeAgencia">Nome da agência</label>
        <Input
          id="nomeAgencia"
          name="nomeAgencia"
          required
          minLength={2}
          placeholder="Agência Exemplo"
        />
      </div>
      {error && (
        <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="w-full">
        {pending ? "Redirecionando..." : "Continuar para pagamento"}
      </Button>
      <p className="text-xs text-slate-500 text-center">
        Ao continuar, você concorda com nossos termos de uso.
      </p>
    </form>
  );
}
