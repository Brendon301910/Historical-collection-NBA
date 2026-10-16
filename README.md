# Historical Collection NBA

API NestJS com PostgreSQL e Prisma para consultar jogadores, premiações individuais e campeões históricos da NBA. Inclui cadastro de jogadores, filtros por temporada e time, paginação e Swagger.

## Execução local

Pré-requisitos: Node.js, npm e Docker Desktop em execução.

1. Copie `.env.example` para `.env` e ajuste as variáveis. No PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Instale as dependências e prepare um banco novo:

   ```sh
   npm ci
   docker compose up -d --wait database
   npm run prisma:generate
   npm run start:seeded
   ```

A API usa `http://localhost:3000` por padrão. Swagger: `http://localhost:3000/docs`.
`DATABASE_URL` é obrigatória. `PORT` deve ser um inteiro entre 1 e 65535.
Ao alterar usuário, senha, banco ou porta do PostgreSQL, ajuste também `DATABASE_URL`.
As credenciais de `.env.example` servem apenas ao ambiente local.

Para executar o JavaScript compilado:

```sh
npm run build
npm run start:prod:seeded
```

Os comandos `start:seeded` e `start:prod:seeded` aplicam as migrations e a carga
antes de iniciar a API. O segundo utiliza o seed compilado em `dist/seed`.
A preparação do banco exige a CLI Prisma instalada; execute `npm ci` com as
dependências de desenvolvimento disponíveis nesta etapa.
`start:dev` e `start:prod` continuam disponíveis para iniciar somente a API,
quando o banco já estiver preparado.

## Carga inicial

Os comandos com carga preparam **149 jogadores**, **192 conquistas individuais**
e **80 finais**, além de 54 identidades de times e 80 temporadas.
O histórico cobre MVP de 1955–56 a 2025–26, DPOY de 1982–83 a 2025–26,
ROY de 1952–53 a 2025–26 e campeonatos de 1946–47 a 2025–26.
Inclui as temporadas da BAA reconhecidas na lista histórica da NBA.

O catálogo NBA 75 continua com seus 76 integrantes. Outros 73 jogadores
premiados estão em `prisma/data/additional-players.json`; premiações, times,
temporadas, finais e cobertura estão em `prisma/data/history.json`.
`prisma/data/franchises.json` vincula essas identidades às franquias, com fontes
oficiais. São 54 identidades em 33 grupos: 30 atuais e 3 extintos.
As fontes oficiais e decisões sobre identidades históricas estão em
[Dados históricos](docs/history-data.md).

### Jogadores da seleção NBA 75

