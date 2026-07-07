-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'video');

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "duration_seconds" DOUBLE PRECISION,
ADD COLUMN     "media_type" "MediaType" NOT NULL DEFAULT 'image',
ADD COLUMN     "original_codec" TEXT,
ADD COLUMN     "original_size" BIGINT,
ADD COLUMN     "playback_size" BIGINT,
ADD COLUMN     "playback_url" TEXT,
ADD COLUMN     "poster_size" BIGINT,
ADD COLUMN     "poster_url" TEXT,
ADD COLUMN     "preview_size" BIGINT,
ADD COLUMN     "processed_at" TIMESTAMP(3),
ADD COLUMN     "processing_error" TEXT,
ADD COLUMN     "thumbnail_size" BIGINT;

-- CreateIndex
CREATE INDEX "Photo_media_type_status_taken_at_idx" ON "Photo"("media_type", "status", "taken_at");

-- CreateIndex
CREATE INDEX "Photo_processing_status_media_type_uploaded_at_idx" ON "Photo"("processing_status", "media_type", "uploaded_at");
