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
}

export async function searchFreelanceIdeas(query: string): Promise<FreelanceResult[]> {
  const { data, error } = await supabase.functions.invoke("ai-search", {
    body: { query },
  });

  if (error) throw new Error(error.message || "Search failed");
  return data.results;
}
