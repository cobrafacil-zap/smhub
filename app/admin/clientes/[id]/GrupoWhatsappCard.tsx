"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MessageCircle, RefreshCw, Save } from "lucide-react";
import {
  salvarGrupoWhatsappAction,
  listarWhatsappGruposAction,
} from "@/lib/actions/whatsapp-actions";
import { toast } from "@/components/ui/Toast";

interface Grupo {
  jid: string;
  nome: string;
  participantes?: number;
}

/** Grupo de WhatsApp do cliente — JID (@g.us) usado no envio de relatórios. */
export function GrupoWhatsappCard({
  clienteId,
  initialJid,
}: {
  clienteId: string;
  initialJid: string | null;
}) {
  const [jid, setJid] = useState(initialJid ?? "");
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [saving, startSaving] = useTransition();
  const [loading, startLoading] = useTransition();

  function onSalvar() {
    const fd = new FormData();
    fd.set("cliente_id", clienteId);
    fd.set("jid", jid.trim());
    startSaving(async () => {
      const res = await salvarGrupoWhatsappAction(fd);
      if (res?.error) toast.error(res.error);
      else toast.success("Grupo do WhatsApp salvo!");
    });
  }

  function onListar() {
    startLoading(async () => {
      const res = await listarWhatsappGruposAction();
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if ("grupos" in res && res.grupos) {
        setGrupos(res.grupos);
        if (res.grupos.length === 0) toast.success("Nenhum grupo encontrado na instância.");
      }
    });
  }

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-1">
        <MessageCircle className="h-4 w-4 text-royal-300" />
        Grupo do WhatsApp
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        Relatórios com IA são enviados para este grupo. Conecte a instância em{" "}
        <span className="text-slate-200 font-medium">Configurações → WhatsApp</span> e
        cole o JID (termina com <code className="text-royal-300">@g.us</code>).
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            value={jid}
            onChange={(e) => setJid(e.target.value)}
            placeholder="1203630...@g.us"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onListar}
            loading={loading}
            iconLeft={<RefreshCw className="h-4 w-4" />}
          >
            Buscar grupos
          </Button>
          <Button
            type="button"
            onClick={onSalvar}
            loading={saving}
            iconLeft={<Save className="h-4 w-4" />}
          >
            Salvar
          </Button>
        </div>
      </div>
      {grupos && grupos.length > 0 && (
        <ul className="mt-3 space-y-1 max-h-48 overflow-y-auto">
          {grupos.map((g) => (
            <li key={g.jid}>
              <button
                type="button"
                onClick={() => setJid(g.jid)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors hover-row ${
                  jid === g.jid
                    ? "border-royal-500/50 bg-royal-500/10 text-slate-100"
                    : "border-border bg-bg-elevated/30 text-slate-200"
                }`}
              >
                <span className="font-medium">{g.nome}</span>
                {g.participantes != null && (
                  <span className="text-slate-500"> · {g.participantes} participantes</span>
                )}
                <span className="block text-xs text-slate-500 truncate">{g.jid}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
