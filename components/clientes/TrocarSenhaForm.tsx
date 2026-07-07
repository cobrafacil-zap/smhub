"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { trocarMinhaSenhaAction, type TrocarSenhaState } from "@/lib/actions/cliente-convite-actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Salvar nova senha
    </Button>
  );
}

export function TrocarSenhaForm() {
  const [state, action] = useFormState<TrocarSenhaState, FormData>(trocarMinhaSenhaAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  if (state?.ok) {
    setTimeout(() => formRef.current?.reset(), 100);
  }

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="senha_atual">Senha atual</label>
        <Input id="senha_atual" name="senha_atual" type="password" required minLength={6} />
      </div>
      <div>
        <label className="label" htmlFor="nova_senha">Nova senha</label>
        <Input id="nova_senha" name="nova_senha" type="password" required minLength={6} />
      </div>
      {state?.error && (
        <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          Senha alterada com sucesso.
        </p>
      )}
      <SubmitBtn />
    </form>
  );
}
