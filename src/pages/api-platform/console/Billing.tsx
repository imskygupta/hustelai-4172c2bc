export default function ConsoleBilling() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-100">Billing</h1>
        <p className="text-[13px] text-zinc-500 mt-1">Current plan, usage charges, and invoice history.</p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="text-[13px] text-zinc-300">Current plan</div>
        <div className="text-[28px] font-semibold text-zinc-100 mt-1">Free</div>
        <div className="text-[12px] text-zinc-500 mt-1">1,000 requests / month included.</div>
      </div>
    </div>
  );
}