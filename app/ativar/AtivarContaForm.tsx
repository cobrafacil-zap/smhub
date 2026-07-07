"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ativarContaAction } from "@/lib/actions/ativar-conta-actions";

export function AtivarContaForm({
  token,
  email,
  nomeInicial,
  nomeAgenciaInicial,
}: {
  token: string;
  email: string;
  nomeInicial: string;
  nomeAgenciaInicial: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<{ error?: string; ok?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await ativarContaAction({
        token,
        nome: String(fd.get("nome") ?? ""),
        nomeAgencia: String(fd.get("nomeAgencia") ?? ""),
        senha: String(fd.get("senha") ?? ""),
      });
      setState(result ?? null);
      if (result?.ok) {
        // Redireciona para o login com email pré-preenchido.
        setTimeout(() => router.push(`/login?email=${encodeURIComponent(email)}`), 1500);
      }
    });
  };

  if (state?.ok) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          ✓ Conta ativada! Redirecionando para o login...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">E-mail</label>
        <Input value={email} disabled className="opacity-70" />
      </div>
      <div>
        <label className="label" htmlFor="nome">Seu nome</label>
        <Input id="nome" name="nome" defaultValue={nomeInicial} required minLength={2} />
      </div>
      <div>
        <label className="label" htmlFor="nomeAgencia">Nome da agência</label>
        <Input
          id="nomeAgencia"
          name="nomeAgencia"
          defaultValue={nomeAgenciaInicial}
          required
          minLength={2}
        />
      </div>
      <div>
        <label className="label" htmlFor="senha">Defina sua senha</label>
        <Input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          autoFocus
        />
      </div>
      {state?.error && (
        <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending} className="w-full" size="lg">
        Ativar conta
      </Button>
    </form>
  );
}
