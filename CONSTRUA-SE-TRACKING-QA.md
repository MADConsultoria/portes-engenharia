# Relatório de implementação — 31/10/2026

## 1. [EVIDÊNCIA] Auditoria executada antes das alterações

LP estática Vite 7 / JavaScript / Three.js, sem SSR ou hidratação. Fonte em
`construidas-src/`; build em `construidas/`. `_server.js` serve os arquivos sem
compor layouts. `/construidas` redireciona para `/construidas/` preservando query.
Dockerfile usa Node 22 e os arquivos compilados; não executa build no deploy.

GTM-TD97LTRC encontrado em `index.html` e `analise/index.html`, sem herança pela
LP. Nenhum GTM/GA4/Meta, CMP, gestão de escolha ou política de privacidade
encontrado na LP. `_server.js` não configura CSP. Fontes Google são recursos
externos já existentes. CSP de proxy, extensões e consentimento no workspace
externo não foram inspecionados. Home e análise não foram editadas.

Elementos reais: hero `.hero a[href="#convite"]`; menu `.header nav` com encontro,
jornada e convite; marcas de início no header e footer; botão final `#signup`
com URL Sympla já autorizada pelo usuário. O menu de convite é classificado como
navegação, sem evento CTA adicional. Não existe outro CTA interno final.
Cinco âncoras `.stage-nav`, setas, swipe horizontal e teclas no carrossel móvel;
rolagem e observers atualizam o estado automaticamente. Sem autoplay independente.
Notas visuais de protótipo e noindex preexistentes permanecem como pendência editorial.

## 2. [DECISÃO] GTM

Snippet exato de dois scripts do documento preparado no head, dentro do
`template#construa-gtm-pending-consent`, INERTE. Há um único loader preparado e
ZERO carregadores ativos Joyce. Não se adicionou gtag.js, Pixel direto ou outro
snippet alternativo. Não há evidência de falha do snippet; compatibilidade em
Tag Assistant permanece não testada.

Bloqueio aplicado conforme seção 3.5 da ordem: não existe CMP validada ou texto
de consentimento aprovado. Ativar GTM agora poderia ativar tags já publicadas
cujo estado não é acessível. Não se supõe que denied impeça todos os envios.
O template não tem mecanismo de ativação por query, localStorage ou visita.
Nenhum consentimento foi artificialmente concedido. Não há persistência de dados
de tracking adicionada, nem envio externo por esse módulo enquanto GTM está inerte.

## 3. [CONFIRMADO] Diffs implementados

- `construidas-src/src/tracking.js`: contrato fechado, allowlist de campos e
  valores, host exato e rota isolada, proteção contra erro do dataLayer.
  Preserva a instância existente; não copia texto livre, URL, query ou PII.
- `construidas-src/src/main.js`: integra handlers existentes de seleção manual,
  setas, swipe e teclado. Hash inicial e scroll não geram seleção. Não registra
  seleção móvel quando o destino já está ativo. Desktop registra clique explícito.
- Hero: `construa_cta_click`, `cta_location=hero`,
  `cta_label=quero_garantir_minha_vaga`.
- Menu/marca: `construa_nav_click`, `nav_target=inicio|encontro|jornada|convite`.
- Pilares: `construa_pillar_select`, `pillar_id=01..05`.
- Saída oficial: `construa_sympla_outbound`, `cta_location=final`. Usa
  eventCallback com proteção de execução única e fallback independente de 150ms.
  Callback/fallback favorece entrega mas não comprova recebimento nas plataformas.
  Não há Purchase, InitiateCheckout, Lead, CompleteRegistration ou page_view manual.
- `construidas-src/index.html`: snippet preparado com bloqueio explícito.
- `construidas/`: artefatos reconstruídos, referência ao novo bundle.
- Testes: novo `tests/construidas-tracking.cjs` e ampliação do teste de scroll.

