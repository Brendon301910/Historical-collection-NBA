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

O banco preserva as 54 identidades necessárias para representar as conquistas
importadas. `GET /team` lista 33 grupos: 30 franquias atuais e 3 extintas.
Os códigos são locais desta API, não identificadores oficiais da NBA.

`prisma/data/franchises.json`, conferido em 16 de outubro de 2026, define o
agrupamento e suas fontes. Cada identidade pertence a exatamente um grupo.
O código e o nome do grupo correspondem à sua identidade atual. As equipes
extintas sem sucessora (`BAL-1947`, `CHS`, `WSC`) mantêm nomes próprios.

O filtro `team` consulta o grupo inteiro, tanto com o código atual quanto com
um código histórico. A resposta usa o nome atual e acrescenta o nome da época
entre parênteses quando diferente. Nomes iguais não são repetidos.

Agrupamentos com mais de uma identidade presente na carga:

| Grupo | Identidades | Fontes oficiais |
| --- | --- | --- |
| ATL | ATL, MLH, STL | [Pettit](https://www.nba.com/news/history-nba-legend-bob-pettit), [franquias campeãs](https://www.nba.com/nba-teams-that-joined-championship-club) |
| BKN | BKN, NJN | [Nets](https://www.nba.com/nets/team/60th-season-celebration) |
| CHA | CHA, CHA-BOB, CHH | [Hornets](https://www.nba.com/hornets/keys-beat-philadelphia) |
| DET | DET, FTW | [Temporada 1957–58](https://www.nba.com/news/history-season-review-1957-58) |
| GSW | GSW, PHW, SFW | [Times originais](https://www.nba.com/news/what-were-the-original-nba-teams) |
| LAC | LAC, BUF, SDC | [Clippers](https://www.nba.com/clippers/behind-design-la-clippers-city-edition-jersey) |
| LAL | LAL, MNL | [Lakers](https://www.nba.com/lakers/history/season-capsule) |
| NOP | NOP, NOK | [Retorno a New Orleans](https://www.nba.com/pelicans/news/the_hornets__hurricane_katr_2010_08_26.html), [Pelicans](https://www.nba.com/pelicans/tom-and-gayle-benson) |
| OKC | OKC, SEA | [Histórico do Thunder](https://www.nba.com/news/oklahoma-city-thunders-nba-championships) |
| PHI | PHI, SYR | [Guia dos 76ers](https://cdn.nba.com/teams/uploads/sites/1610612755/2023/10/Full_Media_Guide_23-24-1.pdf) |
| SAC | SAC, ROC, CIN, KCK | [Kings](https://www.nba.com/kings/history-franchise-timeline) |
| WAS | WAS, CHP, CHZ, BAL-1963, WSB | [Wizards](https://www.nba.com/wizards/franchise-history) |

São agrupados apenas os nomes que já aparecem na carga. Ao acrescentar uma
identidade, inclua também seu vínculo e a fonte no catálogo de franquias.
Não deduza o vínculo por cidade, abreviação ou semelhança entre nomes.

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
   preservando os IDs existentes. Atualize os vínculos em `franchises.json`.
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

A migration de franquias cria `franchise` e o vínculo opcional
`team.franchise_code`, com chave estrangeira e índice. A carga preenche os
vínculos nulos das identidades conhecidas, sem trocar seus IDs ou alterar as
conquistas. Associações já preenchidas e incompatíveis causam rollback.
Times locais fora do catálogo e sem vínculo usam seu próprio código e nome.
Depois de carregar ou modificar os grupos, reinicie a API para atualizar as
opções do Swagger.

Jogadores excluídos logicamente mantêm suas conquistas históricas consultáveis.
Exclusões físicas com vínculos são bloqueadas no banco. Títulos de times
não são atribuídos automaticamente aos jogadores.
