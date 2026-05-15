import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { OperatorHeader, OperatorChips, OperatorEmpty, OperatorExplainer, OperatorCard } from "./OperatorScaffold";
import { OpsBadge } from "./OpsBadge";
import { OperatorLink } from "./OperatorLink";
import { ShieldCheck, CheckCircle, XCircle, FileText, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { recordOperatorAction } from "@/lib/audit/recordOperatorAction";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

type V = any;
type ProfileLike = { user_id: string; email: string | null; display_name: string | null; created_at?: string };

type Filter = "pending" | "approved" | "rejected" | "all";

export function VerificationPanel({
  verifications, users, currentUserId, onChanged,
}: {
  verifications: V[];
  users: ProfileLike[];
  currentUserId: string;
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("pending");
  const counts = useMemo(() => ({
    pending:  verifications.filter((v) => v.status === "pending").length,
    approved: verifications.filter((v) => v.status === "approved").length,
    rejected: verifications.filter((v) => v.status === "rejected").length,
    all:      verifications.length,
  }), [verifications]);

  const list = useMemo(() => filter === "all"
    ? verifications
    : verifications.filter((v) => v.status === filter), [verifications, filter]);

  return (
    <div className="space-y-4">
      <OperatorHeader
        icon={ShieldCheck}
        title="Verification queue"
        count={`${counts.pending} pending · ${counts.all} total`}
        badges={[{ kind: "production" }]}
      />
      <OperatorExplainer
        badges={[{ kind: "internal" }]}
        title="Review checklist"
      >
        Verify ID matches the photo, that the email matches the profile, and that the user has no recent suspicious signals before approving. Approving awards 50 XP and unlocks forum posting.
      </OperatorExplainer>
      <OperatorChips<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { key: "pending",  label: "Pending",  count: counts.pending },
          { key: "approved", label: "Approved", count: counts.approved },
          { key: "rejected", label: "Rejected", count: counts.rejected },
          { key: "all",      label: "All",      count: counts.all },
        ]}
      />
      {list.length === 0 ? (
        <OperatorEmpty icon={ShieldCheck} title={`No ${filter} verifications`} hint="Submissions will appear here as they come in." />
      ) : (
        <div className="space-y-2">
          {list.map((v) => {
            const u = users.find((x) => x.user_id === v.user_id);
            return <Row key={v.id} v={v} u={u} currentUserId={currentUserId} onChanged={onChanged} />;
          })}
        </div>
      )}
    </div>
  );
}

function Row({ v, u, currentUserId, onChanged }: { v: V; u?: ProfileLike; currentUserId: string; onChanged: () => void }) {
  const [reason, setReason] = useState("Documents unclear");
  const ageDays = u?.created_at ? Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000) : null;
  const isNew = ageDays !== null && ageDays < 3;
  const idUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/kyc-documents/${v.id_card_url}`;
  const photoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/kyc-documents/${v.photo_url}`;
  const statusCls =
    v.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
    v.status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/30" :
    "bg-amber-500/10 text-amber-400 border-amber-500/30";

  return (
    <OperatorCard className="overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
          {((u?.display_name || u?.email || "?")[0] || "?").toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm truncate">{u?.display_name || u?.email || v.user_id}</span>
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider", statusCls)}>
              {v.status}
            </span>
            {isNew && <span className="text-[10px] text-amber-400 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" />New account</span>}
            {u?.email && <span className="text-[10px] text-muted-foreground">{u.email}</span>}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Submitted {new Date(v.created_at).toLocaleString()}
            {ageDays !== null && <span className="ml-2">· account age {ageDays}d</span>}
          </div>
          <div className="flex gap-3 mt-2 text-xs">
            <OperatorLink to={idUrl} newTab className="text-primary hover:underline inline-flex items-center gap-1"><FileText className="w-3 h-3" />ID card<ExternalLink className="w-3 h-3 opacity-60" /></OperatorLink>
            <OperatorLink to={photoUrl} newTab className="text-primary hover:underline inline-flex items-center gap-1"><FileText className="w-3 h-3" />Selfie<ExternalLink className="w-3 h-3 opacity-60" /></OperatorLink>
          </div>
        </div>
        {v.status === "pending" && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" className="h-8" onClick={async () => {
              await supabase.from("user_verifications").update({ status: "approved", reviewed_by: currentUserId, reviewed_at: new Date().toISOString() } as any).eq("id", v.id);
              await supabase.from("profiles").update({ is_verified: true } as any).eq("user_id", v.user_id);
              const { data: p } = await supabase.from("profiles").select("xp_points").eq("user_id", v.user_id).single();
              await supabase.from("profiles").update({ xp_points: ((p as any)?.xp_points || 0) + 50 } as any).eq("user_id", v.user_id);
              void recordOperatorAction({
                action: "verification.approve",
                targetType: "user",
                targetId: v.user_id,
                targetLabel: u?.email ?? v.user_id,
                metadata: { verification_id: v.id },
              });
              toast({ title: "Approved" });
              onChanged();
            }}>
              <CheckCircle className="w-3 h-3 mr-1" /> Approve
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-destructive border-destructive/30">
                  <XCircle className="w-3 h-3 mr-1" /> Reject
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject verification?</AlertDialogTitle>
                  <AlertDialogDescription>The user will see this reason. Pick something specific so they can re-submit.</AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="text-sm" />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    await supabase.from("user_verifications").update({ status: "rejected", reviewed_by: currentUserId, reviewed_at: new Date().toISOString(), rejection_reason: reason } as any).eq("id", v.id);
                    void recordOperatorAction({
                      action: "verification.reject",
                      targetType: "user",
                      targetId: v.user_id,
                      targetLabel: u?.email ?? v.user_id,
                      reason,
                      metadata: { verification_id: v.id },
                    });
                    toast({ title: "Rejected" });
                    onChanged();
                  }}>Reject</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </OperatorCard>
  );
}
