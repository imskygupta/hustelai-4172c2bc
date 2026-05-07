export default function ConsoleUsage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-100">Usage</h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Daily request volume, tokens and cost across endpoints.
        </p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center text-[13px] text-zinc-500">
        Usage charts appear after your first API call.
      </div>
    </div>
  );
}