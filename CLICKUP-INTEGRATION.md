# Integração de leads

Os próximos envios usam `custom_fields` na mesma requisição POST de criação da tarefa, preservando título e descrição. Não há migração ou recriação dos leads anteriores. O status continua sendo o padrão da lista; nenhum status, responsável ou propriedade adicional é imposto.

`CLICKUP_API_TOKEN` continua exclusivamente no servidor. O destino continua sendo exclusivamente a configuração existente de `CLICKUP_LIST_ID`, já validada pelo usuário. Não há novo ID padrão. IDs ficam como strings para evitar perda de precisão. A resolução de IDs de visualização para lista também permanece como antes.

## Destino existente

O usuário confirmou que o destino anterior já estava validado. A consulta pelo conector desta sessão não verifica a configuração usada pelo servidor e não justifica mudar o destino. A configuração anterior foi preservada. Nenhum card real foi criado nos testes; a gravação dos novos campos ainda não foi validada na API real.

## Mapeamento

`clickup-fields.json` contém os IDs informados e os rótulos exatos. `clickup-lead.js` aplica o mapeamento. Outra situação e as três situações de terreno sem opção correspondente ficam na descrição e geram pendências na descrição e nos logs do servidor. Não são usadas opções aproximadas.

Fontes de renda inconsistentes preservam o texto e omitem a classificação Sim/Não. Idade inválida e telefone não normalizável são omitidos dos respectivos campos e registrados como pendências. Dados originais de contato e respostas continuam na descrição, assim como origem, data, UTMs, fbclid e diagnostic_session_id.

## Conferência

Após criar, o servidor compara os campos retornados com os enviados, incluindo valores de dropdown devolvidos como índices. Se necessário, faz GET da tarefa para conferir os valores efetivamente salvos. Essa conferência é diagnóstica: o sucesso da criação retorna 201 independentemente de `verified`.

Se a criação teve sucesso mas os campos não puderam ser confirmados, retorna 201 com `ok: true`, `created: true` e `verified: false`. A página conclui o formulário e dispara `lead_created` normalmente quando a resposta contém os IDs da tarefa e do evento, preservando a regra original de rastreamento. O servidor registra a pendência para conferência manual. Se a resposta de criação não fornecer um ID legível, o formulário ainda conclui, mas o rastreamento mantém sua regra original de não emitir conversão sem identificação. Não há repetição automática de criação ou alteração de tarefas existentes.

## Testes locais

Executar `node tests/clickup-fields.cjs`, `node tests/tracking-mvp.cjs` e `node tests/construidas-integration.cjs`. São testes isolados, sem acesso à API real.
