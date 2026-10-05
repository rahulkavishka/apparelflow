"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RejectOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNo: string;
  onConfirmReject: (note: string) => Promise<void>;
}

export function RejectOrderModal({
  open,
  onOpenChange,
  orderNo,
  onConfirmReject,
}: RejectOrderModalProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmed = note.trim();
  const charCount = note.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || trimmed.length < 5) {
      setError("Rejection reason must be at least 5 characters.");
      return;
    }
    if (trimmed.length > 500) {
      setError("Rejection reason cannot exceed 500 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmReject(trimmed);
      setNote("");
      setError("");
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to reject order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px] p-6">
        <DialogHeader className="border-b border-rule pb-3">
          <DialogTitle className="text-xl font-bold text-ink">
            Reject batch {orderNo}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <Label htmlFor="reject-note" className="text-sm font-bold text-ink">
                Reason for rejection
              </Label>
              <span
                className={`text-xs tabular-nums ${
                  charCount > 500
                    ? "text-short-fg font-bold"
                    : charCount < 5
                    ? "text-ink-soft"
                    : "text-ink font-semibold"
                }`}
              >
                {charCount} of 500
              </span>
            </div>

            <Textarea
              id="reject-note"
              rows={4}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. Cuffs: 2 pieces with fabric flaw, re-cut required."
              disabled={isSubmitting}
              className="resize-none"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "reject-note-error" : "reject-note-helper"}
            />

            {error ? (
              <p id="reject-note-error" className="text-xs text-short-fg font-medium">
                {error}
              </p>
            ) : (
              <p id="reject-note-helper" className="text-xs text-ink-soft">
                At least 5 characters. The supervisor sees this when re-cutting.
              </p>
            )}
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
              type="submit"
              variant="destructive"
              disabled={isSubmitting || trimmed.length < 5 || trimmed.length > 500}
            >
              {isSubmitting ? "Rejecting..." : "Reject batch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
