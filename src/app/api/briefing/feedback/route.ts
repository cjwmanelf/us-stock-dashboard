import { randomUUID } from "node:crypto";
import { acquire, BriefingError, readJson } from "@/lib/briefing/guards";
import { authenticate, failure, json } from "@/lib/briefing/http";
import { verifyFeedback, feedbackScoreId } from "@/lib/briefing/feedback";
import { recordBriefingFeedback } from "@/lib/briefing/observability";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let release: (() => void) | undefined;
  try {
    const userId = await authenticate(request); release = acquire(userId);
    const body = await readJson(request) as Record<string, unknown>;
    if (!body || typeof body.traceId !== "string" || !/^[0-9a-f-]{36}$/.test(body.traceId) || typeof body.token !== "string" || body.token.length > 512 || !["up", "down"].includes(String(body.feedback))) throw new BriefingError(400, "INVALID_INPUT", "피드백을 확인해 주세요.");
    const verified = verifyFeedback(body.token, body.traceId, userId);
    const delivery = await recordBriefingFeedback({ traceId: body.traceId, version: verified.version, verifiedOwnership: true, scoreId: feedbackScoreId(body.traceId, userId), vote: body.feedback as "up" | "down" });
    if (delivery.status !== "flush_completed_unverified" && delivery.status !== "stdout_written_unverified") throw new BriefingError(503, "FEEDBACK_UNAVAILABLE", "피드백 전송을 완료하지 못했습니다.");
    return json({ accepted: true, delivery: delivery.status }, 202);
  } catch (error) { return failure(error, randomUUID()); }
  finally { release?.(); }
}
