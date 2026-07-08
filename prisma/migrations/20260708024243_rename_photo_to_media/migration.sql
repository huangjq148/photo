/*
  Warnings:

  - You are about to drop the `Photo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Album" DROP CONSTRAINT "Album_cover_photo_id_fkey";

-- DropForeignKey
ALTER TABLE "AlbumPhoto" DROP CONSTRAINT "AlbumPhoto_photo_id_fkey";

-- DropForeignKey
ALTER TABLE "Favorite" DROP CONSTRAINT "Favorite_photo_id_fkey";

-- DropForeignKey
ALTER TABLE "Photo" DROP CONSTRAINT "Photo_album_id_fkey";

-- DropForeignKey
ALTER TABLE "Photo" DROP CONSTRAINT "Photo_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "Photo" DROP CONSTRAINT "Photo_uploader_id_fkey";

-- DropForeignKey
ALTER TABLE "PhotoShare" DROP CONSTRAINT "PhotoShare_photo_id_fkey";

-- DropTable
DROP TABLE "Photo";

-- CreateTable
CREATE TABLE "Media" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "uploader_id" UUID NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "media_type" "MediaType" NOT NULL DEFAULT 'image',
    "duration_seconds" DOUBLE PRECISION,
    "size" BIGINT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "original_url" TEXT NOT NULL,
    "preview_url" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "checksum" TEXT,
    "processing_status" "PhotoProcessingStatus" NOT NULL DEFAULT 'pending',
    "taken_at" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PhotoStatus" NOT NULL DEFAULT 'normal',
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Media_album_id_status_uploaded_at_idx" ON "Media"("album_id", "status", "uploaded_at");

-- CreateIndex
CREATE INDEX "Media_uploader_id_idx" ON "Media"("uploader_id");

-- CreateIndex
CREATE INDEX "Media_checksum_idx" ON "Media"("checksum");

-- CreateIndex
CREATE INDEX "Media_deleted_at_idx" ON "Media"("deleted_at");

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_cover_photo_id_fkey" FOREIGN KEY ("cover_photo_id") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPhoto" ADD CONSTRAINT "AlbumPhoto_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoShare" ADD CONSTRAINT "PhotoShare_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
