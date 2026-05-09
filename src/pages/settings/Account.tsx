import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SettingsSection, SettingsField, SettingsRow } from "@/components/settings/SettingsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AccountSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email ?? "");
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  const updateEmail = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Confirmation email sent");
  };

  const updatePassword = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) return toast.error(error.message);
    setPw("");
    toast.success("Password updated");
  };

  const signOutEverywhere = async () => {
    await supabase.auth.signOut({ scope: "global" });
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <SettingsSection title="Email" description="Used for sign-in and notifications.">
        <div className="flex gap-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="flex-1" />
          <Button onClick={updateEmail} disabled={saving || email === user?.email}>Update</Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Password" description="Choose a strong password — at least 8 characters.">
        <SettingsField label="New password">
          <div className="flex gap-3">
            <Input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="••••••••" className="flex-1" />
            <Button onClick={updatePassword} disabled={saving || !pw}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
            </Button>
          </div>
        </SettingsField>
      </SettingsSection>

      <SettingsSection title="Sessions" description="Sign out of every device.">
        <SettingsRow
          label="Sign out everywhere"
          description="Ends all active sessions, including this one."
        >
          <Button variant="outline" onClick={signOutEverywhere}>Sign out all</Button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Danger zone" description="Irreversible actions.">
        <SettingsRow
          label="Delete account"
          description="Permanently delete your account and all data. Contact support to proceed."
        >
          <Button variant="destructive" asChild>
            <a href="mailto:support@hustlaiapp.in?subject=Account%20deletion">Request deletion</a>
          </Button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}