"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecipeCombobox } from "@/components/domain/RecipeCombobox";
import { IntegerInput } from "@/components/domain/IntegerInput";
import { DecimalInput } from "@/components/domain/DecimalInput";
import { expectedFabric, wastagePct, isOverWastageCap } from "@/domain/wastage";
import { deriveExpectedComponents } from "@/domain/multiplier";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface RecipeDto {
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

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: RecipeDto[];
  onOrderCreated: () => void;
}

export function CreateOrderModal({
  open,
  onOpenChange,
  recipes,
  onOrderCreated,
}: CreateOrderModalProps) {
  const queryClient = useQueryClient();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [targetQty, setTargetQty] = useState<number | null>(null);
  const [fabricRollId, setFabricRollId] = useState<string>("");
  const [actualFabricYds, setActualFabricYds] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedRecipeId("");
      setTargetQty(null);
      setFabricRollId("");
      setActualFabricYds("");
      setErrors({});
    }
  }, [open]);

  const activeRecipe = recipes.find((r) => r.id === selectedRecipeId);

  // Derived calculations for right column preview
  const validQty = targetQty && targetQty > 0 ? targetQty : 0;
  const expectedComponents =
    activeRecipe && validQty > 0
      ? deriveExpectedComponents(
          validQty,
          activeRecipe.components.map((c) => ({
            componentId: c.id,
            componentName: c.componentName,
            piecesPerGarment: c.piecesPerGarment,
            imageUrl: c.imageUrl,
          }))
        )
      : [];

  const actualYdsNum = parseFloat(actualFabricYds);
  const validActualYds = !Number.isNaN(actualYdsNum) && actualYdsNum > 0 ? actualYdsNum : 0;
  const expFabric = activeRecipe && validQty > 0 ? expectedFabric(validQty, activeRecipe.stdFabricYards) : 0;
  const wastage =
    expFabric > 0 && validActualYds > 0 ? wastagePct(validActualYds, expFabric) : 0;
  const isOverCap = activeRecipe ? isOverWastageCap(wastage, activeRecipe.wastageCap) : false;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selectedRecipeId) errs.recipeId = "Choose a recipe.";
    if (!targetQty || targetQty <= 0) errs.targetQty = "Use 1 or more.";
    if (!fabricRollId || !/^[A-Z0-9-]+$/.test(fabricRollId.trim()) || fabricRollId.trim().length < 3) {
      errs.fabricRollId = "Use 3 to 40 letters, digits or hyphens, like FAB-ROLL-882.";
    }
    const fabricNum = parseFloat(actualFabricYds);
    if (Number.isNaN(fabricNum) || fabricNum <= 0) {
      errs.actualFabricYds = "Enter yards as a positive number with at most 2 decimals.";
    } else {
      const parts = actualFabricYds.split(".");
      if (parts[1] && parts[1].length > 2) {
        errs.actualFabricYds = "Use at most 2 decimal places.";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async (autoSubmit: boolean) => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // 1. Create order
      const createRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: selectedRecipeId,
          targetQty: targetQty!,
          fabricRollId: fabricRollId.trim().toUpperCase(),
          actualFabricYds: parseFloat(actualFabricYds),
        }),
      });

      const createJson = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createJson.error?.message || "Failed to create cutting order");
      }

      const orderId = createJson.data.id;

      // 2. If user clicked "Send to verification", submit immediately
      if (autoSubmit) {
        const submitRes = await fetch(`/api/orders/${orderId}/submit`, {
          method: "POST",
        });
        const submitJson = await submitRes.json();
        if (!submitRes.ok) {
          throw new Error(submitJson.error?.message || "Failed to submit order for verification");
        }
        toast.success(`Cutting order ${createJson.data.orderNo} sent to verification.`);
      } else {
        toast.success(`Cutting order ${createJson.data.orderNo} created as draft.`);
      }

      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["verificationQueue"] });

      onOrderCreated();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create order";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-220 w-[95vw] sm:w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-rule pb-2.5 sm:pb-3">
          <DialogTitle className="text-lg sm:text-xl font-bold text-ink">
            Create cutting order
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left Column: Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="recipe-select" className="text-sm font-bold text-ink">
                Recipe
              </Label>
              <RecipeCombobox
                id="recipe-select"
                recipes={recipes}
                value={selectedRecipeId}
                onChange={(val) => {
                  setSelectedRecipeId(val);
                  setErrors((prev) => ({ ...prev, recipeId: "" }));
                }}
                placeholder="Search and select a recipe..."
                disabled={isSubmitting}
              />
              {errors.recipeId && (
                <p className="text-xs text-short-fg font-medium">{errors.recipeId}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target-qty" className="text-sm font-bold text-ink">
                Target quantity
              </Label>
              <IntegerInput
                id="target-qty"
                value={targetQty}
                onChange={(val) => {
                  setTargetQty(val);
                  setErrors((prev) => ({ ...prev, targetQty: "" }));
                }}
                disabled={isSubmitting}
                placeholder="50"
              />
              {errors.targetQty && (
                <p className="text-xs text-short-fg font-medium">{errors.targetQty}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fabric-roll" className="text-sm font-bold text-ink">
                Fabric roll ID
              </Label>
              <Input
                id="fabric-roll"
                type="text"
                value={fabricRollId}
                onChange={(e) => {
                  setFabricRollId(e.target.value.toUpperCase());
                  setErrors((prev) => ({ ...prev, fabricRollId: "" }));
                }}
                placeholder="FAB-ROLL-882"
                disabled={isSubmitting}
              />
              {errors.fabricRollId && (
                <p className="text-xs text-short-fg font-medium">{errors.fabricRollId}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fabric-used" className="text-sm font-bold text-ink">
                Actual fabric used (yards)
              </Label>
              <DecimalInput
                id="fabric-used"
                value={actualFabricYds}
                onChange={(val) => {
                  setActualFabricYds(val);
                  setErrors((prev) => ({ ...prev, actualFabricYds: "" }));
                }}
                placeholder="94.50"
                disabled={isSubmitting}
              />
              {errors.actualFabricYds && (
                <p className="text-xs text-short-fg font-medium">{errors.actualFabricYds}</p>
              )}
            </div>
          </div>

          {/* Right Column: Live Expected Pieces Multiplier & Fabric Preview */}
          <div className="rounded-sm border border-rule bg-sheet p-4 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-ink mb-1">
                Expected pieces (Multiplier preview)
              </h4>
              <p className="text-xs text-ink-soft">
                Derived dynamically: target quantity × pieces per garment.
              </p>
            </div>

            <div className="border border-rule rounded-xs bg-paper overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-sheet border-b border-rule">
                  <tr>
                    <th className="p-2 text-left font-bold text-ink-soft">Component</th>
                    <th className="p-2 text-right font-bold text-ink-soft">Per</th>
                    <th className="p-2 text-right font-bold text-ink-soft">Expected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule font-medium">
                  {expectedComponents.map((c) => (
                    <tr key={c.componentId}>
                      <td className="p-2 text-ink">{c.componentName}</td>
                      <td className="p-2 text-right tabular-nums text-ink-soft">
                        {c.piecesPerGarment}
                      </td>
                      <td className="p-2 text-right font-bold tabular-nums text-ink">
                        {c.expectedQty}
                      </td>
                    </tr>
                  ))}
                  {expectedComponents.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-ink-soft">
                        {!selectedRecipeId
                          ? "Select a recipe and enter quantity to preview components."
                          : "Enter a valid target quantity to preview components."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Fabric Figures */}
            <div className="rounded-xs border border-rule bg-paper p-3 space-y-2 text-xs">
              <div className="flex justify-between text-ink-soft">
                <span>Standard fabric per piece:</span>
                <span className="font-bold text-ink">
                  {activeRecipe ? `${activeRecipe.stdFabricYards.toFixed(2)} yds` : "—"}
                </span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Expected fabric:</span>
                <span className="font-bold text-ink">
                  {activeRecipe && validQty > 0 ? `${expFabric.toFixed(2)} yds` : "—"}
                </span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Fabric wastage cap:</span>
                <span className="font-bold text-ink">
                  {activeRecipe ? `${activeRecipe.wastageCap.toFixed(1)}%` : "—"}
                </span>
              </div>
              <div className="border-t border-rule pt-2 flex items-baseline justify-between">
                <span className="font-bold text-ink">Wastage preview:</span>
                <div className="text-right">
                  <span
                    className={`font-display text-lg font-bold tabular-nums ${
                      activeRecipe && validQty > 0 && validActualYds > 0
                        ? isOverCap
                          ? "text-excess-fg"
                          : "text-ink"
                        : "text-ink-soft"
                    }`}
                  >
                    {activeRecipe && validQty > 0 && validActualYds > 0
                      ? wastage > 0
                        ? `+${wastage.toFixed(2)}%`
                        : `${wastage.toFixed(2)}%`
                      : "—"}
                  </span>
                  <div className="text-[10px] text-ink-soft">
                    {activeRecipe && validQty > 0 && validActualYds > 0
                      ? isOverCap
                        ? `Over cap by ${(wastage - activeRecipe.wastageCap).toFixed(1)} points (batch can proceed)`
                        : "Within cap"
                      : "Enter quantity & fabric to preview"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-rule pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => handleCreate(false)}
          >
            Save draft
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting}
            onClick={() => handleCreate(true)}
            className="flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-paper" />
                <span>Creating order...</span>
              </>
            ) : (
              "Send to verification"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
