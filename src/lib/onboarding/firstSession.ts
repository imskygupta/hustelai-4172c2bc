/**
 * First-session milestones — tiny localStorage tracker used to personalize
 * onboarding and post-activation nudges.
 *
 * Intentionally client-only: this is a UX surface, not a source of truth.
 * Server-side activation telemetry lives in workspace_activity.
 *
 * Milestones:
 *  - first_visit         user has landed on the dashboard at least once
 *  - first_project       user has created their first project
 *  - first_provider      user has connected at least one AI provider
 *  - first_workflow      first IntentRunner generation completed + saved
 *  - first_export        first PDF / .md export
 *  - telegram_prompted   we've already shown the post-export telegram nudge
 */

export type Milestone =
  | "first_visit"
  | "first_project"
  | "first_provider"
  | "first_workflow"
  | "first_export"
  | "first_canvas_opened"
  | "first_file_uploaded"
  | "welcome_grid_dismissed"
  | "telegram_prompted";

const KEY = "hai:onboarding:v1";

type State = Partial<Record<Milestone, number>>; // value = ts

function read(): State {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function write(s: State) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function markMilestone(m: Milestone) {
  const s = read();
  if (s[m]) return;
  s[m] = Date.now();
  write(s);
}

export function hasMilestone(m: Milestone): boolean {
  return !!read()[m];
}

export function getMilestones(): State {
  return read();
}

/** True the very first time it's called in a session/device. */
export function isFirstDashboardVisit(): boolean {
  const seen = hasMilestone("first_visit");
  markMilestone("first_visit");
  return !seen;
}