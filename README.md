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
   npm run db:migrate
   npm run start:dev
   ```

A API usa `http://localhost:3000` por padrão. Swagger: `http://localhost:3000/docs`.
`DATABASE_URL` é obrigatória. `PORT` deve ser um inteiro entre 1 e 65535.
Ao alterar usuário, senha, banco ou porta do PostgreSQL, ajuste também `DATABASE_URL`.
As credenciais de `.env.example` servem apenas ao ambiente local.

Para executar o JavaScript compilado:

```sh
npm run build
npm run start:prod
```

## Banco existente

As migrations criam a tabela original e depois acrescentam as datas, preservando os registros.
Se o banco já contém a tabela `player` do schema antigo, sem histórico de migrations, confira se suas colunas são `id`, `name`, `height` e `yearOfBirth`. Nesse caso, marque somente a primeira migration como aplicada antes de executar a segunda:

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

Os testes unitários cobrem datas e mapeamento. Os testes HTTP percorrem controller, validação, caso de uso e repositório, substituindo somente o cliente Prisma.

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
