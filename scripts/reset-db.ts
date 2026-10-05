import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Resetting database with TRUNCATE CASCADE...");

  // TRUNCATE CASCADE cleanly bypasses row-level triggers (e.g. forbid_log_mutation, lock_verified_items)
  // and resets auto-incrementing identity sequences (RESTART IDENTITY).
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      verification_logs, 
      verification_items, 
      cutting_orders, 
      recipe_components, 
      recipes, 
      users 
    RESTART IDENTITY CASCADE;
  `);

  console.log("✅ All operational and configuration tables truncated and sequences reset.");

  console.log("\n🌱 Seeding database with official seed data...");

  // 1. Seed Official Demo Users (12 rounds salt)
  const passwordSalt = 12;
  const supervisorHash = await bcrypt.hash("Supervisor@123", passwordSalt);
  const verifierHash = await bcrypt.hash("Verifier@123", passwordSalt);
  const sewingHash = await bcrypt.hash("Sewing@123", passwordSalt);

  const supervisor = await prisma.user.create({
    data: {
      email: "supervisor@apparelflow.demo",
      passwordHash: supervisorHash,
      fullName: "Nimali Perera",
      role: Role.cutting_supervisor,
    },
  });

  const verifier = await prisma.user.create({
    data: {
      email: "verifier@apparelflow.demo",
      passwordHash: verifierHash,
      fullName: "Kasun Fernando",
      role: Role.cutting_verifier,
    },
  });

  const sewing = await prisma.user.create({
    data: {
      email: "sewing@apparelflow.demo",
      passwordHash: sewingHash,
      fullName: "Dilani Silva",
      role: Role.sewing_supervisor,
    },
  });

  console.log(`- Seeded 3 demo users:`);
  console.log(`  1. Supervisor: ${supervisor.email} (Role: ${supervisor.role})`);
  console.log(`  2. Verifier:   ${verifier.email} (Role: ${verifier.role})`);
  console.log(`  3. Sewing:     ${sewing.email} (Role: ${sewing.role})`);

  // 2. Seed Recipe A: Casual Blouse (REC-BL01)
  const blouse = await prisma.recipe.create({
    data: {
      recipeCode: "REC-BL01",
      name: "Casual Blouse",
      category: "Blouse",
      stdFabricYards: 1.8,
      wastageCap: 5.0,
      components: {
        create: [
          { componentName: "Front Body Panel", piecesPerGarment: 1, imageUrl: "/components/front-panel.svg" },
          { componentName: "Back Body Panel", piecesPerGarment: 1, imageUrl: "/components/back-panel.svg" },
          { componentName: "Sleeves (Left & Right)", piecesPerGarment: 2, imageUrl: "/components/sleeves.svg" },
          { componentName: "Collar & Stand", piecesPerGarment: 1, imageUrl: "/components/collar.svg" },
          { componentName: "Sleeve Cuffs", piecesPerGarment: 2, imageUrl: "/components/cuff.svg" },
        ],
      },
    },
  });

  // 3. Seed Recipe B: Crop Top (REC-CT02)
  const cropTop = await prisma.recipe.create({
    data: {
      recipeCode: "REC-CT02",
      name: "Crop Top",
      category: "Crop Top",
      stdFabricYards: 1.1,
      wastageCap: 8.0,
      components: {
        create: [
          { componentName: "Front Chest Panel", piecesPerGarment: 1, imageUrl: "/components/chest-panel.svg" },
          { componentName: "Back Support Panel", piecesPerGarment: 1, imageUrl: "/components/support-panel.svg" },
          { componentName: "Neck Binding Strip", piecesPerGarment: 1, imageUrl: "/components/neck-binding.svg" },
          { componentName: "Hem Elastic Casing", piecesPerGarment: 1, imageUrl: "/components/elastic-casing.svg" },
          { componentName: "Side Strap Accents", piecesPerGarment: 2, imageUrl: "/components/strap-accents.svg" },
        ],
      },
    },
  });

  console.log(`- Seeded 2 recipes with 5 components each:`);
  console.log(`  1. ${blouse.name} (${blouse.recipeCode})`);
  console.log(`  2. ${cropTop.name} (${cropTop.recipeCode})`);

  // 4. Verify counts
  const userCount = await prisma.user.count();
  const recipeCount = await prisma.recipe.count();
  const compCount = await prisma.recipeComponent.count();
  const orderCount = await prisma.cuttingOrder.count();
  const logCount = await prisma.verificationLog.count();

  console.log("\n📊 Final Database State:");
  console.log(`  - Users:             ${userCount}`);
  console.log(`  - Recipes:           ${recipeCount}`);
  console.log(`  - Recipe Components: ${compCount}`);
  console.log(`  - Cutting Orders:    ${orderCount}`);
  console.log(`  - Verification Logs: ${logCount}`);

  console.log("\n✅ Database has been completely reset with ONLY official seed data.");
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
