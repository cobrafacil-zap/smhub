"use client";

import { useState } from "react";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, FileSignature } from "lucide-react";
import { useRef } from "react";
import { toast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface ContractSignerProps {
  contratoId: string;
  /** Já está assinado? */
  alreadySigned?: boolean;
  /** Action de assinatura. */
  onSign: (signatureDataUrl: string) => Promise<{ error?: string; ok?: boolean }>;
}

export function ContractSigner({ contratoId, alreadySigned, onSign }: ContractSignerProps) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [signing, setSigning] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const router = useRouter();

  async function handleSign() {
    if (!accepted) {
      toast.error("Confirme que leu e concorda com os termos.");
      return;
    }
    const dataUrl = padRef.current?.getDataURL() ?? null;
    if (!dataUrl) {
      toast.error("Faça a assinatura antes de enviar.");
      return;
    }
    setSigning(true);
    const res = await onSign(dataUrl);
    setSigning(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Contrato assinado com sucesso!");
    router.refresh();
  }

  if (alreadySigned) {
    return (
      <div className="card border-success-500/30 bg-success-500/5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-success-400 shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-100">Contrato assinado</h3>
            <p className="text-sm text-slate-400 mt-1">
              Sua assinatura foi registrada com sucesso, com data, IP e hash de
              autenticidade. Você pode baixar o PDF do contrato no botão acima.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-4">
        <FileSignature className="h-5 w-5 text-royal-300 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-slate-100">Assinatura digital</h3>
          <p className="text-sm text-slate-400 mt-1">
            Ao assinar, você declara estar de acordo com todos os termos deste
            contrato. Sua assinatura será registrada com data, IP, navegador e
            hash de integridade para fins de auditoria.
          </p>
        </div>
      </div>
      <SignaturePad ref={padRef} label="Assinatura do cliente" />
      <label className="flex items-start gap-2 mt-4 text-sm text-slate-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border bg-bg-elevated text-royal-500 focus:ring-royal-500/40"
        />
        <span>Li, compreendi e concordo com todos os termos deste contrato.</span>
      </label>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSign} loading={signing} disabled={!accepted}>
          Assinar contrato
        </Button>
      </div>
    </div>
  );
}
