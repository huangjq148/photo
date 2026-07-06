-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('personal', 'shared');

-- CreateEnum
CREATE TYPE "SpaceRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'expired');

-- CreateEnum
CREATE TYPE "PhotoProcessingStatus" AS ENUM ('pending', 'processing', 'normal', 'failed');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('normal', 'deleted');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar_url" TEXT,
    "storage_limit" BIGINT NOT NULL DEFAULT 10737418240,
    "storage_used" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Space" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "SpaceType" NOT NULL,
    "owner_id" UUID NOT NULL,
    "cover_photo_id" UUID,
    "storage_used" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceMember" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "SpaceRole" NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceInvite" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "SpaceRole" NOT NULL,
    "invited_by" UUID NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cover_photo_id" UUID,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_immutable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumMember" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlbumMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumInvite" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "invited_by" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlbumInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "uploader_id" UUID NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
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
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PhotoStatus" NOT NULL DEFAULT 'normal',
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumPhoto" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "photo_id" UUID NOT NULL,
    "added_by" UUID NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlbumPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "photo_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoShare" (
    "id" UUID NOT NULL,
    "photo_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "PhotoShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Space_owner_id_type_idx" ON "Space"("owner_id", "type");

-- CreateIndex
CREATE INDEX "SpaceMember_user_id_role_idx" ON "SpaceMember"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceMember_space_id_user_id_key" ON "SpaceMember"("space_id", "user_id");

-- CreateIndex
CREATE INDEX "SpaceInvite_space_id_email_status_idx" ON "SpaceInvite"("space_id", "email", "status");

-- CreateIndex
CREATE INDEX "Album_creator_id_created_at_idx" ON "Album"("creator_id", "created_at");

-- CreateIndex
CREATE INDEX "AlbumMember_user_id_joined_at_idx" ON "AlbumMember"("user_id", "joined_at");

-- CreateIndex
CREATE UNIQUE INDEX "AlbumMember_album_id_user_id_key" ON "AlbumMember"("album_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AlbumInvite_token_key" ON "AlbumInvite"("token");

-- CreateIndex
CREATE INDEX "AlbumInvite_album_id_email_status_idx" ON "AlbumInvite"("album_id", "email", "status");

-- CreateIndex
CREATE INDEX "Photo_album_id_status_uploaded_at_idx" ON "Photo"("album_id", "status", "uploaded_at");

-- CreateIndex
CREATE INDEX "Photo_uploader_id_idx" ON "Photo"("uploader_id");

-- CreateIndex
CREATE INDEX "Photo_checksum_idx" ON "Photo"("checksum");

-- CreateIndex
CREATE INDEX "Photo_deleted_at_idx" ON "Photo"("deleted_at");

-- CreateIndex
CREATE INDEX "AlbumPhoto_photo_id_idx" ON "AlbumPhoto"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "AlbumPhoto_album_id_photo_id_key" ON "AlbumPhoto"("album_id", "photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_user_id_photo_id_key" ON "Favorite"("user_id", "photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoShare_token_key" ON "PhotoShare"("token");

-- CreateIndex
CREATE INDEX "PhotoShare_photo_id_revoked_at_idx" ON "PhotoShare"("photo_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceMember" ADD CONSTRAINT "SpaceMember_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceMember" ADD CONSTRAINT "SpaceMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceInvite" ADD CONSTRAINT "SpaceInvite_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceInvite" ADD CONSTRAINT "SpaceInvite_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_cover_photo_id_fkey" FOREIGN KEY ("cover_photo_id") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumMember" ADD CONSTRAINT "AlbumMember_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumMember" ADD CONSTRAINT "AlbumMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumInvite" ADD CONSTRAINT "AlbumInvite_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumInvite" ADD CONSTRAINT "AlbumInvite_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPhoto" ADD CONSTRAINT "AlbumPhoto_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPhoto" ADD CONSTRAINT "AlbumPhoto_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPhoto" ADD CONSTRAINT "AlbumPhoto_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoShare" ADD CONSTRAINT "PhotoShare_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoShare" ADD CONSTRAINT "PhotoShare_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

