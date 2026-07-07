"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Send } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SignaturePad, type SignaturePadHandle } from "@/components/contracts/SignaturePad";
import {
  assinarContratoPublicoAction,
  type AssinarPublicoState,
} from "@/lib/actions/contrato-actions";

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      loading={pending}
      disabled={disabled}
      iconLeft={<Send className="h-4 w-4" />}
    >
      {pending ? "Registrando assinatura..." : "Confirmar e assinar"}
    </Button>
  );
}

export function AssinarPublicoForm({ token }: { token: string }) {
  const [state, action] = useFormState<AssinarPublicoState, FormData>(
    assinarContratoPublicoAction,
    undefined
  );
  const sigRef = useRef<SignaturePadHandle>(null);
  const [nome, setNome] = useState("");
  const [hasInk, setHasInk] = useState(false);

  // Após sucesso, mostra tela de confirmação
  if (state && "ok" in state && state.ok) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex h-14 w-14 rounded-full bg-emerald-500/15 items-center justify-center mb-3">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Assinatura registrada!</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Sua assinatura digital foi registrada com sucesso. A agência será notificada
          e o contrato seguirá o fluxo normal.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input
        type="hidden"
        name="signature_data_url"
        value={hasInk && sigRef.current ? (sigRef.current.getDataURL() ?? "") : ""}
      />

      {state && "error" in state && state.error && (
        <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div>
        <label className="label">Seu nome completo *</label>
        <Input
          name="nome"
          required
          minLength={2}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como aparece no documento"
        />
      </div>

      <SignaturePad
        ref={sigRef}
        onChange={(d) => setHasInk(d != null)}
      />

      <div className="text-[11px] text-slate-500">
        Ao clicar em <strong>Confirmar e assinar</strong>, declaro que li, compreendi
        e aceito todos os termos do contrato acima.
      </div>

      <div className="pt-2 flex justify-end">
        <SubmitButton disabled={!nome || !hasInk} />
      </div>
    </form>
  );
}
