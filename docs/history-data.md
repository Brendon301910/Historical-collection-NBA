# Catálogo histórico

## Cobertura e fontes

Dados estruturados conferidos em 14 de outubro de 2026:

| Conjunto | Temporadas | Registros | Fonte |
| --- | --- | --- | --- |
| MVP | 1955–56 a 2025–26 | 71 | [NBA](https://www.nba.com/news/history-mvp-award-winners) |
| DPOY | 1982–83 a 2025–26 | 44 | [NBA](https://www.nba.com/news/history-defensive-player-of-the-year-winners) |
| ROY | 1952–53 a 2025–26 | 77 | [NBA](https://www.nba.com/news/history-rookie-of-the-year-winners) |
| Finais | 1946–47 a 2025–26 | 80 | [NBA](https://www.nba.com/news/history-nba-champions) |

As 74 edições de ROY incluem três empates, totalizando 77 conquistas.
As finais incluem as temporadas da BAA presentes no histórico oficial.
Não há resultados de ABA, WNBA, NBA Cup ou outras competições.

`prisma/data/history.json` registra a cobertura de cada conjunto e as fontes.
O validador rejeita lacunas dentro da cobertura declarada, referências ausentes,
duplicações e finais inconsistentes. Uma temporada fora dessa cobertura não
deve ser interpretada como uma edição sem vencedor.

## Jogadores

Os 76 integrantes da seleção NBA 75 permanecem em `players.json`, com IDs
inalterados. Os 73 premiados adicionais estão em `additional-players.json`.
Cada jogador adicional registra altura em metros e ano de nascimento
conferidos em seu perfil NBA. `sourceUrl` identifica o perfil canônico;
`verificationUrl`, quando presente, registra a página alternativa oficial
usada na conferência. A data de verificação fica no arquivo.

As referências de vencedores usam `playerNbaId`. O seed resolve esse
identificador para o UUID local, preservando cadastros manuais reconciliados.
Variações históricas de nome, como Lew Alcindor e Ron Artest, foram associadas
ao mesmo identificador NBA dos respectivos jogadores. Não há correspondência
automática por apelido durante a execução.

Os UUIDs de jogadores seguem a convenção existente: UUID v5 da URL oficial,
com namespace URL. Os novos registros históricos usam UUIDs v5 fixos com
chaves locais `nba-history:...`, versionados nos arquivos.

## Identidades de times

`GET /team` lista 54 identidades: os 30 times atuais e as identidades
históricas necessárias para representar as conquistas importadas.
Os códigos são locais desta API, não identificadores oficiais da NBA.

Não há agregação por franquia. Por exemplo, `SEA` e `OKC`, assim como
`MNL` e `LAL`, continuam separados. A expansão de abreviações, como
“Ft. Wayne” para “Fort Wayne”, não altera a identidade do time.

Casos com códigos específicos:

- `BAL-1947`: Baltimore Bullets da equipe antiga.
- `BAL-1963`: Baltimore Bullets da equipe que veio de Chicago.
- `CHH`: Charlotte Hornets da fase anterior à mudança para New Orleans.
- `CHA`: Charlotte Hornets após a retomada desse nome em Charlotte.
- `CHA-BOB`: Charlotte Bobcats.
- `NOK`: New Orleans/Oklahoma City Hornets.
- `WSB`: Washington Bullets; `WAS`: Washington Wizards.

A distinção entre os Baltimore Bullets acompanha o
[histórico oficial dos Wizards](https://www.nba.com/wizards/franchise-history).
Os nomes dos vencedores e seus times seguem as listas de premiações.
O time da conquista não é deduzido do time atual do jogador nem de todo o
histórico de transferências da temporada.

## Manutenção

1. Confira novos resultados nas fontes oficiais.
2. Acrescente jogadores, identidades de times e temporadas que faltarem,
   preservando os IDs existentes.
3. Acrescente conquistas e finais. Amplie `throughYear` somente quando todas
   as edições do período estiverem preenchidas.
4. Atualize `verifiedAt` e as fontes quando necessário.
5. Execute build, testes unitários, HTTP e integração com PostgreSQL.
6. Revise as contagens e atualize a documentação da cobertura.

Não há pesquisa na internet ao iniciar a aplicação. As migrations alteram
a estrutura; o seed carrega os arquivos locais em uma única transação.
Reexecuções compatíveis preservam registros e datas. Dados históricos
divergentes exigem uma correção explícita e revisada, pois o seed não os
sobrescreve silenciosamente.

Jogadores excluídos logicamente mantêm suas conquistas históricas consultáveis.
Exclusões físicas com vínculos são bloqueadas no banco. Títulos de times
não são atribuídos automaticamente aos jogadores.
