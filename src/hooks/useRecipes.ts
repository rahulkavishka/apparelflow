import { useQuery } from "@tanstack/react-query";

export interface RecipeDto {
  id: string;
  recipeCode: string;
  name: string;
  category: string;
  stdFabricYards: number;
  wastageCap: number;
  components: {
    id: string;
    componentName: string;
    piecesPerGarment: number;
    imageUrl?: string | null;
  }[];
}

export function useRecipesList() {
  return useQuery<RecipeDto[]>({
    queryKey: ["recipes"],
    queryFn: async () => {
      const res = await fetch("/api/recipes");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load recipes");
      return json.data;
    },
    staleTime: 60_000,
  });
}
