import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { SewingOrderDetailDto } from "@/services/sewing.service";
import { OrderStatus } from "@prisma/client";

export interface SewingQueueParams {
  q?: string;
  startedFilter?: "awaiting" | "started" | "all";
  sort?: "verifiedAt" | "orderNo" | "targetQty";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export interface SewingQueueItem {
  id: string;
  orderNo: string;
  targetQty: number;
  fabricRollId: string;
  status: OrderStatus;
  recipe: {
    recipeCode: string;
    name: string;
    wastageCap: number;
  };
  verifiedAt: string | null;
  verifier: {
    id: string;
    fullName: string;
  } | null;
  wastagePct: number | null;
  sewingStartedAt: string | null;
  sewingStartedBy: {
    id: string;
    fullName: string;
  } | null;
}

export interface SewingQueueResponse {
  orders: SewingQueueItem[];
  total: number;
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    counts: {
      awaiting: number;
      started: number;
      all: number;
    };
  };
}

export function useSewingQueue(params: SewingQueueParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.q) queryParams.set("q", params.q);
  if (params.startedFilter) queryParams.set("startedFilter", params.startedFilter);
  if (params.sort) queryParams.set("sort", params.sort);
  if (params.dir) queryParams.set("dir", params.dir);
  if (params.page) queryParams.set("page", String(params.page));
  if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));

  const queryString = queryParams.toString();
  const url = `/api/sewing/queue${queryString ? `?${queryString}` : ""}`;

  return useQuery<SewingQueueResponse>({
    queryKey: ["sewingQueue", params],
    queryFn: async () => {
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load sewing queue");
      return json.data;
    },
    enabled: params.enabled ?? true,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useSewingOrderDetail(orderId: string) {
  return useQuery<SewingOrderDetailDto>({
    queryKey: ["sewingOrder", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/sewing/orders/${orderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Verified cutting order not found in sewing queue");
      return json.data;
    },
    enabled: Boolean(orderId),
    retry: false,
  });
}

export function useStartSewing(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sewing/orders/${orderId}/start`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to start sewing assembly");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sewingQueue"] });
      queryClient.invalidateQueries({ queryKey: ["sewingOrder", orderId] });
    },
  });
}
