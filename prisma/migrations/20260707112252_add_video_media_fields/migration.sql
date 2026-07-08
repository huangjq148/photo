-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MediaType" AS ENUM ('image', 'video');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "duration_seconds" DOUBLE PRECISION;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "media_type" "MediaType" NOT NULL DEFAULT 'image';
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "original_codec" TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "original_size" BIGINT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "playback_size" BIGINT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "playback_url" TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "poster_size" BIGINT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "poster_url" TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "preview_size" BIGINT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP(3);
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "processing_error" TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "thumbnail_size" BIGINT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Photo_media_type_status_taken_at_idx" ON "Photo"("media_type", "status", "taken_at");
CREATE INDEX IF NOT EXISTS "Photo_processing_status_media_type_uploaded_at_idx" ON "Photo"("processing_status", "media_type", "uploaded_at");
