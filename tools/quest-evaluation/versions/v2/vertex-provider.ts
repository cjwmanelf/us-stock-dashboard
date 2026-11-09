import "server-only";
import { GoogleAuth } from "google-auth-library";

// Cache the auth client, never an access token: getAccessToken refreshes on expiry.
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

export function vertexProviderConfig(env: NodeJS.ProcessEnv) {
  const project = env.BRIEFING_VERTEX_PROJECT_ID;
  const location = env.BRIEFING_VERTEX_LOCATION;
  const model = env.BRIEFING_LLM_MODEL;
  // Only the global endpoint is supported. Reject overrides before obtaining credentials.
  if (!project || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project) || location !== "global" ||
      !model || !/^google\/gemini-[a-z0-9][a-z0-9.-]*$/.test(model) || env.BRIEFING_LLM_BASE_URL || env.BRIEFING_LLM_API_KEY) return undefined;
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/endpoints/openapi/chat/completions`;
  return Object.freeze({ model, endpoint, async getKey() {
    // Optional operator-provided short-lived token is local-only. Never log it.
    if (env.BRIEFING_VERTEX_ACCESS_TOKEN) {
      if (env.K_SERVICE || env.K_REVISION || env.VERCEL || env.VERCEL_ENV || env.BRIEFING_VERTEX_AUTH !== "local-token") throw new Error("Vertex local token disabled");
      return env.BRIEFING_VERTEX_ACCESS_TOKEN;
    }
    if (env.BRIEFING_VERTEX_AUTH && env.BRIEFING_VERTEX_AUTH !== "adc") throw new Error("Invalid Vertex authentication mode");
    const token = await auth.getAccessToken();
    if (!token) throw new Error("Vertex credentials unavailable");
    return token;
  } });
}
