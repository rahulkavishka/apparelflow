import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export async function listRecipes() {
  const recipes = await prisma.recipe.findMany({
    include: {
      components: {
        orderBy: { componentName: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return recipes.map((r) => ({
    id: r.id,
    recipeCode: r.recipeCode,
    name: r.name,
    category: r.category,
    stdFabricYards: Number(r.stdFabricYards),
    wastageCap: Number(r.wastageCap),
    components: r.components.map((c) => ({
      id: c.id,
      componentName: c.componentName,
      piecesPerGarment: c.piecesPerGarment,
      imageUrl: c.imageUrl,
    })),
  }));
}

export async function getRecipeById(id: string) {
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      components: {
        orderBy: { componentName: "asc" },
      },
    },
  });

  if (!recipe) {
    throw new NotFoundError("Recipe not found");
  }

  return {
    id: recipe.id,
    recipeCode: recipe.recipeCode,
    name: recipe.name,
    category: recipe.category,
    stdFabricYards: Number(recipe.stdFabricYards),
    wastageCap: Number(recipe.wastageCap),
    components: recipe.components.map((c) => ({
      id: c.id,
      componentName: c.componentName,
      piecesPerGarment: c.piecesPerGarment,
      imageUrl: c.imageUrl,
    })),
  };
}
