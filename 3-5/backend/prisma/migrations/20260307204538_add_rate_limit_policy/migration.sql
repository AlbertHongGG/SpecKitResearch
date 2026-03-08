-- CreateTable
CREATE TABLE "RateLimitPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "defaultPerMinute" INTEGER NOT NULL,
    "defaultPerHour" INTEGER NOT NULL,
    "capPerMinute" INTEGER NOT NULL,
    "capPerHour" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
