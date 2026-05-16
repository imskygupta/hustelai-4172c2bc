/**
 * Operational chains — what naturally continues after an intent.
 *
 * The workspace should never feel like a one-shot generator. After every
 * deliverable, suggest 2–4 next intents that pick up where the operator
 * just left off. This is the spine of "operational continuity".
 *
 * Each chain entry is intent → [next intents] with a one-liner reason.
 */
import { findIntent, type ToolIntent } from "./toolsCatalog";

export type ChainStep = { intent: string; reason: string };

export const CHAINS: Record<string, ChainStep[]> = {
  proposal:         [
    { intent: "invoice",          reason: "Bill the deposit before kickoff drifts." },
    { intent: "onboarding",       reason: "Lock in week-1 access and expectations." },
    { intent: "scope",            reason: "Turn the pitch into a working scope doc." },
    { intent: "outreach",         reason: "Draft a polite follow-up if they go quiet." },
  ],
  scope:            [
    { intent: "onboarding",       reason: "Roll the scope into a real onboarding flow." },
    { intent: "proposal",         reason: "Wrap the scope into a sendable proposal." },
    { intent: "invoice",          reason: "Generate the first milestone invoice." },
  ],
  onboarding:       [
    { intent: "scope",            reason: "Pair onboarding with a written scope." },
    { intent: "automation",       reason: "Automate the repeating steps you just listed." },
  ],
  invoice:          [
    { intent: "onboarding",       reason: "Kick off the work now that payment is set." },
    { intent: "proposal",         reason: "Recycle this into the next client proposal." },
  ],
  outreach:         [
    { intent: "icp",              reason: "Sharpen who this sequence should hit." },
    { intent: "proposal",         reason: "Have a proposal ready when they reply yes." },
    { intent: "content",          reason: "Warm them up with on-channel content." },
  ],
  icp:              [
    { intent: "outreach",         reason: "Translate the ICP into a real sequence." },
    { intent: "content",          reason: "Build content pillars they will actually read." },
  ],
  strategy:         [
    { intent: "content",          reason: "Turn the strategy into a content engine." },
    { intent: "automation",       reason: "Codify the moving parts into an automation." },
    { intent: "scope",            reason: "Translate strategy into a billable scope." },
  ],
  research:         [
    { intent: "strategy",         reason: "Convert findings into a 30/60/90 plan." },
    { intent: "icp",              reason: "Lock the ICP off the back of this research." },
  ],
  content:          [
    { intent: "content_calendar", reason: "Schedule the pillars across 30 days." },
    { intent: "outreach",         reason: "Reuse hooks in cold emails." },
  ],
  content_calendar: [
    { intent: "content",          reason: "Refresh the pillars when the calendar runs out." },
    { intent: "automation",       reason: "Automate the publishing handoff." },
  ],
  automation:       [
    { intent: "onboarding",       reason: "Roll the flow into the onboarding handoff." },
    { intent: "scope",            reason: "Bill the automation as scoped work." },
  ],
};

export function nextSteps(intent: string): Array<ChainStep & { tool: ToolIntent }> {
  const steps = CHAINS[intent] || [];
  return steps
    .map((s) => {
      const tool = findIntent(s.intent);
      return tool ? { ...s, tool } : null;
    })
    .filter(Boolean) as Array<ChainStep & { tool: ToolIntent }>;
}
