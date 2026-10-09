# Historical Collection NBA

API NestJS com PostgreSQL e Prisma. Atualmente implementa cadastro e listagem de jogadores e verificação HTTP de saúde.

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

## Carga inicial NBA 75

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
ou preservados. Depois, `GET /player` lista os registros disponíveis.

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
  jogador do catálogo permite que ele seja inserido novamente na próxima carga.

O seed não impede que um usuário cadastre manualmente outro registro da mesma
pessoa depois da carga; o endpoint de cadastro mantém seu contrato atual.

## Banco existente

As migrations criam a tabela original e depois acrescentam as datas e o identificador NBA, preservando os registros.
Se o banco já contém a tabela `player` do schema antigo, sem histórico de migrations, confira se suas colunas são `id`, `name`, `height` e `yearOfBirth`. Nesse caso, marque somente a primeira migration como aplicada antes de executar as demais:

```sh
npx prisma migrate resolve --applied 20261007000000_create_player
npm run db:migrate
```

Não execute esse baseline em um banco vazio ou com estrutura diferente. Registros antigos recebem a data da migration em `created_at`, pois a data original não era armazenada.

## Endpoints

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

Os testes unitários cobrem datas, mapeamento e validação do catálogo. Os testes HTTP percorrem controller, validação, caso de uso e repositório, substituindo somente o cliente Prisma.

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

Os testes da carga criam um schema temporário no banco de testes e o removem ao
final. Verificam os 76 registros, carga repetida, preservação de edições e
exclusões lógicas, vínculo com cadastros manuais, rollback de conflitos e
execuções simultâneas. A conta do banco de testes deve poder criar schemas.
