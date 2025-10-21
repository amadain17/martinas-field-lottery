-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "squarePrice" DECIMAL NOT NULL DEFAULT 0,
    "gridCols" INTEGER NOT NULL DEFAULT 10,
    "gridRows" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "teamAName" TEXT,
    "teamBName" TEXT,
    "teamAScore" INTEGER,
    "teamBScore" INTEGER,
    "prizePools" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "squares" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "squareNumber" INTEGER NOT NULL,
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'A1',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "ownerId" TEXT,
    "selectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "squares_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_credits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "paymentIntentId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_credits_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "square_purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "squareId" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "customerNameInitials" TEXT NOT NULL,
    "customerFullName" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "square_purchases_squareId_fkey" FOREIGN KEY ("squareId") REFERENCES "squares" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "square_purchases_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "payment_credits" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_timeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_timeline_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "squares_eventId_squareNumber_key" ON "squares"("eventId", "squareNumber");

-- CreateIndex
CREATE UNIQUE INDEX "squares_eventId_gridX_gridY_key" ON "squares"("eventId", "gridX", "gridY");

-- CreateIndex
CREATE UNIQUE INDEX "squares_eventId_position_key" ON "squares"("eventId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "payment_credits_paymentIntentId_key" ON "payment_credits"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "square_purchases_squareId_key" ON "square_purchases"("squareId");

-- CreateIndex
CREATE UNIQUE INDEX "square_purchases_creditId_key" ON "square_purchases"("creditId");

-- CreateIndex
CREATE UNIQUE INDEX "square_purchases_confirmationCode_key" ON "square_purchases"("confirmationCode");
