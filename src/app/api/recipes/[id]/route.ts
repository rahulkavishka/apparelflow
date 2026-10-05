import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { ForbiddenError } from "@/lib/errors";
import { getRecipeById } from "@/services/recipes.service";

export const GET = withAuth<{ id: string }>(
  [Role.cutting_supervisor, Role.cutting_verifier],
  async ({ params }) => {
    const recipe = await getRecipeById(params.id);
    return jsonOk(recipe);
  }
);

export const PUT = withAuth<{ id: string }>(
  [Role.cutting_supervisor, Role.cutting_verifier, Role.sewing_supervisor],
  async () => {
    throw new ForbiddenError("Recipe mutation is not permitted in this system module");
  }
);

export const DELETE = withAuth<{ id: string }>(
  [Role.cutting_supervisor, Role.cutting_verifier, Role.sewing_supervisor],
  async () => {
    throw new ForbiddenError("Recipe mutation is not permitted in this system module");
  }
);
