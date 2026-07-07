-- Adiciona data_pagamento em faturas (preenchida quando status = 'pago').
-- Antes a action atualizarFaturaStatusAction tentava gravar essa coluna
-- inexistente e o PostgREST devolvia "Could not find the 'data_pagamento'
-- column of 'faturas' in the schema cache".
alter table public.faturas
  add column if not exists data_pagamento date;

comment on column public.faturas.data_pagamento is 'Data em que a fatura foi marcada como paga (null se ainda pendente/atrasada)';

-- A policy de update existente (faturas_update_agencia) já cobre a coluna nova.