import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Shield, Crown, UserCog, Sparkles, Search } from "lucide-react";
import { OperatorHeader, OperatorChips, OperatorEmpty, OperatorExplainer, OperatorCard } from "./OperatorScaffold";
import { OpsBadge } from "./OpsBadge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ProfileLike = { user_id: string; email: string | null; display_name: string | null; subscription_tier: string };
type RoleRow = { id: string; user_id: string; role: "admin" | "moderator" };

/**
 * Visualizes the role hierarchy and current assignments. Read-friendly,
 * write-protected with confirmations.
 */
const HIERARCHY: { role: "admin" | "moderator"; label: string; description: string; icon: any; tone: string }[] = [
  { role: "admin",     label: "Admin",     description: "Full operator access. Can change tiers, push broadcasts, manage flags.", icon: Crown,   tone: "bg-destructive/10 text-destructive border-destructive/30" },
  { role: "moderator", label: "Moderator", description: "Blog + forum moderation. No billing, no runtime, no destructive controls.", icon: UserCog, tone: "bg-violet-500/10 text-violet-300 border-violet-500/30" },
];

type Filter = "all" | "admin" | "moderator";

export function RolesPanel({
  users, roles, onAssign, onRemove,
}: {
  users: ProfileLike[];
  roles: RoleRow[];
  onAssign: (userId: string, role: "admin" | "moderator") => Promise<void> | void;
  onRemove: (roleId: string) => Promise<void> | void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "moderator">("moderator");

  const counts = useMemo(() => ({
    all: roles.length,
    admin: roles.filter((r) => r.role === "admin").length,
    moderator: roles.filter((r) => r.role === "moderator").length,
  }), [roles]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles
      .filter((r) => filter === "all" || r.role === filter)
      .map((r) => ({ r, u: users.find((u) => u.user_id === r.user_id) }))
      .filter(({ u }) => {
        if (!q) return true;
        return [u?.display_name, u?.email, u?.user_id].join(" ").toLowerCase().includes(q);
      });
  }, [roles, users, filter, query]);

  return (
    <div className="space-y-4">
      <OperatorHeader icon={Shield} title="Roles & permissions" count={`${counts.all} assigned`} badges={[{ kind: "production" }]} />
      <OperatorExplainer
        tone="warn"
        title="Hierarchy"
        badges={[{ kind: "dangerous" }]}
      >
        <div className="space-y-1.5">
          {HIERARCHY.map((h) => {
            const Icon = h.icon;
            return (
              <div key={h.role} className="flex items-start gap-2">
                <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider shrink-0", h.tone)}>
                  <Icon className="w-3 h-3" /> {h.label}
                </span>
                <span>{h.description}</span>
              </div>
            );
          })}
          <div className="flex items-start gap-2 pt-1">
            <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider shrink-0 bg-muted text-muted-foreground border-border">
              <Sparkles className="w-3 h-3" /> User
            </span>
            <span className="text-muted-foreground">Default. Tier-gated via subscription_tier.</span>
          </div>
        </div>
      </OperatorExplainer>

      {/* Assign new role */}
      <OperatorCard className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Assign role</div>
        <div className="grid md:grid-cols-[minmax(0,1fr)_140px_120px] gap-2 items-center">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Pick a user…" /></SelectTrigger>
            <SelectContent>
              {users.slice(0, 200).map((u) => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.display_name || u.email || u.user_id.slice(0, 8)} <span className="opacity-60">· {u.subscription_tier}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={!selectedUser} className="h-9">Assign</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Grant {selectedRole}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedRole === "admin"
                    ? "Admins get FULL operator access — billing, runtime, broadcasts. Only grant to people you trust completely."
                    : "Moderators can review forum posts and write blog content. No billing or runtime access."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={async () => { await onAssign(selectedUser, selectedRole); setSelectedUser(""); }}>
                  Confirm grant
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </OperatorCard>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-2">
        <OperatorChips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { key: "all", label: "All", count: counts.all },
            { key: "admin", label: "Admin", count: counts.admin },
            { key: "moderator", label: "Moderator", count: counts.moderator },
          ]}
        />
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assignments…" className="pl-9 h-8 text-sm" />
        </div>
      </div>

      {list.length === 0 ? (
        <OperatorEmpty icon={Shield} title="No assignments match" hint="Try clearing the search or filter." />
      ) : (
        <div className="space-y-1.5">
          {list.map(({ r, u }) => {
            const meta = HIERARCHY.find((h) => h.role === r.role)!;
            const Icon = meta.icon;
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border/50 bg-card">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {((u?.display_name || u?.email || "?")[0] || "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{u?.display_name || u?.email || r.user_id.slice(0, 8)}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{u?.email}</div>
                </div>
                <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider shrink-0", meta.tone)}>
                  <Icon className="w-3 h-3" /> {meta.label}
                </span>
                {r.role === "admin" && <OpsBadge kind="dangerous">High trust</OpsBadge>}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke {meta.label} from {u?.display_name || u?.email || r.user_id.slice(0, 8)}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        They will immediately lose {meta.label.toLowerCase()} privileges on the next request.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onRemove(r.id)}>Revoke</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
