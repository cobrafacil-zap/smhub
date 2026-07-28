# Plano: unificar cores do SM Hub (landing + painéis)

## Contexto

O SM Hub já possui um design system baseado em tokens CSS (`app/globals.css`) e classes utilitárias (`tailwind.config.ts`). Hoje:

- O tema padrão é **escuro** (`defaultTheme="dark"`).
- Tokens `bg`, `bg-surface`, `bg-elevated`, `border`, `slate-*` e `royal-*` já alternam entre claro e escuro.
- A landing page (`app/page.tsx`) e os componentes de landing (`components/landing/*`) já usam esses tokens, mas ainda carregam um visual predominantemente escuro, com acentos forçados em `slate-100`/`slate-300` que funcionam bem no dark, mas podem perder contraste/lavanda no claro.
- O painel admin, portal do cliente e páginas de auth já herdam o tema, mas também têm pontos hard-coded.

## Objetivo

Aplicar uma paleta **mais roxa/lavanda e neon** em todo o site, garantindo que **todas as visões** — landing page, painel admin, portal do cliente, login, checkout e super-admin — fiquem consistentes nos temas **claro e escuro**.

## Decisões de design (validadas com o solicitante)

1. **Dois temas ativos:** claro + escuro em todo o site. O toggle no `Topbar`/`ThemeToggle` continua funcionando.
2. **Paleta mais roxa:** aumentar a presença de lavanda e violeta nos acentos, cards ativos, badges e gradientes, mantendo legibilidade.
3. **Prioridade:** landing page primeiro, depois painéis internos (admin, cliente, super-admin, auth).
4. **Sem "bug específico":** foco em alinhamento visual geral, não em correção pontual.

## Mudanças propostas no design system

### 1. `tailwind.config.ts` — estender a escala `royal` e `navy`

- Adicionar tons mais abertos/lavanda (`royal-150`, `royal-250`) e tons profundos (`royal-800`, `royal-900`) para uso em fundos roxos.
- Revisar `navy-950` para evitar conflito com `royal-950` (#0A1A40) e criar uma escala navy mais fria.
- Ajustar `gradient-royal` e `gradient-royal-soft` para incluir lavanda (`#8B5CF6` / `#A78BFA`) além do royal azulado.
- Atualizar `backgroundImage` e `boxShadow.glow` para refletir o tom roxo.

### 2. `app/globals.css` — tokens de tema

#### Modo claro

- Manter fundo branco/cinza claro (`--bg: #F8FAFC`, `--bg-surface: #FFFFFF`).
- Tornar o **acento primário mais lavanda** nos textos/ícones:
  - `--royal-200`: `#7C3AED` (violet-600) para badges/ícones de destaque.
  - `--royal-300`: `#6D28D9` (violet-700) para eyebrows/links.
  - `--royal-400`: `#5B21B6` (violet-800).
- Ajustar sombras para tons roxos sutis (`rgba(124, 58, 214, 0.08)`).
- Card: manter borda `border/60`, mas no hover ganhar glow violeta suave.

#### Modo escuro

- Fundo: `#0B0F19` (mantido).
- Surface: `#111622` (mantido).
- Elevated: `#171D2C` → levemente mais quente/lavanda (`#1A1E2E`).
- Acentos royal no dark mais neon/lavanda:
  - `--royal-200`: `#A78BFA` (violet-400).
  - `--royal-300`: `#8B5CF6` (violet-500).
  - `--royal-400`: `#7C3AED` (violet-600).
- Sombras mais roxas (`rgba(139, 92, 246, 0.25)`).
- Gradientes e glows passam de azul royal puro para violeta-royal.

### 3. Componentes base

- `Button`: manter gradiente primary, mas incluir transição violeta no hover (`from-violet-500 to-royal-700`).
- `Card`: reforçar `card-hover` com borda violeta e glow.
- `Badge`: variant `brand` mais lavanda; adicionar variant `purple`.
- `Topbar`/`Sidebar`: itens ativos com fundo lavanda transparente (`bg-royal-500/15` → `bg-violet-500/15`) e texto violeta claro.

### 4. Landing page (`app/page.tsx` + `components/landing/*`)

- Hero: título e gradiente `from-violet-300 via-royal-400 to-violet-500`.
- Stats cards: ícones e números em violeta/lavanda; hover com glow roxo.
- FeaturesTimeline: linha neon violeta; cards ativos com sombra violeta.
- FAQ/CTA: bordas e acentos violeta.
- Hero3D/WebGL: ajustar cores das partículas/luzes para violeta/lavanda no escuro e royal no claro.
- Garantir legibilidade no tema claro: textos de seções que hoje usam `text-slate-300`/`text-slate-400` devem continuar legíveis sobre fundo branco (os tokens já fazem isso, mas revisar componentes que forçam cores).

## Estratégia de rollout

### Fase 1 — Landing page (entrega inicial)

1. Ajustar tokens em `globals.css` para claro/escuro mais roxo.
2. Atualizar `tailwind.config.ts` com novos tons royal/violeta.
3. Refatorar `app/page.tsx`: substituir cores hard-coded por tokens/classes do design system.
4. Revisar componentes de landing:
   - `FeaturesTimeline.tsx`
   - `StepsSection.tsx`
   - `InteractiveShowcase.tsx`
   - `EcossistemaMarquee.tsx`
   - `Hero3D.tsx`
   - `HeroStars.tsx`
5. Testar toggle claro/escuro na LP.

### Fase 2 — Painéis internos

1. Revisar `components/layout/*` (Topbar, SidebarAdmin, SidebarClient, SidebarSuperAdmin, BottomNav).
2. Revisar componentes compartilhados: `Button`, `Card`, `Badge`, `Input`, tabelas, calendário, modais.
3. Auditar páginas de auth (`app/login`, `app/definir-senha`, `app/ativar`), checkout (`app/checkout/*`) e contratos (`app/assinar-contrato`).
4. Garantir que nenhum componente force `text-white` ou `bg-black` sem considerar o tema.

### Fase 3 — QA e ajustes finos

1. Verificar contraste WCAG 2.1 AA nos botões primários e badges.
2. Testar em mobile (BottomNav, cards, tabelas).
3. Revisar impressão (`@media print`) para garantir que cores forçadas não quebrem.
4. Validar PWA / theme-color (`metadata viewport.themeColor`) de acordo com tema ativo.

## Arquivos principais que serão alterados

- `tailwind.config.ts`
- `app/globals.css`
- `app/layout.tsx` (theme-color dinâmico, opcional)
- `app/page.tsx`
- `components/landing/*.tsx`
- `components/ui/Button.tsx`
- `components/ui/Card.tsx`
- `components/ui/Badge.tsx`
- `components/layout/Topbar.tsx`
- `components/layout/SidebarAdmin.tsx`
- `components/layout/SidebarClient.tsx`
- `components/layout/SidebarSuperAdmin.tsx`
- `components/layout/ThemeToggle.tsx`

## Testes / validação

- Alternar tema claro/escuro em cada página modificada.
- Verificar contraste de textos e botões.
- Confirmar que a LP renderiza corretamente em SSR com `ThemeProvider`.
- Rodar `npm run build` para garantir que não há erros de TypeScript/CSS.

## Entregáveis

1. PR/fase com a landing page totalmente adaptada aos novos tokens roxos + tema claro/escuro.
2. PR/fase com painéis internos revisados.
3. Documento curto de tokens atualizado (pode ser um comentário no `globals.css`).

## Próximo passo imediato

Assim que aprovado, iniciar a Fase 1 ajustando `globals.css` + `tailwind.config.ts` e depois a landing page.
