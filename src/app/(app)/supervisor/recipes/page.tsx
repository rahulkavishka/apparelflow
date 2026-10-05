"use client";

import React, { useState } from "react";
import { useRecipesList } from "@/hooks/useRecipes";
import { KPICard } from "@/components/ui/KPICard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DensityToggle, TableDensity } from "@/components/ui/DensityToggle";
import { TableLoadingRow } from "@/components/ui/LoadingSpinner";
import { RecipeDrawer, RecipeDrawerData } from "@/components/domain/RecipeDrawer";
import { Search, BookOpen, Eye } from "lucide-react";

export default function RecipesPage() {
  const { data: recipes, isLoading } = useRecipesList();
  const [search, setSearch] = useState("");
  const [density, setDensity] = useState<TableDensity>("compact");
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDrawerData | null>(null);

  const filtered = recipes
    ? recipes.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.recipeCode.toLowerCase().includes(search.toLowerCase()) ||
          r.category.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const cellPaddingClass = density === "compact" ? "py-2.5 px-3 text-xs" : "py-4 px-3.5 text-sm";
  const headerPaddingClass = density === "compact" ? "py-2.5 px-3 text-xs" : "py-3 px-3.5 text-xs";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Recipe specifications
          </h1>
          <p className="text-xs text-ink-soft">
            Master garment specifications, standard fabric allowances, wastage thresholds, and component piece multipliers.
          </p>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          title="Active recipes"
          value={recipes?.length ?? "—"}
          subtitle="Pre-seeded master styles"
          icon={<BookOpen className="w-4 h-4" />}
        />
        <KPICard
          title="Avg fabric / garment"
          value={
            recipes && recipes.length > 0
              ? `${(
                  recipes.reduce((acc, r) => acc + r.stdFabricYards, 0) / recipes.length
                ).toFixed(2)} yds`
              : "—"
          }
          subtitle="Standard consumption"
        />
        <KPICard
          title="Avg wastage cap"
          value={
            recipes && recipes.length > 0
              ? `${(
                  recipes.reduce((acc, r) => acc + r.wastageCap, 0) / recipes.length
                ).toFixed(1)}%`
              : "—"
          }
          subtitle="Quality review threshold"
        />
        <KPICard
          title="Component catalog"
          value={
            recipes
              ? recipes.reduce((acc, r) => acc + r.components.length, 0)
              : "—"
          }
          subtitle="Standard cut parts"
        />
      </div>

      {/* Search & Tooling Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-paper p-2.5 rounded-xs border border-rule">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-ink-soft absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, style name, or category..."
            className="pl-8 h-8 text-xs bg-sheet/40"
          />
        </div>

        <div className="hidden md:flex items-center gap-2 self-end sm:self-auto">
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      </div>

      {/* Recipes Table (Desktop) & Responsive Cards (Mobile) */}
      <div className="border border-rule rounded-xs bg-paper overflow-hidden shadow-none">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sheet border-b border-rule">
              <tr>
                <th className={`${headerPaddingClass} pl-4 font-bold text-ink-soft`}>Recipe code</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Garment style name</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Category</th>
                <th className={`${headerPaddingClass} text-right font-bold text-ink-soft`}>Std fabric (yds)</th>
                <th className={`${headerPaddingClass} text-right font-bold text-ink-soft`}>Wastage cap</th>
                <th className={`${headerPaddingClass} text-right font-bold text-ink-soft`}>Components</th>
                <th className={`${headerPaddingClass} pr-4 text-right font-bold text-ink-soft`}>Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {isLoading ? (
                <TableLoadingRow colSpan={7} label="Loading recipe specifications..." />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-ink-soft">
                    No recipes found matching &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRecipe(r)}
                      className="hover:bg-row-hover transition-colors cursor-pointer group"
                    >
                      <td className={`${cellPaddingClass} pl-4 font-bold font-mono text-vat whitespace-nowrap`}>
                        {r.recipeCode}
                      </td>
                      <td className={`${cellPaddingClass} font-bold text-ink group-hover:text-vat transition-colors whitespace-nowrap`}>
                        {r.name}
                      </td>
                      <td className={`${cellPaddingClass} text-ink-soft whitespace-nowrap`}>
                        {r.category}
                      </td>
                      <td className={`${cellPaddingClass} text-right font-bold tabular-nums text-ink whitespace-nowrap`}>
                        {r.stdFabricYards.toFixed(2)}
                      </td>
                      <td className={`${cellPaddingClass} text-right font-bold tabular-nums text-ink whitespace-nowrap`}>
                        <span className="px-2 py-0.5 rounded-xs bg-sheet border border-rule text-ink font-mono font-bold text-xs">
                          {r.wastageCap.toFixed(1)}%
                        </span>
                      </td>
                      <td className={`${cellPaddingClass} text-right font-bold tabular-nums text-ink whitespace-nowrap`}>
                        {r.components.length} parts
                      </td>
                      <td className={`${cellPaddingClass} pr-4 text-right whitespace-nowrap`}>
                        <div className="flex items-center justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecipe(r);
                            }}
                            className="h-7 text-xs px-2.5 font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-ink-soft" />
                            <span>Inspect parts</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (< md screens) */}
        <div className="md:hidden divide-y divide-rule">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-ink-soft">
              Loading recipe specifications...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-soft">
              No recipes found matching &quot;{search}&quot;.
            </div>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedRecipe(r)}
                className="p-3.5 space-y-2.5 bg-paper hover:bg-sheet/40 transition-colors cursor-pointer"
              >
                {/* Header: Code + Category */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs bg-vat-tint/30 text-vat border border-vat/30 px-2 py-0.5 rounded">
                    {r.recipeCode}
                  </span>
                  <span className="text-xs text-ink-soft bg-sheet px-2 py-0.5 rounded border border-rule">
                    {r.category}
                  </span>
                </div>

                {/* Style Name */}
                <div className="font-bold text-sm text-ink">{r.name}</div>

                {/* Specs 3-Grid */}
                <div className="grid grid-cols-3 gap-2 bg-sheet/40 p-2 rounded border border-rule/60 text-center">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-ink-soft">Std Fabric</div>
                    <div className="font-mono text-xs font-bold text-ink">{r.stdFabricYards.toFixed(2)} yds</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-ink-soft">Wastage Cap</div>
                    <div className="font-mono text-xs font-bold text-ink">{r.wastageCap.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-ink-soft">Cut Parts</div>
                    <div className="font-display text-xs font-bold text-ink">{r.components.length} parts</div>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex items-center justify-between pt-1 border-t border-rule/40">
                  <span className="text-xs text-ink-soft">Tap to view full spec</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRecipe(r);
                    }}
                    className="h-7 text-xs px-2.5 font-bold flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3 text-ink-soft" />
                    <span>Inspect parts</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recipe Specifications Sliding Drawer from Right */}
      <RecipeDrawer
        open={Boolean(selectedRecipe)}
        onOpenChange={(open) => !open && setSelectedRecipe(null)}
        recipe={selectedRecipe}
      />
    </div>
  );
}
