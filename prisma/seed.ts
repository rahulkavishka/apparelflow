import { PrismaClient, Role, OrderStatus, ItemStatus, Decision } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Seed Demo Users
  const passwordSalt = 12;
  const supervisorHash = await bcrypt.hash("Supervisor@123", passwordSalt);
  const verifierHash = await bcrypt.hash("Verifier@123", passwordSalt);
  const sewingHash = await bcrypt.hash("Sewing@123", passwordSalt);

  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@apparelflow.demo" },
    update: {
      passwordHash: supervisorHash,
      fullName: "Nimali Perera",
      role: Role.cutting_supervisor,
    },
    create: {
      email: "supervisor@apparelflow.demo",
      passwordHash: supervisorHash,
      fullName: "Nimali Perera",
      role: Role.cutting_supervisor,
    },
  });

  const verifier = await prisma.user.upsert({
    where: { email: "verifier@apparelflow.demo" },
    update: {
      passwordHash: verifierHash,
      fullName: "Kasun Fernando",
      role: Role.cutting_verifier,
    },
    create: {
      email: "verifier@apparelflow.demo",
      passwordHash: verifierHash,
      fullName: "Kasun Fernando",
      role: Role.cutting_verifier,
    },
  });

  const sewing = await prisma.user.upsert({
    where: { email: "sewing@apparelflow.demo" },
    update: {
      passwordHash: sewingHash,
      fullName: "Dilani Silva",
      role: Role.sewing_supervisor,
    },
    create: {
      email: "sewing@apparelflow.demo",
      passwordHash: sewingHash,
      fullName: "Dilani Silva",
      role: Role.sewing_supervisor,
    },
  });

  console.log("Users seeded successfully.");

  // 2. Seed Recipe A: Casual Blouse (REC-BL01)
  const blouse = await prisma.recipe.upsert({
    where: { recipeCode: "REC-BL01" },
    update: {
      name: "Casual Blouse",
      category: "Blouse",
      stdFabricYards: 1.8,
      wastageCap: 5.0,
    },
    create: {
      recipeCode: "REC-BL01",
      name: "Casual Blouse",
      category: "Blouse",
      stdFabricYards: 1.8,
      wastageCap: 5.0,
    },
  });

  const blouseComponents = [
    { componentName: "Front Body Panel", piecesPerGarment: 1, imageUrl: "/components/front-panel.svg" },
    { componentName: "Back Body Panel", piecesPerGarment: 1, imageUrl: "/components/back-panel.svg" },
    { componentName: "Sleeves (Left & Right)", piecesPerGarment: 2, imageUrl: "/components/sleeves.svg" },
    { componentName: "Collar & Stand", piecesPerGarment: 1, imageUrl: "/components/collar.svg" },
    { componentName: "Sleeve Cuffs", piecesPerGarment: 2, imageUrl: "/components/cuff.svg" },
  ];

  for (const comp of blouseComponents) {
    await prisma.recipeComponent.upsert({
      where: {
        recipeId_componentName: {
          recipeId: blouse.id,
          componentName: comp.componentName,
        },
      },
      update: {
        piecesPerGarment: comp.piecesPerGarment,
        imageUrl: comp.imageUrl,
      },
      create: {
        recipeId: blouse.id,
        componentName: comp.componentName,
        piecesPerGarment: comp.piecesPerGarment,
        imageUrl: comp.imageUrl,
      },
    });
  }

  // 3. Seed Recipe B: Crop Top (REC-CT02)
  const cropTop = await prisma.recipe.upsert({
    where: { recipeCode: "REC-CT02" },
    update: {
      name: "Crop Top",
      category: "Crop Top",
      stdFabricYards: 1.1,
      wastageCap: 8.0,
    },
    create: {
      recipeCode: "REC-CT02",
      name: "Crop Top",
      category: "Crop Top",
      stdFabricYards: 1.1,
      wastageCap: 8.0,
    },
  });

  const cropTopComponents = [
    { componentName: "Front Chest Panel", piecesPerGarment: 1, imageUrl: "/components/chest-panel.svg" },
    { componentName: "Back Support Panel", piecesPerGarment: 1, imageUrl: "/components/support-panel.svg" },
    { componentName: "Neck Binding Strip", piecesPerGarment: 1, imageUrl: "/components/neck-binding.svg" },
    { componentName: "Hem Elastic Casing", piecesPerGarment: 1, imageUrl: "/components/elastic-casing.svg" },
    { componentName: "Side Strap Accents", piecesPerGarment: 2, imageUrl: "/components/strap-accents.svg" },
  ];

  for (const comp of cropTopComponents) {
    await prisma.recipeComponent.upsert({
      where: {
        recipeId_componentName: {
          recipeId: cropTop.id,
          componentName: comp.componentName,
        },
      },
      update: {
        piecesPerGarment: comp.piecesPerGarment,
        imageUrl: comp.imageUrl,
      },
      create: {
        recipeId: cropTop.id,
        componentName: comp.componentName,
        piecesPerGarment: comp.piecesPerGarment,
        imageUrl: comp.imageUrl,
      },
    });
  }

  console.log("Recipes and components seeded successfully.");

  // 4. Optional Demo Orders if enabled
  if (process.env.SEED_DEMO_ORDERS === "true") {
    console.log("Seeding demo orders...");
    // Check if demo orders exist
    const existingOrders = await prisma.cuttingOrder.count();
    if (existingOrders === 0) {
      const components = await prisma.recipeComponent.findMany({
        where: { recipeId: blouse.id },
      });

      // Order 1: PENDING_VERIFICATION (ready to count)
      const order1 = await prisma.cuttingOrder.create({
        data: {
          orderNo: "CUT-000001",
          recipeId: blouse.id,
          targetQty: 50,
          fabricRollId: "FAB-ROLL-882",
          actualFabricYds: 94.5,
          status: OrderStatus.PENDING_VERIFICATION,
          createdById: supervisor.id,
          submittedAt: new Date(),
          items: {
            create: components.map((c) => ({
              componentId: c.id,
              expectedQty: 50 * c.piecesPerGarment,
            })),
          },
        },
      });

      // Order 2: VERIFIED (in Sewing Queue)
      const expectedYds = 50 * 1.8;
      const actualYds = 92.5;
      const wastage = ((actualYds - expectedYds) / expectedYds) * 100;
      const order2 = await prisma.cuttingOrder.create({
        data: {
          orderNo: "CUT-000002",
          recipeId: blouse.id,
          targetQty: 50,
          fabricRollId: "FAB-ROLL-880",
          actualFabricYds: actualYds,
          status: OrderStatus.VERIFIED,
          createdById: supervisor.id,
          submittedAt: new Date(Date.now() - 3600000),
          verifiedAt: new Date(),
          items: {
            create: components.map((c) => ({
              componentId: c.id,
              expectedQty: 50 * c.piecesPerGarment,
              actualQty: 50 * c.piecesPerGarment,
              status: ItemStatus.GREEN,
            })),
          },
          logs: {
            create: {
              verifierId: verifier.id,
              decision: Decision.APPROVED,
              wastagePct: wastage,
              varianceSnapshot: {
                components: components.map((c) => ({
                  name: c.componentName,
                  expected: 50 * c.piecesPerGarment,
                  actual: 50 * c.piecesPerGarment,
                  variance: 0,
                  status: "GREEN",
                })),
                expectedFabricYds: expectedYds,
                actualFabricYds: actualYds,
                wastagePct: wastage,
                wastageCap: 5.0,
              },
            },
          },
        },
      });

      console.log("Demo orders created:", order1.orderNo, order2.orderNo);
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
