import { supabase } from "@/integrations/supabase/client";

export interface FreelanceResult {
  id: string;
  title: string;
  category: string;
  description: string;
  investment: string;
  difficulty: string;
  earning_potential: string;
  tags: string[];
  type?: string;
  time_commitment?: string;
  is_trending?: boolean;
  likes?: number;
  dislikes?: number;
}

function effortToLabel(effort: number): string {
  if (effort <= 1) return "Beginner";
  if (effort <= 3) return "Intermediate";
  return "Advanced";
}

export function mapDbResult(item: any): FreelanceResult {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    description: item.description,
    investment: item.startup_cost || "$0",
    difficulty: effortToLabel(item.effort),
    earning_potential: item.earnings,
    tags: item.tags || [],
    type: item.type,
    time_commitment: item.time_commitment,
    is_trending: item.is_trending,
    likes: item.likes || 0,
    dislikes: item.dislikes || 0,
  };
}

export async function searchFreelanceIdeas(query: string): Promise<FreelanceResult[]> {
  const q = query.toLowerCase();
  const keywords = q.split(/\s+/).filter(w => w.length > 2);

  let request = supabase.from("side_hustles").select("*");

  if (keywords.length > 0) {
    const orFilters = keywords.flatMap(kw => [
      `title.ilike.%${kw}%`,
      `category.ilike.%${kw}%`,
      `description.ilike.%${kw}%`,
      `type.ilike.%${kw}%`,
    ]);
    request = request.or(orFilters.join(","));
  }

  const { data, error } = await request.order("likes", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    const { data: trending } = await supabase.from("side_hustles").select("*").order("likes", { ascending: false }).limit(12);
    return (trending || []).map(mapDbResult);
  }

  const scored = data.map(item => {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const descLower = item.description.toLowerCase();
    const catLower = item.category.toLowerCase();

    for (const kw of keywords) {
      if (titleLower.includes(kw)) score += 10;
      if (catLower.includes(kw)) score += 5;
      if (descLower.includes(kw)) score += 3;
      if (item.tags?.some((t: string) => t.includes(kw))) score += 4;
    }

    if (q.includes("zero") || q.includes("free") || q.includes("no investment")) {
      if (item.startup_cost === "$0") score += 15;
    }

    if (q.includes("student")) {
      if (item.effort <= 2) score += 8;
      if (item.type === "Online") score += 5;
    }

    // Boost by likes
    score += (item.likes || 0) * 2;
    if (item.is_trending) score += 3;

    return { ...item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 15).map(mapDbResult);
}
