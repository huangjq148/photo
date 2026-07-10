-- Drop deprecated Space tables
DROP TABLE IF EXISTS "SpaceInvite" CASCADE;
DROP TABLE IF EXISTS "SpaceMember" CASCADE;
DROP TABLE IF EXISTS "Space" CASCADE;

-- Drop deprecated enums
DROP TYPE IF EXISTS "SpaceType" CASCADE;
DROP TYPE IF EXISTS "SpaceRole" CASCADE;
DROP TYPE IF EXISTS "InviteStatus" CASCADE;
