import { SettingsSection } from "@/components/settings/SettingsSection";
import { EmptyState } from "@/components/ui/empty-state";
import { KeyRound, Webhook } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ApiKeysSettings() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <SettingsSection
        title="AI Provider keys (BYOK)"
        description="HustleAI runs on your own provider keys — unlimited execution, full control over usage and cost."
      >
        <EmptyState
          icon={KeyRound}
          title="Connect a provider to power your workspace"
          description="Add Gemini, OpenAI, Claude or LongCat keys inside Workspace. Your keys never leave your account."
          action={{ label: "Open Provider Setup", onClick: () => navigate("/workspaces") }}
        />
      </SettingsSection>

      <SettingsSection
        title="Programmatic API & Webhooks"
        description="Stream workspace events to your own systems."
      >
        <EmptyState
          icon={Webhook}
          title="Coming with the public API"
          description="Personal API keys and webhook endpoints ship alongside the public REST API in the next release."
        />
      </SettingsSection>
    </div>
  );
}