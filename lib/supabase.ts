import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Match = {
  id: string;
  team_a: string;
  team_b: string;
  match_date: string;
  score_a: number | null;
  score_b: number | null;
  phase: string;
};

export type Participant = { id: string; name: string };

export type Guess = {
  id: string;
  participant_id: string;
  match_id: string;
  guess_a: number;
  guess_b: number;
};

export type RankingRow = {
  id: string;
  name: string;
  exact_hits: number;
  result_hits: number;
  total_points: number;
};
