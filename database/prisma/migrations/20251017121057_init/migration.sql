-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SETUP', 'SELLING', 'LIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "SquareStatus" AS ENUM ('AVAILABLE', 'TAKEN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'USED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PrizeDistribution" AS ENUM ('SPLIT_EQUALLY', 'FIXED_PER_POO', 'DESCENDING');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('POO_MARKED', 'PRIZE_CALCULATED', 'WINNER_NOTIFIED', 'EVENT_STATUS_CHANGED');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldCoordinates" TEXT NOT NULL,
    "gridRows" INTEGER NOT NULL,
    "gridCols" INTEGER NOT NULL,
    "squarePrice" DECIMAL(10,2) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'SETUP',
    "selectionTimeoutMinutes" INTEGER NOT NULL DEFAULT 10,
    "videoPlatform" TEXT,
    "videoStreamId" TEXT,
    "totalPrizePool" DECIMAL(10,2) NOT NULL,
    "prizeDistribution" "PrizeDistribution" NOT NULL DEFAULT 'SPLIT_EQUALLY',
    "fixedPrizePerPoo" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squares" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,
    "squareNumber" INTEGER NOT NULL,
    "polygonCoordinates" TEXT NOT NULL,
    "status" "SquareStatus" NOT NULL DEFAULT 'AVAILABLE',
    "ownerId" TEXT,
    "selectedAt" TIMESTAMP(3),

    CONSTRAINT "squares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_credits" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "paymentIntentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "square_purchases" (
    "id" TEXT NOT NULL,
    "squareId" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "customerNameInitials" TEXT NOT NULL,
    "customerFullName" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "square_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poo_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "squareId" TEXT NOT NULL,
    "pooNumber" INTEGER NOT NULL,
    "prizeAmount" DECIMAL(10,2) NOT NULL,
    "announcedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminNotes" TEXT,

    CONSTRAINT "poo_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "winner_notifications" (
    "id" TEXT NOT NULL,
    "pooEventId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "winner_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_timeline" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" "TimelineEventType" NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "squares_eventId_squareNumber_key" ON "squares"("eventId", "squareNumber");

-- CreateIndex
CREATE UNIQUE INDEX "squares_eventId_gridX_gridY_key" ON "squares"("eventId", "gridX", "gridY");

-- CreateIndex
CREATE UNIQUE INDEX "payment_credits_paymentIntentId_key" ON "payment_credits"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "square_purchases_squareId_key" ON "square_purchases"("squareId");

-- CreateIndex
CREATE UNIQUE INDEX "square_purchases_creditId_key" ON "square_purchases"("creditId");

-- CreateIndex
CREATE UNIQUE INDEX "square_purchases_confirmationCode_key" ON "square_purchases"("confirmationCode");

-- CreateIndex
CREATE UNIQUE INDEX "poo_events_eventId_pooNumber_key" ON "poo_events"("eventId", "pooNumber");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- AddForeignKey
ALTER TABLE "squares" ADD CONSTRAINT "squares_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_credits" ADD CONSTRAINT "payment_credits_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "square_purchases" ADD CONSTRAINT "square_purchases_squareId_fkey" FOREIGN KEY ("squareId") REFERENCES "squares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "square_purchases" ADD CONSTRAINT "square_purchases_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "payment_credits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poo_events" ADD CONSTRAINT "poo_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poo_events" ADD CONSTRAINT "poo_events_squareId_fkey" FOREIGN KEY ("squareId") REFERENCES "squares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winner_notifications" ADD CONSTRAINT "winner_notifications_pooEventId_fkey" FOREIGN KEY ("pooEventId") REFERENCES "poo_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_timeline" ADD CONSTRAINT "event_timeline_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
