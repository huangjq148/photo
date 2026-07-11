-- Add child album metadata
ALTER TABLE "Album"
ADD COLUMN     "is_child_album" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "child_birth_date" DATE;

ALTER TABLE "Album"
ADD CONSTRAINT "Album_child_birth_date_required_when_child"
CHECK (NOT "is_child_album" OR "child_birth_date" IS NOT NULL);
