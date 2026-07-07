"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

type CheckResponse = {
  payment_status: string;
  payment_status_detail: string | null;
  external_reference: string | null;
  transaction_amount: number;
  assinatura_criada: boolean;
  agencia_id: string | null;
  email: string | null;
  signup_token: string | null;
};

const MAX_TENTATIVAS = 20; // ~60s (3s cada)

export function CheckStatusPolling() {
  const router = useRouter();
  const params = useSearchParams();
  const paymentId = params.get("payment_id");
  const externalRef = params.get("external_reference");
  const [tentativas, setTentativas] = useState(0);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const canceladoRef = useRef(false);

  useEffect(() => {
    if (!paymentId) {
      setErro("ID do pagamento não informado. Tente novamente em alguns minutos.");
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (canceladoRef.current) return;
      try {
        const res = await fetch(`/api/mp/check-status?payment_id=${paymentId}`);
        if (res.ok) {
          const data: CheckResponse = await res.json();
          setResult(data);
          if (data.assinatura_criada) {
            // Sucesso: redirecionar
            if (data.signup_token) {
              // Novo cliente: vai para /ativar
              setTimeout(() => {
                router.push(`/ativar?token=${data.signup_token}`);
              }, 1200);
            } else {
              // Renovação: vai para o admin
              setTimeout(() => {
                router.push(`/admin?pagamento=aprovado`);
              }, 1200);
            }
            return;
          }
        }
      } catch (e) {
        // continua tentando
      }
      const t = tentativas + 1;
      setTentativas(t);
      if (t < MAX_TENTATIVAS) {
        timer = setTimeout(tick, 3000);
      }
    };

    tick();
    return () => {
      canceladoRef.current = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  if (erro) {
    return (
      <div className="text-left">
        <p className="text-sm text-warning-400 bg-warning-500/10 border border-warning-500/30 rounded-lg px-3 py-2">
          {erro}
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/login" className="flex-1">
            <Button variant="secondary" className="w-full">Ir para login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (result?.assinatura_criada) {
    return (
      <div>
        <div className="flex items-center justify-center mb-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xl">
            ✓
          </div>
        </div>
        <p className="text-sm text-emerald-400">
          {result.signup_token
            ? "Conta criada! Redirecionando para ativação..."
            : "Assinatura renovada! Redirecionando para o painel..."}
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <Spinner className="mx-auto mb-3" />
      <p className="text-xs text-slate-500">
        Confirmando pagamento... (tentativa {tentativas + 1}/{MAX_TENTATIVAS})
      </p>
    </div>
  );
}
