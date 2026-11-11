-- Preserve all existing course values while allowing new registrations to omit one.
ALTER TABLE "teams" ALTER COLUMN "course" DROP NOT NULL;