A carga usa a [seleção oficial NBA 75](https://www.nba.com/news/nba-75th-anniversary-team-announced).
São **76 jogadores**, pois houve empate na votação, e não uma classificação
ordinal dos atletas. O catálogo completo está em `prisma/data/players.json`.

Nome, altura em metros e ano de nascimento foram conferidos nos perfis oficiais
da NBA em 9 de outubro de 2026. Cada entrada registra `sourceUrl` e `nbaId` para
consulta da fonte. As alturas mantêm o valor métrico publicado no perfil nessa
data, inclusive quando diferem de registros históricos de outras fontes.
Os UUIDs são fixos, derivados da URL oficial pelo algoritmo UUID v5
(namespace URL). Nenhum acesso à internet é necessário para executar a carga.

Para preparar o banco sem iniciar a API:

```sh
npm run prisma:generate
npm run db:prepare
```

Para executar somente a carga, após aplicar as migrations:

```sh
npm run db:seed
```

O seed informa quantos jogadores foram criados, vinculados a registros locais
ou preservados, além das quantidades de registros históricos verificados.
Depois, `GET /player`, `GET /award/winners` e `GET /championship`
consultam os registros carregados.

### Reexecução e cadastros existentes

- `nba_id` é opcional e único no banco. Cadastros via `POST /player` continuam
  funcionando sem esse identificador.
- Jogadores já identificados por `nba_id` permanecem intactos. A carga não
  sobrescreve nome, altura, ano de nascimento, datas ou exclusões lógicas.
- Um cadastro manual é vinculado quando existe exatamente uma correspondência
  de nome normalizado e ano de nascimento. Seu ID local permanece o mesmo.
  Espaços, maiúsculas, acentos e pontuação não impedem essa correspondência.
- Nomes diferentes ou apelidos não são associados automaticamente. Para
  vinculá-los, confira o perfil e ajuste o nome/ano antes da primeira carga,
  ou atribua o `nba_id` correto ao registro por uma operação administrativa.
- Nomes duplicados, anos divergentes ou colisões de ID interrompem a carga com
  os registros envolvidos na mensagem. Revise esses registros antes de repetir
  o comando. A carga não remove nem combina cadastros automaticamente.
- Toda a carga ocorre em uma transação. Em caso de conflito, suas alterações
  são revertidas; migrations já aplicadas permanecem. Execuções simultâneas
  do seed são serializadas por um bloqueio no PostgreSQL.
- Exclusões lógicas (`deleted_at`) são preservadas. Uma exclusão física de um
  jogador vinculado a conquistas é bloqueada pelas chaves estrangeiras.
  Jogadores sem vínculos que forem removidos fisicamente podem ser reinseridos
  pela próxima carga.
- As conquistas usam o ID real do jogador no banco, localizado pelo `nba_id`,
  inclusive quando o cadastro manual preserva um UUID diferente do catálogo.
- Times, categorias, temporadas e conquistas existentes não são sobrescritos.
  Divergências em seus dados históricos interrompem a carga e revertem todas
  as gravações dessa execução. Corrija dados históricos em uma alteração
  explícita e revisada; reiniciar a aplicação não funciona como sincronização.
- A carga preenche vínculos de franquia ainda nulos, preservando IDs, nomes da
  época e conquistas. Vínculos já preenchidos e divergentes interrompem a
  transação; não são reatribuídos silenciosamente.

O seed não impede que um usuário cadastre manualmente outro registro da mesma
pessoa depois da carga; o endpoint de cadastro mantém seu contrato atual.

## Banco existente

As migrations criam a tabela original e depois acrescentam as datas, o identificador NBA e as tabelas históricas, preservando os registros.
Se o banco já contém a tabela `player` do schema antigo, sem histórico de migrations, confira se suas colunas são `id`, `name`, `height` e `yearOfBirth`. Nesse caso, marque somente a primeira migration como aplicada antes de executar as demais:

```sh
npx prisma migrate resolve --applied 20261007000000_create_player
npm run db:migrate
```

Não execute esse baseline em um banco vazio ou com estrutura diferente. Registros antigos recebem a data da migration em `created_at`, pois a data original não era armazenada.

## Endpoints

### GET /award e GET /team

`GET /award` retorna um array com as categorias disponíveis: MVP, DPOY e ROY.
`GET /team` retorna um array de franquias, sem repetir os nomes históricos,
ordenado por nome e código. Ambos retornam objetos apenas com `code` e `name`,
sem IDs internos. Após a carga, há 33 opções de time, incluindo os três grupos
extintos (`BAL-1947`, `CHS` e `WSC`), que mantêm seus nomes históricos.
Use os códigos retornados nos filtros; eles são identificadores locais da API.

O filtro `team` reúne todas as identidades vinculadas à franquia. `team=OKC`
inclui conquistas de Seattle; `team=LAL` inclui Minneapolis. Códigos antigos,
como `SEA` e `MNL`, também são aceitos como aliases do grupo completo.
Use `year` para restringir a temporada.

### GET /award/winners

Lista conquistas, com filtros opcionais combinados por interseção:

| Parâmetro | Significado |
| --- | --- |
| `award` | Código de `GET /award`: MVP, DPOY ou ROY |
| `year` | Ano final da temporada: 1995 representa 1994–95 |
| `team` | Código da franquia de `GET /team`; inclui suas identidades históricas |
| `page` | Página opcional; intervalo de 1 a 1.000.000. Usa 1 se apenas `limit` for informado |
| `limit` | Itens por página, opcional; intervalo de 1 a 100. Usa 20 se apenas `page` for informado |

Exemplos:

```http
GET /award/winners
GET /award/winners?award=MVP
GET /award/winners?year=1998
GET /award/winners?team=CHI
GET /award/winners?award=MVP&year=1998&team=CHI
GET /award/winners?award=ROY&year=1995
```

Cada item contém `award` (código do prêmio), `player` (nome do jogador),
`team` (nome atual da franquia, com o nome da época entre parênteses quando
diferente) e `year` (ano final da temporada).
Exemplo de resposta para `GET /award/winners?award=MVP&year=1998`:

```json
{
  "data": [
    { "award": "MVP", "player": "Michael Jordan", "team": "Chicago Bulls", "year": 1998 }
  ],
  "total": 1,
  "page": null,
  "limit": null
}
```

Um item representa uma conquista, não um jogador distinto. Empates retornam
mais de um item, inclusive na mesma temporada. Sem o filtro `award`, um jogador
premiado em categorias diferentes pode aparecer com o mesmo nome, time e ano
mais de uma vez; o campo `award` identifica cada prêmio. Esse campo está sempre
presente, com ou sem filtro de categoria. Use o filtro `award` para consultar
uma categoria específica e `GET /award` para obter os nomes dos prêmios.

Ordenação: ano final decrescente, código do prêmio crescente e ID crescente.
A consulta histórica preserva conquistas de jogadores excluídos logicamente,
embora esses jogadores não apareçam em `GET /player`.

### GET /championship

Lista os nomes dos times campeões e os anos dos títulos. Aceita `year`,
`team`, `page` e `limit`, com os mesmos limites e padrões anteriores.
`team` filtra **títulos conquistados**, sem incluir participações como vice.

```http
GET /championship
GET /championship?year=1998
GET /championship?team=CHI
GET /championship?year=1998&team=CHI
```

Cada item contém `team`, com o nome atual da franquia e o nome da época entre
parênteses quando diferente, e `year`, com
o ano final da temporada do título (1998 representa a temporada 1997–98).
Exemplo de resposta para `GET /championship?year=1998`:

```json
{
  "data": [{ "team": "Chicago Bulls", "year": 1998 }],
  "total": 1,
  "page": null,
  "limit": null
}
```

Ordenação: ano final decrescente. Cada item representa um título; o mesmo time
pode aparecer várias vezes. Use `year` para consultar uma temporada específica.
Não há atribuição de títulos aos jogadores, pois elencos ainda não são modelados.

Exemplos de itens históricos após o agrupamento:

```json
{"award":"ROY","player":"Kevin Durant","team":"Oklahoma City Thunder (Seattle SuperSonics)","year":2008}
```

```json
{"team":"Los Angeles Lakers (Minneapolis Lakers)","year":1954}
```

Quando o nome da época já coincide com o atual, ele aparece apenas uma vez.

As respostas de premiações, campeões e times não expõem IDs internos.
Os dados completos e os nomes históricos continuam no banco. O agrupamento
exige a migration `20261016000000_add_team_franchises` e a reexecução da carga:

```sh
npm run prisma:generate
npm run start:seeded
```

Esse comando aplica as migrations, vincula as identidades e inicia a API.
Times fora do catálogo, ainda sem vínculo, continuam consultáveis pelo próprio
código e nome. `GET /player` e `POST /player` mantêm
seus contratos, incluindo o ID dos jogadores. O filtro `playerId` foi removido;
enviá-lo nas consultas retorna `400`, como qualquer parâmetro não reconhecido.

Nas duas consultas, omitir **ambos** `page` e `limit` retorna todos os resultados
que atendem aos filtros, sem limite de quantidade. O envelope permanece
`{ "data": [...], "total": N, "page": null, "limit": null }`.

Informar pelo menos um desses parâmetros ativa a paginação. Exemplos:

```http
GET /award/winners
GET /award/winners?award=MVP
GET /championship
GET /championship?limit=10
GET /award/winners?page=2
GET /award/winners?page=2&limit=10
```

Os três primeiros retornam todos os resultados correspondentes. `limit=10`
usa página 1; `page=2` usa 20 itens por página; ambos informados usam os valores
solicitados. O limite máximo de 100 vale apenas para a paginação explícita.

`total` representa o total após os filtros e antes da paginação.
Consulta válida sem resultado retorna `200` com `data: []`.
Uma página além do último resultado mantém `total` e retorna `data: []`.
Filtros malformados, códigos desconhecidos, parâmetros repetidos e parâmetros
não reconhecidos retornam `400`. Códigos aceitam minúsculas e espaços externos.
Anos aceitos: 1947 a 9999; fora da cobertura carregada, a consulta fica vazia.
Parâmetros vazios na URL (`page=` ou `limit=`) retornam `400`; para consultar
todos os resultados, omita os dois parâmetros.

No Swagger (`/docs`), abra a operação e clique em **Try it out**. Os filtros
`award` e `team` aparecem como listas de seleção: escolha um código ou deixe
a seleção vazia para consultar todos. Preencha `year`, `page` e `limit` quando
necessário e clique em **Execute**. `team` também usa seleção em `/championship`.

As opções são lidas do banco na inicialização da aplicação, usando os mesmos
catálogos de `GET /award` e `GET /team`, inclusive as identidades históricas.
Use esses endpoints para consultar o nome correspondente a cada código.
Após alterar os catálogos ou executar a carga com a API já iniciada, reinicie
a aplicação para atualizar as opções do Swagger. Sem carga, as listas ficam
vazias. As consultas continuam aceitando os códigos por URL e validando-os no
servidor. O seletor oferece o código atual de cada franquia; códigos históricos
permanecem disponíveis como aliases nas URLs.

URLs locais para testar:

- [MVP de 1998 pelo Chicago Bulls](http://localhost:3000/award/winners?award=MVP&year=1998&team=CHI)
- [ROY de 1995, com empate](http://localhost:3000/award/winners?award=ROY&year=1995)
- [Final de 1998](http://localhost:3000/championship?year=1998)
- [Títulos do Chicago Bulls](http://localhost:3000/championship?team=CHI)

### GET /health

Retorna `200` com `{"health":true}`. Indica que a aplicação atende HTTP; não consulta o banco a cada chamada. A inicialização da aplicação exige conexão com PostgreSQL.

### GET /player

Lista os jogadores cadastrados que não estão marcados como excluídos
(`deleted_at` nulo). Retorna `200` com um array, ordenado pela data de criação
(mais antigos primeiro), usando o ID como desempate. Sem registros, retorna `[]`.
Não exige parâmetros e não possui paginação.

```json
[
  {
    "id": "c14c74e3-3d29-45d9-ad08-0aceab7a6a33",
    "name": "Michael Jordan",
    "height": "1.98",
    "year_of_birth": 1963,
    "created_at": "2026-10-07T12:00:00.000Z"
  }
]
```

No Swagger, abra **GET /player**, clique em **Try it out** e depois em **Execute**.

### POST /player

Envie JSON com os três campos abaixo:

```json
{
  "name": "Michael Jordan",
  "height": "1.98",
  "yearOfBirth": 1963
}
```

`name` e `height` devem ser textos não vazios, com limites de 200 e 20 caracteres. Espaços nas extremidades são removidos. A altura permanece textual, conforme o contrato original. `yearOfBirth` deve ser um número inteiro entre 1 e o ano atual. Campos desconhecidos são rejeitados.

Retorna `201` após salvar:

```json
{
  "id": "c14c74e3-3d29-45d9-ad08-0aceab7a6a33",
  "name": "Michael Jordan",
  "height": "1.98",
  "year_of_birth": 1963,
  "created_at": "2026-10-07T12:00:00.000Z"
}
```

Dados inválidos retornam `400`. Falhas inesperadas de persistência retornam `500`, sem expor detalhes internos do banco.

## Verificação

```sh
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run lint
```

Os testes unitários cobrem datas, mapeamento, referências e cobertura dos catálogos.
Os testes HTTP cobrem validação, paginação, erros e documentação Swagger.
As consultas históricas são verificadas com PostgreSQL real nos testes de integração.

Os testes de integração usam PostgreSQL real e removem somente os jogadores criados por eles. Cobrem persistência, listagem após cadastro, ordenação e exclusão lógica. Configure um banco de testes separado e aplique as migrations antes de executar. Exemplo PowerShell, ajustando a URL para seu banco de testes:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://nba:nba_local@localhost:5432/nba_test?schema=public'
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm run db:migrate
npm run test:integration
Remove-Item Env:DATABASE_URL
Remove-Item Env:TEST_DATABASE_URL
```

O teste exige `TEST_DATABASE_URL`; não usa automaticamente o banco da aplicação.

Os testes da carga criam schemas temporários, aplicam todas as migrations e os
removem ao final. Verificam a carga NBA 75 e sua expansão, empates, filtros
combinados, identidades históricas, paginação, integridade referencial, edições,
exclusões lógicas, cadastros manuais, rollback e execuções simultâneas.
A conta do banco de testes deve poder criar schemas, e a CLI Prisma deve
estar instalada.
