import { randomUUID } from "node:crypto";
import { acquire, parseInput, readJson } from "@/lib/briefing/guards";
import { authenticate, failure, json } from "@/lib/briefing/http";
import { generateBriefing } from "@/lib/briefing/service";
import { recordBriefingTrace } from "@/lib/briefing/observability";
import { feedbackToken } from "@/lib/briefing/feedback";
import { authorizeEvaluationRequest } from "@/lib/briefing/evaluation-auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const traceId = randomUUID(); let release: (() => void) | undefined;
  try {
    const userId = await authenticate(request); release = acquire(userId);
    const input = parseInput(await readJson(request));
    const { result, trace } = await generateBriefing(input, traceId, authorizeEvaluationRequest(request, userId));
    try { await recordBriefingTrace(trace); } catch { /* Telemetry must not break responses. */ }
    return json({ ...result, feedbackToken: feedbackToken(traceId, userId, result.version) });
  } catch (error) { return failure(error, traceId); }
  finally { release?.(); }
}
