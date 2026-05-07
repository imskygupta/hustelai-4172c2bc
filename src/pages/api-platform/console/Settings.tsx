import { useUser } from "@clerk/clerk-react";

export default function ConsoleSettings() {
  const { user } = useUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-100">Workspace settings</h1>
        <p className="text-[13px] text-zinc-500 mt-1">Manage your developer account.</p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-3">
        <div className="flex justify-between text-[13px]">
          <span className="text-zinc-500">Email</span>
          <span className="text-zinc-200 font-mono">{user?.primaryEmailAddress?.emailAddress}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-zinc-500">Clerk user id</span>
          <span className="text-zinc-300 font-mono text-[11.5px]">{user?.id}</span>
        </div>
      </div>
    </div>
  );
}