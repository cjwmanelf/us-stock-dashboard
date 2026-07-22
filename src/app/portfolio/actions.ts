"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsdKrwRate } from "@/lib/fx";
import { symbolIsKnown, symbolsEnabled } from "@/lib/symbols";
import {
  parseFxRate,
  parsePrice,
  parseQuantity,
  parseTicker,
  type FormState,
} from "@/lib/validation";

export type AddHoldingState = FormState;

/**
 * 보유 종목 추가. useActionState 와 함께 사용.
 * Server Function 은 UI 뿐 아니라 직접 POST 로도 호출될 수 있으므로 내부에서 인증을 반드시 확인한다.
 */
export async function addHolding(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const t = parseTicker(formData.get("ticker"));
  if (!t.ok) return { error: t.error };
  // 실제 존재하는 미국 종목인지 확인 (목록을 확보 못하면 통과 — graceful)
  if (symbolsEnabled()) {
    const known = await symbolIsKnown(t.value);
    if (known === false) {
      return {
        error: `'${t.value}' 는 검색되지 않는 티커입니다. 자동완성 목록에서 선택하거나 올바른 미국 종목 티커를 입력하세요.`,
      };
    }
  }
  const q = parseQuantity(formData.get("quantity"));
  if (!q.ok) return { error: q.error };
  const p = parsePrice(formData.get("avg_price"));
  if (!p.ok) return { error: p.error };
  const fx = parseFxRate(formData.get("buy_fx_rate"), { required: false });
  if (!fx.ok) return { error: fx.error };

  // 매수 환율을 안 넣었으면 현재 환율로 저장
  let buyFxRate = fx.value;
  if (buyFxRate === null) {
    const cur = await getUsdKrwRate();
    buyFxRate = cur?.rate ?? null;
  }

  const { error } = await supabase.from("holdings").insert({
    user_id: user.id,
    ticker: t.value,
    quantity: q.value,
    avg_price: p.value,
    buy_fx_rate: buyFxRate,
  });
  if (error) return { error: `저장 실패: ${error.message}` };

  revalidatePath("/portfolio");
  return { success: true };
}

/**
 * 기존 보유 종목 수정 (수량·평균단가·매수환율). useActionState 와 함께 사용.
 * 매수환율은 비우면 null(미입력)로 저장된다.
 */
export async function updateHolding(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "잘못된 요청입니다." };

  const q = parseQuantity(formData.get("quantity"));
  if (!q.ok) return { error: q.error };
  const p = parsePrice(formData.get("avg_price"));
  if (!p.ok) return { error: p.error };
  const fx = parseFxRate(formData.get("buy_fx_rate"), { required: false });
  if (!fx.ok) return { error: fx.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("holdings")
    .update({ quantity: q.value, avg_price: p.value, buy_fx_rate: fx.value })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: `수정 실패: ${error.message}` };

  revalidatePath("/portfolio");
  return { success: true };
}

/**
 * 보유 종목 삭제. <form action={deleteHolding}> 로 직접 호출.
 * RLS 정책이 본인 소유만 삭제되도록 이중으로 보장한다.
 */
export async function deleteHolding(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("holdings").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/portfolio");
}
