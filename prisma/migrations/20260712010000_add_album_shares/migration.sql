CREATE TABLE "AlbumShare" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "allow_download" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "AlbumShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AlbumShare_token_key" ON "AlbumShare"("token");
CREATE INDEX "AlbumShare_album_id_revoked_at_idx" ON "AlbumShare"("album_id", "revoked_at");

ALTER TABLE "AlbumShare" ADD CONSTRAINT "AlbumShare_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlbumShare" ADD CONSTRAINT "AlbumShare_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
