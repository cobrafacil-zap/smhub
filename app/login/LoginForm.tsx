"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, type ActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full" size="lg">
      Entrar
    </Button>
  );
}

export function LoginForm({ next, email }: { next?: string; email?: string }) {
  const [state, action] = useFormState<ActionState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="label">
          E-mail
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={email}
          placeholder="seu@email.com"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="label">
            Senha
          </label>
          <Link
            href="/login"
            className="text-xs text-royal-400 hover:text-royal-300"
          >
            Esqueci a senha
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
