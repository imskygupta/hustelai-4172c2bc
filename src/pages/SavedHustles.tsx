import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Bookmark, TrendingUp, DollarSign, Play, CheckCircle, Trash2, PlusCircle, BookOpen } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SavedHustle {
  id: string;
  hustle_id: string;
  status: string;
  income_logged: number;
  notes: string | null;
  started_at: string | null;
  created_at: string;
  hustle?: { title: string; category: string; earnings: string; description: string };
  roadmap_id?: string | null;
}

export default function SavedHustles() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<SavedHustle[]>([]);
  const [incomeInput, setIncomeInput] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (user) loadSaved();
  }, [loading, user]);

  const loadSaved = async () => {
    const { data } = await supabase
      .from("saved_hustles")
      .select("*, side_hustles(title, category, earnings, description)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) {
      const items = data.map((d: any) => ({ ...d, hustle: d.side_hustles }));
      // Fetch roadmap IDs for all hustles
      const hustleIds = items.map((i: any) => i.hustle_id);
      const { data: roadmaps } = await supabase
        .from("hustle_roadmaps")
        .select("id, hustle_id")
        .eq("user_id", user!.id)
        .in("hustle_id", hustleIds)
        .order("created_at", { ascending: false });
      const roadmapMap = new Map<string, string>();
      roadmaps?.forEach((r: any) => { if (!roadmapMap.has(r.hustle_id)) roadmapMap.set(r.hustle_id, r.id); });
      setSaved(items.map((i: any) => ({ ...i, roadmap_id: roadmapMap.get(i.hustle_id) || null })));
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("saved_hustles").update({
      status,
      started_at: status === "in_progress" ? new Date().toISOString() : undefined,
    } as any).eq("id", id);
    loadSaved();
    toast({ title: `Status → ${status}` });
  };

  const logIncome = async (id: string) => {
    const amount = parseFloat(incomeInput[id] || "0");
    if (!amount) return;
    const current = saved.find(s => s.id === id);
    await supabase.from("saved_hustles").update({
      income_logged: (current?.income_logged || 0) + amount,
    } as any).eq("id", id);
    setIncomeInput(prev => ({ ...prev, [id]: "" }));
    loadSaved();

    // Award XP for logging income
    const { data: profile } = await supabase.from("profiles").select("xp_points").eq("user_id", user!.id).single();
    await supabase.from("profiles").update({ xp_points: (profile?.xp_points || 0) + 5 } as any).eq("user_id", user!.id);
    toast({ title: `₹${amount} logged! +5 XP` });
  };

  const removeSaved = async (id: string) => {
    await supabase.from("saved_hustles").delete().eq("id", id);
    setSaved(saved.filter(s => s.id !== id));
  };

  const totalIncome = saved.reduce((sum, s) => sum + (s.income_logged || 0), 0);
  const activeCount = saved.filter(s => s.status === "in_progress").length;
  const earningCount = saved.filter(s => s.status === "earning").length;

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-primary">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <h1 className="text-3xl font-display font-bold"><span className="text-gradient">My Hustles</span></h1>
            <p className="text-muted-foreground">Track progress and log your income</p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Earned", value: `₹${totalIncome.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
              { label: "Active", value: activeCount, icon: Play, color: "text-yellow-500" },
              { label: "Earning", value: earningCount, icon: TrendingUp, color: "text-primary" },
            ].map(s => (
              <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-xl p-5 text-center">
                <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
                <p className="text-2xl font-display font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Saved List */}
          <div className="space-y-3">
            {saved.length === 0 && (
              <div className="text-center py-16 space-y-3">
                <Bookmark className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No saved hustles yet. Explore and save ideas!</p>
                <Button variant="outline" onClick={() => navigate("/explore")}>Explore Hustles</Button>
              </div>
            )}
            {saved.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-5 space-y-3 hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold">{item.hustle?.title || "Unknown"}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{item.hustle?.category}</Badge>
                      <Badge className={
                        item.status === "earning" ? "bg-primary/20 text-primary" :
                        item.status === "in_progress" ? "bg-yellow-500/20 text-yellow-500" :
                        "bg-muted text-muted-foreground"
                      } variant="outline">{item.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Select value={item.status} onValueChange={(v) => updateStatus(item.id, v)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saved">📌 Saved</SelectItem>
                        <SelectItem value="in_progress">🔄 In Progress</SelectItem>
                        <SelectItem value="earning">💰 Earning</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => removeSaved(item.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{item.hustle?.description}</p>

                {/* Income Logger */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">₹{(item.income_logged || 0).toLocaleString()} earned</span>
                  <div className="ml-auto flex gap-2">
                    <Input placeholder="₹ amount" type="number" value={incomeInput[item.id] || ""}
                      onChange={e => setIncomeInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-24 h-8 text-xs" />
                    <Button size="sm" variant="outline" onClick={() => logIncome(item.id)} className="h-8 text-xs">
                      <PlusCircle className="w-3 h-3 mr-1" /> Log
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
