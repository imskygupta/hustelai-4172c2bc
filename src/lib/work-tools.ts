import {
  FileText, CheckSquare, Flame, Clock, Users, FolderOpen, StickyNote,
  Wallet, MessageSquare, AlarmClock, TrendingUp, Globe,
} from "lucide-react";

export type WorkTool = {
  slug: string;
  label: string;
  desc: string;
  icon: any;
  tone: string; // tailwind text/bg classes for the icon chip
};

export const WORK_TOOLS: WorkTool[] = [
  { slug: "invoices",   label: "Invoices",   desc: "Create, track & download invoices",       icon: FileText,     tone: "text-emerald-700 bg-emerald-50" },
  { slug: "time",       label: "Time Tracker", desc: "Start/stop timer, auto-bill hours",     icon: Clock,        tone: "text-sky-700 bg-sky-50" },
  { slug: "clients",    label: "Clients (CRM)", desc: "Manage every client in one place",     icon: Users,        tone: "text-violet-700 bg-violet-50" },
  { slug: "checklists", label: "Checklists", desc: "Project templates with progress",         icon: CheckSquare,  tone: "text-teal-700 bg-teal-50" },
  { slug: "files",      label: "Files & Delivery", desc: "Track Figma/Drive links & versions", icon: FolderOpen,  tone: "text-amber-700 bg-amber-50" },
  { slug: "notes",      label: "Quick Notes", desc: "Sticky-note brain dump",                 icon: StickyNote,   tone: "text-yellow-700 bg-yellow-50" },
  { slug: "expenses",   label: "Expenses",   desc: "Tools, ads & subscription costs",         icon: Wallet,       tone: "text-rose-700 bg-rose-50" },
  { slug: "comm",       label: "Comm Log",   desc: "Calls, WhatsApp, emails timeline",        icon: MessageSquare, tone: "text-sky-700 bg-sky-50" },
  { slug: "deadlines",  label: "Deadlines",  desc: "Color-coded countdowns",                  icon: AlarmClock,   tone: "text-rose-700 bg-rose-50" },
  { slug: "daily",      label: "Daily Tracker", desc: "Habits, streaks & momentum",           icon: Flame,        tone: "text-orange-700 bg-orange-50" },
  { slug: "analytics",  label: "Analytics",  desc: "Pipeline conversion & revenue",           icon: TrendingUp,   tone: "text-violet-700 bg-violet-50" },
  { slug: "portals",    label: "Client Portals", desc: "Public link clients can open",        icon: Globe,        tone: "text-indigo-700 bg-indigo-50" },
];