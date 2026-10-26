# Integração da landing page Construa-se

A landing page Construa-se está no caminho `construidas/`. Por solicitação do responsável pelo projeto, as páginas não possuem botões ou links de navegação entre si, preservando o tráfego de cada campanha.

## Estrutura

- `construidas-src/`: código editável, configuração, dependências e imagens da LP.
- `construidas/`: versão compilada para publicação. Deve acompanhar os commits de alterações visuais ou funcionais.
- `tests/construidas-integration.cjs`: verificação de navegação e arquivos com o servidor existente, sem chamadas externas.

## Editar e recompilar

Com Node.js 22.12+ instalado:

```sh
cd construidas-src
npm ci
npm run build
```

O build substitui somente a pasta gerada `construidas/`. As dependências ficam fora do Git e a configuração usa caminhos relativos, incluindo os módulos carregados sob demanda da cena 3D. Para desenvolver a LP isoladamente, use `npm run dev` dentro de `construidas-src`.

## Conferir o site integrado

Na raiz do repositório:

```sh
node tests/tracking-mvp.cjs
node tests/construidas-integration.cjs
node _server.js
```

O servidor usa a porta 8000 por padrão. Abra `http://localhost:8000/` para conferir a página principal. A versão integrada está em `http://localhost:8000/construidas/`. Acesso sem barra final redireciona para a pasta, preservando parâmetros de campanha.

## Publicar pelo Dokploy

O Dockerfile existente continua válido e inicia o mesmo servidor. Não é necessário instalar Vite ou compilar no container: ele usa a pasta `construidas/` já versionada. As fontes de desenvolvimento são excluídas do container por `.dockerignore`.

Antes de publicar, conferir repositório, branch e deploy automático da aplicação no Dokploy. Revisar e incorporar a branch de integração na branch acompanhada pela aplicação. O destino planejado é `https://viabilidade-estrategica.porteseng.com.br/construidas/`; não requer configuração de outro domínio ou aplicação.

## Escopo atual da LP

Este é o protótipo visual aprovado para integração: hero, identificação, desejo com cena conceitual do encontro, percurso 3D das cinco especialistas e convite. O ingresso ainda não está habilitado e o botão informa que se trata de prévia. Checkout, fotos das especialistas, demais blocos do roteiro e página de obrigado precisam ser concluídos antes da divulgação final.

A fotografia da abertura é a imagem real fornecida de Joyce. A cena do encontro é gerada com IA e identificada como visualização conceitual. Montserrat é a tipografia base e Cormorant Garamond é a substituição temporária nos destaques serifados. O `noindex` da LP permanece até a publicação final aprovada. A integração não ativa rastreadores adicionais nem reutiliza automaticamente os eventos de conversão do formulário de viabilidade.


## Atualização local de 26 de outubro

A cópia local foi atualizada a partir da main, incluindo os ajustes da home e a remoção do botão no cabeçalho. O nome exibido na LP foi alterado para Construa-se. Os nomes das pastas e o caminho /construidas/ foram preservados para manter os links existentes.


O nome Construa-se e o botão de navegação foram aprovados para publicação em 26 de outubro. O caminho /construidas/ foi mantido.


## Separação das campanhas

Removidos o botão Construa-se da home e os links de retorno à Portes Engenharia no cabeçalho e no rodapé da LP. Os links internos e os botões de inscrição continuam no fluxo do evento.
