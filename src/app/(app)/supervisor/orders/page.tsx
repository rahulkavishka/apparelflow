"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stamp } from "@/components/domain/Stamp";
import { CreateOrderModal } from "@/components/domain/CreateOrderModal";
import { toast } from "sonner";
import { OrderStatus } from "@prisma/client";

interface OrderListItem {
  id: string;
  orderNo: string;
  status: OrderStatus;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  expectedFabricYds: number;
  wastagePct: number;
  recipe: {
    id: string;
    recipeCode: string;
    name: string;
    wastageCap: number;
  };
  createdBy: {
    id: string;
    fullName: string;
  };
  createdAt: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  lastRejectionReason: string | null;
}

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

export default function SupervisorOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeDto[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRecipes = async () => {
    try {
      const res = await fetch("/api/recipes");
      const json = await res.json();
      if (res.ok) {
        setRecipes(json.data);
      }
    } catch {
      toast.error("Failed to load recipes");
    }
  };

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = selectedStatus !== "ALL" ? `?status=${selectedStatus}` : "";
      const res = await fetch(`/api/orders${query}`);
      const json = await res.json();
      if (res.ok) {
        setOrders(json.data.orders);
      } else {
        toast.error(json.error?.message || "Failed to load cutting orders");
      }
    } catch {
      toast.error("Network error loading orders");
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchRecipes();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSubmitOrder = async (orderId: string, orderNo: string) => {
    setActionLoadingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/submit`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to submit order");

      toast.success(`Cutting order ${orderNo} sent to verification.`);
      fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit order";
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRecutOrder = async (orderId: string, orderNo: string) => {
    setActionLoadingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/recut`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to initiate re-cut");

      toast.success(`Order ${orderNo} returned to cutting in progress for re-cut.`);
      fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate re-cut";
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Main Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Cutting orders
          </h1>
          <p className="text-sm text-ink-soft">
            Manage cutting batches, derive expected parts, and send bundles to verification.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="text-base font-bold shrink-0"
        >
          Create cutting order
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-ink">Status</span>
        <div className="w-56">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-10 text-sm font-medium">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All orders</SelectItem>
              <SelectItem value="CUTTING_IN_PROGRESS">Cutting</SelectItem>
              <SelectItem value="PENDING_VERIFICATION">Pending verification</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-rule rounded-[2px] bg-paper overflow-x-auto shadow-none">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-sheet border-b border-rule">
            <tr>
              <th className="p-3.5 pl-4 font-bold text-ink-soft">Order</th>
              <th className="p-3.5 font-bold text-ink-soft">Recipe</th>
              <th className="p-3.5 text-right font-bold text-ink-soft">Qty</th>
              <th className="p-3.5 font-bold text-ink-soft">Fabric roll</th>
              <th className="p-3.5 text-right font-bold text-ink-soft">Fabric yds</th>
              <th className="p-3.5 font-bold text-ink-soft">Status</th>
              <th className="p-3.5 pr-4 text-right font-bold text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink-soft">
                  Loading cutting orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink-soft">
                  No cutting orders yet. Create the first one.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const isRejected = o.status === "REJECTED";
                const isActionLoading = actionLoadingId === o.id;

                return (
                  <React.Fragment key={o.id}>
                    <tr
                      className={`hover:bg-row-hover transition-colors ${
                        isRejected ? "border-l-4 border-l-short-edge bg-short-bg/20" : ""
                      }`}
                    >
                      <td className="p-3.5 pl-4 font-bold text-ink whitespace-nowrap">
                        <Link
                          href={`/supervisor/orders/${o.id}`}
                          className="hover:underline text-ink"
                        >
                          {o.orderNo}
                        </Link>
                      </td>
                      <td className="p-3.5 text-ink whitespace-nowrap">
                        {o.recipe.name}{" "}
                        <span className="text-xs text-ink-soft">({o.recipe.recipeCode})</span>
                      </td>
                      <td className="p-3.5 text-right font-display text-lg font-semibold tabular-nums text-ink">
                        {o.targetQty}
                      </td>
                      <td className="p-3.5 font-bold text-ink whitespace-nowrap">
                        {o.fabricRollId}
                      </td>
                      <td className="p-3.5 text-right tabular-nums text-ink">
                        {o.actualFabricYds.toFixed(2)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <Stamp status={o.status} />
                      </td>
                      <td className="p-3.5 pr-4 text-right whitespace-nowrap space-x-2">
                        {o.status === "CUTTING_IN_PROGRESS" && (
                          <>
                            <Link href={`/supervisor/orders/${o.id}`}>
                              <Button variant="secondary" size="sm">
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() => handleSubmitOrder(o.id, o.orderNo)}
                            >
                              Send to verification
                            </Button>
                          </>
                        )}

                        {o.status === "REJECTED" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isActionLoading}
                            onClick={() => handleRecutOrder(o.id, o.orderNo)}
                          >
                            Re-cut
                          </Button>
                        )}

                        {(o.status === "PENDING_VERIFICATION" || o.status === "VERIFIED") && (
                          <Link href={`/supervisor/orders/${o.id}`}>
                            <Button variant="secondary" size="sm">
                              View
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>

                    {/* Second line in row for rejected reason note per DESIGN.md Section 9.5 */}
                    {isRejected && o.lastRejectionReason && (
                      <tr className="border-l-4 border-l-short-edge bg-short-bg/30">
                        <td colSpan={7} className="px-4 py-2 text-sm text-short-fg font-medium">
                          <strong>Rejection reason:</strong> {o.lastRejectionReason}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Order Modal */}
      <CreateOrderModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        recipes={recipes}
        onOrderCreated={fetchOrders}
      />
    </div>
  );
}
