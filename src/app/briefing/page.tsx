import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BriefingForm } from "@/components/BriefingForm";
export default async function BriefingPage() {
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const user = configured ? (await (await createClient()).auth.getUser()).data.user : null;
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6"><header><p className="text-sm font-medium text-brand">모두리치</p><h1 className="mt-2 text-2xl font-bold">AI 주식 브리핑</h1><p className="mt-2 text-sm text-muted">공개 소식을 한국어로 살펴보고, 날짜와 원문을 함께 확인하세요.</p></header>{!configured ? <p>Supabase 인증 서비스 설정이 필요합니다.</p> : !user ? <p><Link href="/login" className="text-brand underline">로그인</Link> 후 브리핑을 이용할 수 있습니다.</p> : <><BriefingForm /><p className="text-xs text-muted">일반 브리핑의 질문·답변 내용은 품질 분석용으로 기록하지 않습니다.</p></>}</main>;
}
