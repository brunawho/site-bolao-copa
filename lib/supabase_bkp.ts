import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export type Match = {
  id: string;
  team_a: string;
  team_b: string;
  match_date: string;
  score_a: number | null;
  score_b: number | null;
  phase: string;
  is_knockout: boolean;
  penalty_winner: 'A' | 'B' | null;
};

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
};

export type Profile = {
  id: string;
  name: string;
};

export type Guess = {
  id: string;
  group_member_id: string;
  match_id: string;
  guess_a: number;
  guess_b: number;
  guess_penalty_winner: 'A' | 'B' | null;
};

export type RankingRow = {
  group_id: string;
  user_id: string;
  name: string;
  exact_hits: number;
  result_hits: number;
  partial_hits: number;
  total_points: number;
};

export function calcPoints(
  guess_a: number, guess_b: number, guess_pen: 'A' | 'B' | null,
  real_a: number,  real_b: number,  real_pen: 'A' | 'B' | null,
  is_knockout: boolean
): number {
  const guessSign = Math.sign(guess_a - guess_b);
  const realSign  = Math.sign(real_a  - real_b);
  const isDraw    = real_a === real_b;
  const isExact   = guess_a === real_a && guess_b === real_b;

  if (!is_knockout) {
    if (isExact) return 6;
    if (isDraw && !isExact) return 3;
    if (!isDraw && guessSign === realSign) {
      if (guess_a === real_a || guess_b === real_b) return 4;
      return 3;
    }
    if (guess_a === real_a || guess_b === real_b) return 1;
    return 0;
  } else {
    if (!isDraw) {
      if (isExact) return 6;
      if (guessSign === realSign) {
        if (guess_a === real_a || guess_b === real_b) return 4;
        return 3;
      }
      if (guess_a === real_a || guess_b === real_b) return 1;
      return 0;
    }
    const penCorrect = guess_pen !== null && guess_pen === real_pen;
    if (isExact && penCorrect)  return 9;
    if (isExact && !penCorrect) return 6;
    if (!isExact && penCorrect) return 6;
    return 3;
  }
}
