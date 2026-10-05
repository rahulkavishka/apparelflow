import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { VerificationOrderDto } from "@/services/verification.service";
import { OrderStatus } from "@prisma/client";

export interface VerificationQueueParams {
  q?: string;
  sort?: "submittedAt" | "orderNo" | "targetQty";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export interface VerificationHistoryParams {
  q?: string;
  decision?: "APPROVED" | "REJECTED" | "ALL";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export interface VerificationQueueItem {
  id: string;
  orderNo: string;
  status: OrderStatus;
  targetQty: number;
  fabricRollId: string;
  submittedAt: string | null;
  recipe: {
    recipeCode: string;
    name: string;
  };
  createdBy: {
    fullName: string;
  };
  totalItems: number;
  countedItems: number;
}

export interface VerificationQueueResponse {
  queue: VerificationQueueItem[];
  total: number;
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    totalGarments: number;
  };
}

export interface VerificationHistoryLog {
  id: string;
  orderId: string;
  orderNo: string;
  recipe: {
    recipeCode: string;
    name: string;
    wastageCap: number;
  };
  targetQty: number;
  fabricRollId: string;
  decision: "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  wastagePct: number;
  varianceSnapshot: any;
  timestamp: string;
  verifier: {
    id: string;
    fullName: string;
    role: string;
  };
}

export interface VerificationHistoryResponse {
  logs: VerificationHistoryLog[];
  total: number;
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    counts: {
      ALL: number;
      APPROVED: number;
      REJECTED: number;
    };
  };
}

export function useVerificationQueue(params: VerificationQueueParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.q) queryParams.set("q", params.q);
  if (params.sort) queryParams.set("sort", params.sort);
  if (params.dir) queryParams.set("dir", params.dir);
  if (params.page) queryParams.set("page", String(params.page));
  if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));

  const queryString = queryParams.toString();
  const url = `/api/verification/queue${queryString ? `?${queryString}` : ""}`;

  return useQuery<VerificationQueueResponse>({
    queryKey: ["verificationQueue", params],
    queryFn: async () => {
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load verification queue");
      return json.data;
    },
    enabled: params.enabled ?? true,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useVerificationOrderDetail(orderId: string) {
  return useQuery<VerificationOrderDto>({
    queryKey: ["verificationOrder", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/verification/orders/${orderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load order for verification");
      return json.data;
    },
    enabled: Boolean(orderId),
    retry: false,
  });
}

export function useSaveVerificationCounts(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (counts: Array<{ componentId: string; actualQty: number }>) => {
      const res = await fetch(`/api/verification/orders/${orderId}/counts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to save counts");
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["verificationOrder", orderId], data);
      queryClient.invalidateQueries({ queryKey: ["verificationQueue"] });
    },
  });
}

export function useApproveVerificationOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/verification/orders/${orderId}/approve`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        const detailMsg =
          json.error?.details?.components?.[0]?.message ||
          json.error?.details?.blockers?.[0]?.message ||
          json.error?.message ||
          "Approval failed";
        throw new Error(detailMsg);
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verificationQueue"] });
      queryClient.invalidateQueries({ queryKey: ["verificationHistory"] });
      queryClient.invalidateQueries({ queryKey: ["sewingQueue"] });
    },
  });
}

export function useRejectVerificationOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (note: string) => {
      const res = await fetch(`/api/verification/orders/${orderId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to reject order");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verificationQueue"] });
      queryClient.invalidateQueries({ queryKey: ["verificationHistory"] });
    },
  });
}

export function useVerificationHistory(params: VerificationHistoryParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.q) queryParams.set("q", params.q);
  if (params.decision && params.decision !== "ALL") queryParams.set("decision", params.decision);
  if (params.from) queryParams.set("from", params.from);
  if (params.to) queryParams.set("to", params.to);
  if (params.page) queryParams.set("page", String(params.page));
  if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));

  const queryString = queryParams.toString();
  const url = `/api/verification/logs${queryString ? `?${queryString}` : ""}`;

  return useQuery<VerificationHistoryResponse>({
    queryKey: ["verificationHistory", params],
    queryFn: async () => {
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load verification history");
      return json.data;
    },
    enabled: params.enabled ?? true,
    retry: false,
    placeholderData: keepPreviousData,
  });
}
