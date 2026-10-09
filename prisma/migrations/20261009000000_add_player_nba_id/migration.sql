ALTER TABLE "player" ADD COLUMN "nba_id" INTEGER;

CREATE UNIQUE INDEX "player_nba_id_key" ON "player"("nba_id");
