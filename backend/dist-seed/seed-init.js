"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Production-safe initialisation seed.
 * Runs at every container start but bails out immediately if accounts already exist.
 * This means it is idempotent — safe to run on every deployment.
 */
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const count = await prisma.authAccount.count();
    if (count > 0) {
        console.log(`[seed-init] ${count} account(s) already exist — skipping seed.`);
        return;
    }
    console.log('[seed-init] Empty database detected — seeding initial accounts…');
    const [adminHash, analystHash] = await Promise.all([
        bcrypt_1.default.hash('admin123', 12),
        bcrypt_1.default.hash('analyst123', 12),
    ]);
    await prisma.authAccount.createMany({
        data: [
            {
                email: 'admin@insightguardian.io',
                passwordHash: adminHash,
                name: 'Admin Operator',
                appRole: 'Administrator',
            },
            {
                email: 'analyst@insightguardian.io',
                passwordHash: analystHash,
                name: 'SOC Analyst',
                appRole: 'Analyst',
            },
        ],
    });
    console.log('[seed-init] ✓ Created admin@insightguardian.io (admin123) and analyst@insightguardian.io (analyst123)');
}
main()
    .catch((e) => {
    console.error('[seed-init] Failed:', e);
    process.exit(1);
})
    .finally(() => {
    void prisma.$disconnect();
});
