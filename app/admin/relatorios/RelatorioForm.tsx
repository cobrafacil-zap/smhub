import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PLATAFORMA_LABELS } from "@/lib/constants";
import type { Cliente, Relatorio } from "@/types/database";

type FormAction = (formData: FormData) => void | Promise<void>;

interface RelatorioFormProps {
  /** Server action que recebe o formData (criar ou atualizar). */
  action: FormAction;
  clientes: Pick<Cliente, "id" | "nome_empresa">[];
  /** Relatório existente (pra editar) — preenche defaults. */
  initial?: Partial<Relatorio>;
  /** Label/rota do botão Voltar. */
  backHref?: string;
  submitLabel?: string;
}

/**
 * Formulário compartilhado de relatório (criar/editar). Server component:
 * usa `action` (server action) e `defaultValue` pra pré-preencher no edit.
 */
export function RelatorioForm({
  action,
  clientes,
  initial,
  backHref = "/admin/relatorios",
  submitLabel = "Salvar relatório",
}: RelatorioFormProps) {
  const num = (v: number | string | null | undefined, d = 0) =>
    v === null || v === undefined || v === "" ? String(d) : String(v);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Cliente *</label>
          <select
            name="cliente_id"
            className="input"
            required
            defaultValue={initial?.cliente_id ?? ""}
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome_empresa}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Mês de referência *</label>
          <input
            name="mes_referencia"
            type="date"
            className="input"
            required
            defaultValue={initial?.mes_referencia ? initial.mes_referencia.slice(0, 10) : ""}
          />
        </div>
        <div>
          <label className="label">Plataforma *</label>
          <select
            name="plataforma"
            className="input"
            required
            defaultValue={initial?.plataforma ?? "instagram"}
          >
            {Object.entries(PLATAFORMA_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Seguidores (início do mês)</label>
          <input name="seguidores_inicio" type="number" min="0" className="input" defaultValue={num(initial?.seguidores_inicio)} />
        </div>
        <div>
          <label className="label">Seguidores (fim do mês)</label>
          <input name="seguidores_fim" type="number" min="0" className="input" defaultValue={num(initial?.seguidores_fim)} />
        </div>
        <div>
          <label className="label">Alcance total</label>
          <input name="alcance_total" type="number" min="0" className="input" defaultValue={num(initial?.alcance_total)} />
        </div>
        <div>
          <label className="label">Impressões</label>
          <input name="impressoes" type="number" min="0" className="input" defaultValue={num(initial?.impressoes)} />
        </div>
        <div>
          <label className="label">Total de posts</label>
          <input name="total_posts" type="number" min="0" className="input" defaultValue={num(initial?.total_posts)} />
        </div>
        <div>
          <label className="label">Total de reels</label>
          <input name="total_reels" type="number" min="0" className="input" defaultValue={num(initial?.total_reels)} />
        </div>
        <div>
          <label className="label">Total de stories</label>
          <input name="total_stories" type="number" min="0" className="input" defaultValue={num(initial?.total_stories)} />
        </div>
        <div>
          <label className="label">Total de curtidas</label>
          <input name="total_curtidas" type="number" min="0" className="input" defaultValue={num(initial?.total_curtidas)} />
        </div>
        <div>
          <label className="label">Leads validados</label>
          <input name="leads_validados" type="number" min="0" className="input" defaultValue={num(initial?.leads_validados)} />
        </div>
        <div>
          <label className="label">Investimento em ads (R$)</label>
          <input name="investimento_ads" type="number" min="0" step="0.01" className="input" defaultValue={num(initial?.investimento_ads)} />
        </div>
        <div>
          <label className="label">Receita gerada (R$)</label>
          <input name="receita_gerada" type="number" min="0" step="0.01" className="input" defaultValue={num(initial?.receita_gerada)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Observações</label>
          <textarea name="observacoes" className="input min-h-[100px]" defaultValue={initial?.observacoes ?? ""} />
        </div>
      </div>
      <div className="pt-3 border-t border-border flex justify-end gap-2">
        <Link href={backHref}>
          <Button type="button" variant="ghost">Cancelar</Button>
        </Link>
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}