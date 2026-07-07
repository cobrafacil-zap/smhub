"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { definirSenhaAction, type DefinirSenhaState } from "@/lib/actions/cliente-convite-actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full" size="lg">
      Definir senha e entrar
    </Button>
  );
}

export function DefinirSenhaForm({ token }: { token: string }) {
  const [state, action] = useFormState<DefinirSenhaState, FormData>(
    definirSenhaAction,
    undefined
  );

  if (state?.ok) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          ✓ Senha definida com sucesso! Agora faça login.
        </p>
        <Link
          href="/login"
          className="block w-full text-center bg-royal-500 hover:bg-royal-600 text-white font-medium rounded-lg py-2.5"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="nova_senha">Nova senha</label>
        <Input
          id="nova_senha"
          name="nova_senha"
          type="password"
          required
          minLength={6}
          autoFocus
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      <SubmitBtn />
    </form>
  );
}
