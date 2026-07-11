ALTER TABLE "Media" ADD COLUMN "display_name" VARCHAR(100);

CREATE INDEX "Media_display_name_idx" ON "Media"("display_name");
