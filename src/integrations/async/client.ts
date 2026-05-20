// DEPRECATED — Async/queue workloads now live on the API/AI DB
// (larncwugkdclkhayfjle). Frontend must NEVER read or write queue tables
// directly. Enqueue via edge functions (`enqueue-ai-job`, `workflow-emit`)
// which use the service role on the correct DB.
//
// This file is kept only so historical imports don't break the build.
// Any call site that resolves to this client should be migrated to an
// edge function invocation instead.
const retired = (): never => {
  throw new Error(
    "asyncDb is retired. Use an edge function (enqueue-ai-job / workflow-emit) " +
      "or getApi() on the server. Async DB was folded into API/AI DB.",
  );
};

export const asyncDb = new Proxy({} as Record<string, unknown>, {
  get: retired,
  apply: retired,
});