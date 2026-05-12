import { Check, Minus } from "lucide-react";

export interface ComparisonColumn {
  name: string;
  highlight?: boolean;
}

export interface ComparisonRow {
  feature: string;
  /** One value per column. true = check, false = dash, string = text. */
  values: (boolean | string)[];
}

interface Props {
  title?: string;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

export function ComparisonTable({ title = "How HustleAI compares", columns, rows }: Props) {
  return (
    <section className="px-4 mt-20">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900 mb-8">{title}</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 font-semibold text-slate-700">Feature</th>
                {columns.map((c) => (
                  <th
                    key={c.name}
                    className={`text-left p-4 font-semibold ${c.highlight ? "text-emerald-700" : "text-slate-700"}`}
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature} className="border-t border-slate-100">
                  <td className="p-4 text-slate-700">{r.feature}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className={`p-4 ${columns[i]?.highlight ? "bg-emerald-50/40" : ""}`}>
                      {typeof v === "boolean" ? (
                        v ? <Check className="w-4 h-4 text-emerald-600" /> : <Minus className="w-4 h-4 text-slate-300" />
                      ) : (
                        <span className="text-slate-700">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}