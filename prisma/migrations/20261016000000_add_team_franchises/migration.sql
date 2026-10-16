CREATE TABLE "franchise" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "franchise_pkey" PRIMARY KEY ("code")
);

-- Existing identities and achievements remain intact. The seed links known
-- identities after validating the versioned franchise catalog.
ALTER TABLE "team" ADD COLUMN "franchise_code" TEXT;

CREATE INDEX "team_franchise_code_idx" ON "team"("franchise_code");

ALTER TABLE "team" ADD CONSTRAINT "team_franchise_code_fkey"
FOREIGN KEY ("franchise_code") REFERENCES "franchise"("code")
ON DELETE RESTRICT ON UPDATE CASCADE;
