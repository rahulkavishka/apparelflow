import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { getRecipeById } from "@/services/recipes.service";

export const GET = withAuth<{ id: string }>(
  [Role.cutting_supervisor, Role.cutting_verifier],
  async ({ params }) => {
    const recipe = await getRecipeById(params.id);
    return jsonOk(recipe);
  }
);
