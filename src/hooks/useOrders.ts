import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { OrderStatus } from "@prisma/client";

export interface OrdersListParams {
  status?: OrderStatus | "ALL";
  recipeId?: string;
  q?: string;
  sort?: "createdAt" | "orderNo" | "targetQty" | "actualFabricYds" | "wastagePct" | "status";
  dir?: "asc" | "desc";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export interface OrderListItem {
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

export interface OrdersListResponse {
  orders: OrderListItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    counts: {
      ALL: number;
      CUTTING_IN_PROGRESS: number;
      PENDING_VERIFICATION: number;
      REJECTED: number;
      VERIFIED: number;
    };
  };
}

export function useOrdersList(params: OrdersListParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.status && params.status !== "ALL") queryParams.set("status", params.status);
  if (params.recipeId) queryParams.set("recipeId", params.recipeId);
  if (params.q) queryParams.set("q", params.q);
  if (params.sort) queryParams.set("sort", params.sort);
  if (params.dir) queryParams.set("dir", params.dir);
  if (params.from) queryParams.set("from", params.from);
  if (params.to) queryParams.set("to", params.to);
  if (params.page) queryParams.set("page", String(params.page));
  if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));

  const queryString = queryParams.toString();
  const url = `/api/orders${queryString ? `?${queryString}` : ""}`;

  return useQuery<OrdersListResponse>({
    queryKey: ["orders", params],
    queryFn: async () => {
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load cutting orders");
      return json.data;
    },
    enabled: params.enabled ?? true,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load order details");
      return json.data;
    },
    enabled: Boolean(orderId),
    retry: false,
  });
}

export function useSubmitOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/orders/${orderId}/submit`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to submit order");
      return json.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["verificationQueue"] });
    },
  });
}

export function useRecutOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/orders/${orderId}/recut`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to initiate re-cut");
      return json.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
    },
  });
}
