import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generatePassword(): string {
  return crypto.randomBytes(16).toString("base64url");
}

async function main() {
  console.log("Seeding database...");

  const adminPassword = process.env.ADMIN_PASSWORD || generatePassword();
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@ecomhub.my",
      passwordHash,
      displayName: "Admin User",
      role: "SUPER_ADMIN",
    },
  });

  const store = await prisma.store.upsert({
    where: { id: "default-store" },
    update: {},
    create: {
      id: "default-store",
      name: "EcomHub Malaysia",
      description: "Default store for EcomHub",
      currency: "MYR",
      timezone: "Asia/Kuala_Lumpur",
    },
  });

  await prisma.storeUser.upsert({
    where: { storeId_userId: { storeId: store.id, userId: admin.id } },
    update: {},
    create: { storeId: store.id, userId: admin.id },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { id: "default-warehouse" },
    update: {},
    create: {
      id: "default-warehouse",
      storeId: store.id,
      name: "KL Main Warehouse",
      address: "Kuala Lumpur, Malaysia",
      isDefault: true,
    },
  });

  const defaultChannels = [
    { code: "SHOPEE", name: "Shopee Malaysia", type: "marketplace", color: "#f97316", icon: "S" },
    { code: "LAZADA", name: "Lazada Malaysia", type: "marketplace", color: "#1e3a8a", icon: "L" },
    { code: "TIKTOK", name: "TikTok Shop", type: "marketplace", color: "#000000", icon: "T" },
    { code: "PGMALL", name: "PG Mall", type: "marketplace", color: "#dc2626", icon: "P" },
  ];

  for (const ch of defaultChannels) {
    await prisma.channel.upsert({
      where: { storeId_code: { storeId: store.id, code: ch.code } },
      update: {},
      create: {
        storeId: store.id,
        code: ch.code,
        name: ch.name,
        type: ch.type,
        color: ch.color,
        icon: ch.icon,
      },
    });
  }

  console.log("Seed completed!");
  console.log(`Admin login: admin / ${adminPassword}`);
  console.log("IMPORTANT: Save this password — it will not be shown again.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
