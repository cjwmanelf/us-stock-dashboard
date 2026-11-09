"use client";

import { useActionState, useState } from "react";
import { deleteHolding, updateHolding } from "@/app/portfolio/actions";
import { SubmitButton } from "@/components/SubmitButton";
import type { HoldingRow } from "@/lib/portfolio";
import type { FormState } from "@/lib/validation";
import {
  formatKRW,
  formatNumber,
  formatPct,
  formatSignedUSD,
  formatUSD,
} from "@/lib/format";

const gainColor = (v: number) =>
  v > 0 ? "text-up" : v < 0 ? "text-down" : "text-muted";

const inputCls =
  "w-24 rounded-lg border border-line bg-surface px-2 py-1 text-right text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

const initialState: FormState = {};

export function EditableHoldingRow({ row }: { row: HoldingRow }) {
  const { holding: h, cost, price, value, gain, gainPct } = row;
  const [editing, setEditing] = useState(false);
  if (editing) return <HoldingEditor row={row} onClose={() => setEditing(false)} />;

  return (
    <tr className="border-b border-line">
      <td className="py-2 pr-4 font-medium">{h.ticker}</td>
      <td className="py-2 pr-4 text-right tabular-nums">
        {formatNumber(h.quantity)}
      </td>
      <td className="py-2 pr-4 text-right tabular-nums">
        {formatUSD(h.avg_price)}
      </td>
      <td className="py-2 pr-4 text-right tabular-nums">
        {h.buy_fx_rate != null ? (
          formatKRW(h.buy_fx_rate)
        ) : (
          <span className="text-muted/70">미입력</span>
        )}
      </td>
      <td className="py-2 pr-4 text-right tabular-nums">
        {price === null ? (
          <span className="text-muted/70">—</span>
        ) : (
          formatUSD(price)
        )}
      </td>
      <td className="py-2 pr-4 text-right tabular-nums">
        {value === null ? (
          <span className="text-muted/70">{formatUSD(cost)}</span>
        ) : (
          formatUSD(value)
        )}
      </td>
      <td
        className={`py-2 pr-4 text-right tabular-nums ${
          gain === null ? "text-muted/70" : gainColor(gain)
        }`}
      >
        {gain === null || gainPct === null ? (
          "—"
        ) : (
          <>
            {formatSignedUSD(gain)}
            <span className="ml-1 text-xs">({formatPct(gainPct)})</span>
          </>
        )}
      </td>
      <td className="py-2 pl-4 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-medium text-brand hover:underline"
        >
          수정
        </button>
        <form action={deleteHolding} className="ml-2 inline">
          <input type="hidden" name="id" value={h.id} />
          <SubmitButton
            pendingLabel="삭제 중…"
            className="text-muted hover:text-up hover:underline disabled:opacity-50"
          >
            삭제
          </SubmitButton>
        </form>
      </td>
    </tr>
  );
}

function HoldingEditor({ row, onClose }: { row: HoldingRow; onClose: () => void }) {
  const h = row.holding;
  const [state, formAction, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const next = await updateHolding(previous, data);
      if (next.success) onClose();
      return next;
    }, initialState,
  );
    return (
      <tr className="border-b border-line">
        <td colSpan={8} className="py-3">
          <form action={formAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={h.id} />
            <span className="w-12 pb-1 font-medium">{h.ticker}</span>

            <label className="flex flex-col gap-0.5 text-xs text-muted">
              수량
              <input
                name="quantity"
                type="number"
                step="any"
                min="0"
                required
                defaultValue={h.quantity}
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-0.5 text-xs text-muted">
              평균단가 (USD)
              <input
                name="avg_price"
                type="number"
                step="any"
                min="0"
                required
                defaultValue={h.avg_price}
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-0.5 text-xs text-muted">
              매수환율 (선택)
              <input
                name="buy_fx_rate"
                type="number"
                step="any"
                min="0"
                defaultValue={h.buy_fx_rate ?? ""}
                placeholder="비우면 미입력"
                className={inputCls}
              />
            </label>

            <div className="flex gap-2 pb-1">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-brand px-3 py-1 text-sm font-semibold text-brand-fg hover:bg-brand-strong disabled:opacity-50"
              >
                {pending ? "저장 중…" : "저장"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onClose}
                className="rounded-lg border border-line px-3 py-1 text-sm text-muted hover:bg-surface-2"
              >
                취소
              </button>
            </div>
            {state.error && (
              <p className="w-full text-sm text-up">{state.error}</p>
            )}
          </form>
        </td>
      </tr>
    );
}
