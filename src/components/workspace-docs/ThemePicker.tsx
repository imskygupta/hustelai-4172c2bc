import { THEME_LIST } from "@/lib/workspace-docs/themes";
import type { ThemeId } from "@/lib/workspace-docs/types";
import { Check } from "lucide-react";

export function ThemePicker({ value, onChange }: { value: ThemeId; onChange: (id: ThemeId) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {THEME_LIST.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative h-14 rounded-lg overflow-hidden border-2 transition-all ${
            value === t.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
          }`}
          style={{ background: t.preview }}
          title={t.name}
        >
          {value === t.id && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Check className="h-4 w-4 text-white" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}