"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Upload } from "lucide-react";
import { importarDatasCsvAction } from "@/lib/actions/agencia-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type State = { ok?: boolean; count?: number; erros?: number; error?: string } | undefined;

export function ImportarDatasForm() {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, formAction] = useFormState(importarDatasCsvAction, undefined);
  const prev = useRef<State>(undefined);

  useEffect(() => {
    if (state === prev.current) return;
    prev.current = state;
    if (!state) return;
    if (state.error) {
      toast.error(state.error);
    } else if (state.ok) {
      toast.success(
        `${state.count ?? 0} data(s) importada(s).${state.erros ? ` ${state.erros} linha(s) ignorada(s).` : ""}`
      );
      setFileName(null);
      ref.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileName(e.target.files?.[0]?.name ?? null);
  }

  return (
    <form ref={ref} action={formAction} className="flex items-center gap-2 flex-wrap">
      <label className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-slate-200 hover:bg-bg-muted cursor-pointer">
        <Upload className="h-3.5 w-3.5" />
        {fileName ?? "Escolher CSV"}
        <input
          type="file"
          name="arquivo"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onChange}
          required
        />
      </label>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-royal-500 hover:bg-royal-600 text-white"
      >
        Importar
      </button>
    </form>
  );
}