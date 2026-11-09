import "server-only";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BriefingError } from "./guards";
import type { Evidence } from "./types";
import { isEvaluationContext, type EvaluationContext } from "./evaluation-auth";
export async function saveEvaluationSnapshot(snapshot: { ticker: string; question: string; asOf: string; sources: readonly Evidence[] }, traceId: string, context?: EvaluationContext) {
  const directory = process.env.BRIEFING_EVAL_SNAPSHOT_DIR;
  if (!directory) return;
  if (!isEvaluationContext(context)) throw new BriefingError(503, "EVAL_CONFIGURATION", "평가 저장 설정을 확인해 주세요.");
  try {
    // Only a dedicated ignored local folder is writable; never accept a caller path.
    const root = path.resolve(process.cwd(), ".briefing-eval");
    if (path.resolve(directory) !== root || !/^[0-9a-f-]{36}$/.test(traceId)) throw new Error("Invalid sink");
    const data = JSON.stringify({ traceId, schema: "briefing-evidence-v1", inputOrigin: "synthetic", evidenceOrigin: "independent-input", request: { ticker: snapshot.ticker, question: snapshot.question }, asOf: snapshot.asOf, evidence: snapshot.sources });
    if (Buffer.byteLength(data) > 32768) throw new Error("Snapshot too large");
    await mkdir(root, { recursive: true, mode: 0o700 });
    if ((await readdir(root)).length >= 1000) throw new Error("Snapshot quota");
    await writeFile(path.join(root, `${traceId}.json`), data, { encoding: "utf8", flag: "wx", mode: 0o600 });
  } catch { throw new BriefingError(503, "EVAL_SNAPSHOT_FAILED", "평가 입력 저장에 실패하여 생성을 중단했습니다."); }
}
