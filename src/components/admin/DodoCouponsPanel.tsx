import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tag, Plus, Trash2, RefreshCw, Power } from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  value: number;
  applies_to: "all" | "plans" | "wallets";
  valid_until: string | null;
  max_redemptions: number | null;
  times_redeemed: number;
  is_active: boolean;
};

export function DodoCouponsPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState({
    code: "",
    description: "",
    discount_type: "percent" as "percent" | "fixed",
    value: 10,
    applies_to: "all" as "all" | "plans" | "wallets",
    valid_until: "",
    max_redemptions: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("dodo_coupons" as any)
      .select("*").order("created_at", { ascending: false });
    setCoupons((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!draft.code.trim() || draft.value <= 0) {
      toast({ title: "Code and value required", variant: "destructive" });
      return;
    }
    const payload: any = {
      code: draft.code.trim().toUpperCase(),
      description: draft.description || null,
      discount_type: draft.discount_type,
      value: draft.value,
      applies_to: draft.applies_to,
      valid_until: draft.valid_until ? new Date(draft.valid_until).toISOString() : null,
      max_redemptions: draft.max_redemptions ? Number(draft.max_redemptions) : null,
    };
    const { error } = await supabase.from("dodo_coupons" as any).insert(payload);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `✅ Coupon ${payload.code} created` });
    setDraft({ ...draft, code: "", description: "" });
    load();
  };

  const toggle = async (c: Coupon) => {
    await supabase.from("dodo_coupons" as any).update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    await supabase.from("dodo_coupons" as any).delete().eq("id", c.id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-emerald-500" />
          <h3 className="font-display font-bold">Dodo Coupons</h3>
          <Badge variant="outline">{coupons.length}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      <div className="glass rounded-xl p-4 grid md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Code</Label>
          <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="LAUNCH50" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Launch offer" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Discount</Label>
          <div className="flex gap-1">
            <select value={draft.discount_type} onChange={(e) => setDraft({ ...draft, discount_type: e.target.value as any })}
              className="border rounded px-2 text-sm bg-background">
              <option value="percent">%</option>
              <option value="fixed">₹</option>
            </select>
            <Input type="number" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Applies to</Label>
          <select value={draft.applies_to} onChange={(e) => setDraft({ ...draft, applies_to: e.target.value as any })}
            className="w-full border rounded px-2 py-2 text-sm bg-background">
            <option value="all">All products</option>
            <option value="plans">Subscription plans only</option>
            <option value="wallets">Wallet packs only</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Expires (optional)</Label>
          <Input type="datetime-local" value={draft.valid_until} onChange={(e) => setDraft({ ...draft, valid_until: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max redemptions</Label>
          <Input type="number" value={draft.max_redemptions} onChange={(e) => setDraft({ ...draft, max_redemptions: e.target.value })} placeholder="∞" />
        </div>
        <div className="md:col-span-3">
          <Button onClick={create} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Create coupon
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && coupons.length === 0 && <p className="text-sm text-muted-foreground">No coupons yet.</p>}
        {coupons.map((c) => (
          <div key={c.id} className={`glass rounded-xl p-4 flex flex-wrap items-center gap-3 ${!c.is_active ? "opacity-50" : ""}`}>
            <Badge className="bg-emerald-500 text-white font-mono">{c.code}</Badge>
            <span className="text-sm font-semibold">
              {c.discount_type === "percent" ? `${c.value}% off` : `₹${c.value} off`}
            </span>
            <span className="text-xs text-muted-foreground">{c.applies_to}</span>
            {c.description && <span className="text-xs text-muted-foreground">· {c.description}</span>}
            <span className="text-xs text-muted-foreground ml-auto">
              Used {c.times_redeemed}{c.max_redemptions ? `/${c.max_redemptions}` : ""}
            </span>
            <Button size="sm" variant="ghost" onClick={() => toggle(c)} title={c.is_active ? "Deactivate" : "Activate"}>
              <Power className={`w-4 h-4 ${c.is_active ? "text-emerald-500" : "text-muted-foreground"}`} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => remove(c)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}