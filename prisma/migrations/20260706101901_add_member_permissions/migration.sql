-- AlterTable
ALTER TABLE "AlbumMember" ADD COLUMN     "can_delete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_upload" BOOLEAN NOT NULL DEFAULT true;
