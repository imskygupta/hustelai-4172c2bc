import { OPERATOR_PERSONAS, type OperatorPersona } from "./OperatorPersonas";

export function PersonaFilter({
  active,
  onChange,
}: {
  active: OperatorPersona | null;
  onChange: (p: OperatorPersona | null) => void;
}) {
  return (
    <div className="px-4 py-6 border-y border-slate-100 bg-white sticky top-[64px] z-30 backdrop-blur-sm">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400 mr-2 shrink-0">
            Filter by operator
          </span>
          <button
            onClick={() => onChange(null)}
            className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-colors ${
              active === null
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            All operators
          </button>
          {OPERATOR_PERSONAS.map((p) => {
            const on = active === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onChange(on ? null : p.id)}
                title={p.blurb}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-colors ${
                  on
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                <span>{p.emoji}</span>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}