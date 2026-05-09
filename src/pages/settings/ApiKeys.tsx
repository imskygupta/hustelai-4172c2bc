import { SettingsSection, SettingsRow } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Key, Webhook } from "lucide-react";

export default function ApiKeysSettings() {
  return (
    <div className="space-y-6">
      <SettingsSection title="Personal API keys" description="Programmatic access to your HustleAI workspace.">
        <div className="text-center py-8 space-y-3">
          <div className="mx-auto h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Key className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">API keys arrive in the next release.</p>
          <Badge variant="outline">Coming soon</Badge>
        </div>
      </SettingsSection>

      <SettingsSection title="Webhook endpoints" description="Stream events to your own systems.">
        <SettingsRow label="HTTPS endpoint" description="Add a URL to receive workspace events.">
          <Button variant="outline" size="sm" disabled>
            <Webhook className="h-4 w-4 mr-1" /> Add endpoint
          </Button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}