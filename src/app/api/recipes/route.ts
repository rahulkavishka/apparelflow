import { Role } from "@prisma/client";
import { withAuth } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/http";
import { ForbiddenError } from "@/lib/errors";
import { listRecipes } from "@/services/recipes.service";

export const GET = withAuth(
  [Role.cutting_supervisor, Role.cutting_verifier],
  async () => {
    const recipes = await listRecipes();
    return jsonOk(recipes);
  }
);

export async function POST() {
  throw new ForbiddenError("Recipe mutation is not permitted in this system module");
}

export async function PUT() {
  throw new ForbiddenError("Recipe mutation is not permitted in this system module");
}

export async function DELETE() {
  throw new ForbiddenError("Recipe mutation is not permitted in this system module");
}
