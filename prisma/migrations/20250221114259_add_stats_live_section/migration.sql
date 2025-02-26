/*
  Warnings:

  - The values [STATS] on the enum `SectionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SectionType_new" AS ENUM ('HERO', 'CONTENT', 'HISTORY', 'TEAM', 'TIMELINE', 'PROGRESS', 'SPORTS_CARD', 'MISSION', 'GRAPH_HOW', 'GRAPH_EXAMPLE', 'EVENTS', 'STATS_LIVE', 'STANDINGS', 'LINEUP', 'FAQ', 'CONTACT', 'PRESENTATION', 'FOOTER', 'BORN', 'OUR_STRENGTHS', 'FUTURE', 'DISCOVER', 'SCORETREND_WHAT', 'TREND_OVERVIEW', 'GOAL_TREND', 'TEAM_TREND', 'TABS_UNDER_GAMES');
ALTER TABLE "Section" ALTER COLUMN "type" TYPE "SectionType_new" USING ("type"::text::"SectionType_new");
ALTER TYPE "SectionType" RENAME TO "SectionType_old";
ALTER TYPE "SectionType_new" RENAME TO "SectionType";
DROP TYPE "SectionType_old";
COMMIT;
