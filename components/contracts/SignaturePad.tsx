"use client";

import { useRef, useState, useImperativeHandle, forwardRef, type ForwardedRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/Button";
import { Eraser, Check } from "lucide-react";

export interface SignaturePadHandle {
  /** Retorna a assinatura em data URL (PNG). */
  getDataURL(): string | null;
  /** Verifica se algo foi desenhado. */
  isEmpty(): boolean;
  /** Limpa a assinatura. */
  clear(): void;
}

interface SignaturePadProps {
  onChange?: (dataUrl: string | null) => void;
  height?: number;
  label?: string;
}

/**
 * Componente de assinatura digital.
 * Use a ref para acessar getDataURL() e submeter via server action.
 */
export const SignaturePad = forwardRef(function SignaturePad(
  { onChange, height = 180, label = "Assine abaixo" }: SignaturePadProps,
  ref: ForwardedRef<SignaturePadHandle>
) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useImperativeHandle(ref, () => ({
    getDataURL: () => (sigRef.current?.isEmpty() ? null : sigRef.current?.toDataURL("image/png") ?? null),
    isEmpty: () => sigRef.current?.isEmpty() ?? true,
    clear: () => {
      sigRef.current?.clear();
      setHasInk(false);
      onChange?.(null);
    },
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="label !mb-0">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            sigRef.current?.clear();
            setHasInk(false);
            onChange?.(null);
          }}
          iconLeft={<Eraser className="h-3.5 w-3.5" />}
        >
          Limpar
        </Button>
      </div>
      <div
        className="rounded-lg border border-border bg-bg-elevated overflow-hidden"
        style={{ height }}
      >
        <SignatureCanvas
          ref={(r) => {
            sigRef.current = r;
          }}
          canvasProps={{
            className: "w-full h-full",
            "aria-label": "Área de assinatura",
          }}
          onEnd={() => {
            setHasInk(!sigRef.current?.isEmpty());
            onChange?.(sigRef.current?.toDataURL("image/png") ?? null);
          }}
          penColor="#3D5AFE"
        />
      </div>
      {hasInk && (
        <p className="text-xs text-success-400 inline-flex items-center gap-1">
          <Check className="h-3 w-3" />
          Assinatura capturada
        </p>
      )}
    </div>
  );
});
