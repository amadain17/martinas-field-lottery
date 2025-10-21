-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_payment_credits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "paymentIntentId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_credits_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payment_credits" ("amount", "createdAt", "customerEmail", "customerName", "customerPhone", "eventId", "expiresAt", "id", "paymentIntentId", "status") SELECT "amount", "createdAt", "customerEmail", "customerName", "customerPhone", "eventId", "expiresAt", "id", "paymentIntentId", "status" FROM "payment_credits";
DROP TABLE "payment_credits";
ALTER TABLE "new_payment_credits" RENAME TO "payment_credits";
CREATE UNIQUE INDEX "payment_credits_paymentIntentId_key" ON "payment_credits"("paymentIntentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
