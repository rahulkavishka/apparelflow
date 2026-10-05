"use client";

import React, { useState } from "react";
import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { IntegerInput } from "@/components/domain/IntegerInput";
import { X, Layers } from "lucide-react";

export interface RecipeDrawerComponent {
  id: string;
  componentName: string;
  piecesPerGarment: number;
  imageUrl?: string | null;
}

export interface RecipeDrawerData {
  id: string;
  recipeCode: string;
  name: string;
  category: string;
  stdFabricYards: number;
  wastageCap: number;
  components: RecipeDrawerComponent[];
}

interface RecipeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: RecipeDrawerData | null;
}

export function RecipeDrawer({ open, onOpenChange, recipe }: RecipeDrawerProps) {
  const [calcQty, setCalcQty] = useState<number>(100);

  if (!recipe) return null;

  const validQty = calcQty > 0 ? calcQty : 0;
  const totalFabric = validQty * recipe.stdFabricYards;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 h-full w-full max-w-[500px] bg-paper shadow-2xl border-l border-rule flex flex-col focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-200"
        >
          {/* Accessibility Titles */}
          <DialogPrimitive.Title className="sr-only">
            Recipe Specification: {recipe.name} ({recipe.recipeCode})
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Detailed garment recipe component specification and dynamic multiplier preview.
          </DialogPrimitive.Description>

          {/* Header */}
          <div className="p-4 border-b border-rule bg-sheet/50 flex items-start justify-between shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-[2px] bg-vat text-paper">
                  {recipe.recipeCode}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-[2px] bg-sheet border border-rule text-ink-soft font-semibold">
                  {recipe.category}
                </span>
              </div>
              <h2 className="font-display text-xl font-bold text-ink leading-tight">
                {recipe.name}
              </h2>
            </div>

            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-ink-soft hover:text-ink hover:bg-sheet rounded-[2px] cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Master Specifications KPI Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-[3px] border border-rule bg-paper space-y-0.5">
                <div className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Std fabric
                </div>
                <div className="font-display text-base font-bold tabular-nums text-ink">
                  {recipe.stdFabricYards.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-ink-soft">yds/pc</span>
                </div>
              </div>

              <div className="p-2.5 rounded-[3px] border border-rule bg-paper space-y-0.5">
                <div className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Wastage cap
                </div>
                <div className="font-display text-base font-bold tabular-nums text-ink">
                  {recipe.wastageCap.toFixed(1)}%
                </div>
              </div>

              <div className="p-2.5 rounded-[3px] border border-rule bg-paper space-y-0.5">
                <div className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Cut parts
                </div>
                <div className="font-display text-base font-bold tabular-nums text-ink">
                  {recipe.components.length}{" "}
                  <span className="text-xs font-normal text-ink-soft">pieces</span>
                </div>
              </div>
            </div>

            {/* Component Pieces Breakdown */}
            <div className="rounded-[3px] border border-rule bg-paper overflow-hidden space-y-0">
              <div className="px-3.5 py-2.5 border-b border-rule bg-sheet/40 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-ink text-xs">
                  <Layers className="w-3.5 h-3.5 text-vat" />
                  <span>Component Multipliers ({recipe.components.length} parts)</span>
                </div>
                <span className="text-[11px] text-ink-soft">1 garment</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-sheet border-b border-rule text-[11px] text-ink-soft font-bold">
                    <tr>
                      <th className="p-2.5 pl-3">Component name</th>
                      <th className="p-2.5 text-right">Multiplier</th>
                      <th className="p-2.5 pr-3 text-right">Thumbnail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule font-medium">
                    {recipe.components.map((c) => (
                      <tr key={c.id} className="hover:bg-sheet/30 transition-colors">
                        <td className="p-2.5 pl-3 font-bold text-ink">
                          {c.componentName}
                        </td>
                        <td className="p-2.5 text-right font-display text-sm font-bold tabular-nums text-ink">
                          × {c.piecesPerGarment}
                        </td>
                        <td className="p-2.5 pr-3 text-right">
                          {c.imageUrl ? (
                            <div className="inline-flex items-center justify-center p-0.5 border border-rule rounded-[2px] bg-sheet">
                              <Image
                                src={c.imageUrl}
                                alt={c.componentName}
                                width={24}
                                height={24}
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <span className="text-ink-soft text-[10px]">No image</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dynamic Multiplier Live Calculator */}
            <div className="rounded-[3px] border border-rule bg-paper p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-ink text-xs">
                  <span>Batch Multiplier Calculator</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-ink-soft font-medium">Batch size:</span>
                  <IntegerInput
                    value={calcQty}
                    onChange={(val) => setCalcQty(val ?? 1)}
                    className="w-20 h-7 text-xs font-bold text-right py-0 px-2 rounded-[2px]"
                  />
                </div>
              </div>

              <div className="border border-rule rounded-[2px] bg-sheet/40 p-2.5 space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-ink-soft">Expected total fabric:</span>
                  <span className="font-bold font-mono text-ink">
                    {totalFabric.toFixed(2)} yards
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-ink-soft">Max allowable wastage ({recipe.wastageCap}%):</span>
                  <span className="font-bold font-mono text-ink">
                    {((totalFabric * recipe.wastageCap) / 100).toFixed(2)} yards
                  </span>
                </div>
              </div>

              <div className="border border-rule rounded-[2px] bg-paper overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-sheet border-b border-rule text-[11px] text-ink-soft font-bold">
                    <tr>
                      <th className="p-2 pl-2.5">Component</th>
                      <th className="p-2 text-right">Calculation</th>
                      <th className="p-2 pr-2.5 text-right">Required pieces</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {recipe.components.map((c) => (
                      <tr key={c.id}>
                        <td className="p-2 pl-2.5 font-medium text-ink">
                          {c.componentName}
                        </td>
                        <td className="p-2 text-right text-[11px] font-mono text-ink-soft">
                          {validQty} × {c.piecesPerGarment}
                        </td>
                        <td className="p-2 pr-2.5 text-right font-display text-sm font-bold tabular-nums text-vat">
                          {validQty * c.piecesPerGarment}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
