"use client";

import { useActionState, useRef, useState } from "react";
import { addHolding, type AddHoldingState } from "@/app/portfolio/actions";
import { TickerAutocomplete } from "@/components/TickerAutocomplete";

const initialState: AddHoldingState = {};

export function AddHoldingForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (previous: AddHoldingState, data: FormData) => {
      const next = await addHolding(previous, data);
      if (next.success) {
        formRef.current?.reset();
        setResetKey(key => key + 1);
      }
      return next;
    }, initialState,
  );

  const inputCls =
    "rounded-lg border border-line bg-surface px-3 py-2 text-fg placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

  return (
    <form
      ref={formRef}
      action={formAction}
      className="themed flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-muted">티커</span>
        <TickerAutocomplete
          key={resetKey}
          inputCls={inputCls}
          className="w-28"
          placeholder="예시) AAPL"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-muted">수량</span>
        <input
          name="quantity"
          type="number"
          step="any"
          min="0"
          required
          placeholder="예시) 10"
          className={`w-28 ${inputCls}`}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-muted">평균 매수단가 (USD)</span>
        <input
          name="avg_price"
          type="number"
          step="any"
          min="0"
          required
          placeholder="예시) 150.25"
          className={`w-40 ${inputCls}`}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-muted">매수 환율 (선택)</span>
        <input
          name="buy_fx_rate"
          type="number"
          step="any"
          min="0"
          placeholder="비우면 현재 환율"
          title="매수 당시 1달러 = ? 원. 비우면 현재 환율로 저장됩니다."
          className={`w-40 ${inputCls}`}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition hover:bg-brand-strong disabled:opacity-50"
      >
        {pending ? "저장 중…" : "추가"}
      </button>

      {state.error && (
        <p className="w-full text-sm text-up">{state.error}</p>
      )}
    </form>
  );
}
