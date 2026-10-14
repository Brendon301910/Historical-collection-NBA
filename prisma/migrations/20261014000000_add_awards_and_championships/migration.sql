-- CreateTable
CREATE TABLE "award" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season" (
    "id" TEXT NOT NULL,
    "start_year" INTEGER NOT NULL,
    "end_year" INTEGER NOT NULL,

    CONSTRAINT "season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_winner" (
    "id" TEXT NOT NULL,
    "award_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "award_winner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "championship" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "champion_team_id" TEXT NOT NULL,
    "runner_up_team_id" TEXT NOT NULL,
    "champion_wins" INTEGER NOT NULL,
    "runner_up_wins" INTEGER NOT NULL,
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "championship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "award_code_key" ON "award"("code");

-- CreateIndex
CREATE UNIQUE INDEX "season_start_year_key" ON "season"("start_year");

-- CreateIndex
CREATE UNIQUE INDEX "season_end_year_key" ON "season"("end_year");

-- CreateIndex
CREATE UNIQUE INDEX "team_code_key" ON "team"("code");

-- CreateIndex
CREATE INDEX "award_winner_season_id_id_idx" ON "award_winner"("season_id", "id");

-- CreateIndex
CREATE INDEX "award_winner_team_id_season_id_idx" ON "award_winner"("team_id", "season_id");

-- CreateIndex
CREATE INDEX "award_winner_player_id_season_id_idx" ON "award_winner"("player_id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "award_winner_award_id_season_id_player_id_key" ON "award_winner"("award_id", "season_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "championship_season_id_key" ON "championship"("season_id");

-- CreateIndex
CREATE INDEX "championship_champion_team_id_season_id_idx" ON "championship"("champion_team_id", "season_id");

-- CreateIndex
CREATE INDEX "championship_runner_up_team_id_idx" ON "championship"("runner_up_team_id");

-- AddForeignKey
ALTER TABLE "award_winner" ADD CONSTRAINT "award_winner_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "award"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_winner" ADD CONSTRAINT "award_winner_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_winner" ADD CONSTRAINT "award_winner_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_winner" ADD CONSTRAINT "award_winner_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "championship" ADD CONSTRAINT "championship_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "championship" ADD CONSTRAINT "championship_champion_team_id_fkey" FOREIGN KEY ("champion_team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "championship" ADD CONSTRAINT "championship_runner_up_team_id_fkey" FOREIGN KEY ("runner_up_team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Preserve valid historical relationships even for writes outside the seed.
ALTER TABLE "season" ADD CONSTRAINT "season_years_check" CHECK ("start_year" >= 1946 AND "end_year" = "start_year" + 1);
ALTER TABLE "championship" ADD CONSTRAINT "championship_teams_check" CHECK ("champion_team_id" <> "runner_up_team_id");
ALTER TABLE "championship" ADD CONSTRAINT "championship_score_check" CHECK ("champion_wins" = 4 AND "runner_up_wins" BETWEEN 0 AND 3);