A URL fornecida posteriormente pelo usuário substitui a premissa antiga de
checkout indisponível. Não foi realizada compra nem validação do painel Sympla.
Exclusões locais de nove imagens de portfolio são anteriores a esta tarefa.

## 4. [EVIDÊNCIA] Testes

| Comando/cenário | Resultado |
|---|---|
| `npm.cmd run build` em construidas-src | PASSOU |
| `node tests/construidas-tracking.cjs` | PASSOU |
| `node tests/journey-scroll-regression.cjs` | PASSOU |
| `node tests/construidas-integration.cjs` | PASSOU |
| Contratos, bloqueio host/rota, campos pessoais descartados | PASSOU |
| CTA/menu exclusivos, pilares 01..05 manuais | PASSOU em simulação |
| Scroll automático, resize Safari e saída da seção sem eventos | PASSOU em simulação |
| Teclas, swipe, setas e redução de movimento | PASSOU em simulação |
| Callback/fallback e falha de dataLayer preservam navegação | PASSOU em simulação |
| Home sem ID Joyce; LP sem GTM Portes; único snippet inerte | PASSOU |
| Assets, retratos, HEAD, redirecionamento com UTM | PASSOU |
| Render desktop/mobile, console/CSP e rede em navegador real | NÃO TESTADO |
| `?utm_source=teste#convite` em navegador e atribuição real | NÃO TESTADO |
| Tag Assistant / Preview, snippet ativo e PageViews únicos | NÃO TESTADO |
| CMP: recusa, aceitação, alteração e nova sessão | NÃO TESTADO; CMP ausente |
| GA4 DebugView / Meta Test Events | NÃO TESTADO; sem acesso |

Testes usam Node/vm e o servidor em memória; não são evidência de hits reais ou
de inspeção visual em navegador. Sem lint configurado para esta LP.

## 5. [PENDENTE] Ações mínimas para homologação

1. Responsável de privacidade/gestor: definir e aprovar CMP e textos. Integrar
   estados iniciais e atualizações pelas APIs de consentimento do GTM antes
   de ativar o loader. Usar template CMP/Consent Initialization suportado.
2. Gestor GTM Joyce: revisar o workspace real sem reimportar JSON nem recriar
   tags. Conferir oito tags, cinco acionadores e seis variáveis; IDs GA4
   G-5NSMWCHQN7 e Pixel 1850406759793802; host e regex de rota do documento;
   checkout_provider=sympla; eventos e campos deste relatório.
3. Gestor GTM: conferir controles internos das cinco tags Google e consentimento
   adicional ad_storage/ad_user_data das três Meta, pausas, ordem de fbq e
   aceitação tardia. Não disparar PageView antes de cada evento custom.
4. Desenvolvedor/gestor: após consentimento validado, ativar apenas o snippet
   preparado em ambiente de homologação autorizado e testar Tag Assistant.
   Se houver falha comprovada, documentar e substituir por método oficial único.
5. Gestor de mídia: conferir DebugView, Test Events, PageViews únicos e todos os
   cenários de consentimento em navegador. Auditar URLs/UTMs para PII antes de
   enviar tráfego; o módulo não encaminha UTMs ao checkout nem as inclui no payload.
6. Responsável pelo site: aprovar publicação/deploy e revisar notas de protótipo.
   Nenhum push/deploy/publicação do container foi executado.
7. Organizador Sympla: configurar integração de compra confirmada e deduplicação
   em etapa separada; clique outbound não representa compra ou checkout iniciado.

## 6. [DECISÃO] Estado final

**(c) Parcialmente bloqueado.** Instrumentação local implementada e testes locais
aprovados. Ativação do container bloqueada por consentimento não validado;
homologação externa e recebimento real não comprovados. Não pronto para alegar
mensuração funcional em produção.

Referências consultadas:
- https://developers.google.com/tag-platform/tag-manager/datalayer
- https://developers.google.com/tag-platform/security/guides/consent
