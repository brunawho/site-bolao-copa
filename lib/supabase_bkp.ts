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
  const guessIsDraw = guess_a === guess_b;

  if (!is_knockout) {
    // Placar exato
    if (isExact) return 6;
    // Empate real
    if (isDraw) {
      if (guessIsDraw) return 3; // Chutou empate mas não exato
      if (guess_a === real_a || guess_b === real_b) return 1; // Chutou vitória, gols de 1 time batem
      return 0;
    }
    // Vitória real
    if (guessSign === realSign) {
      if (guess_a === real_a || guess_b === real_b) return 4; // Vencedor + gols de 1 time
      return 3; // Só vencedor
    }
    if (guess_a === real_a || guess_b === real_b) return 1; // Gols de 1 time sem vencedor
    return 0;
  } else {
    // Mata-mata
    if (!isDraw) {
      if (isExact) return 6;
      if (guessSign === realSign) {
        if (guess_a === real_a || guess_b === real_b) return 4;
        return 3;
      }
      if (guess_a === real_a || guess_b === real_b) return 1;
      return 0;
    }
    // Empate no mata-mata
    const penCorrect = guess_pen !== null && guess_pen === real_pen;
    if (!guessIsDraw) {
      // Chutou vitória mas deu empate
      if (guess_a === real_a || guess_b === real_b) return 1;
      return 0;
    }
    if (isExact && penCorrect)  return 9;
    if (isExact && !penCorrect) return 6;
    if (!isExact && penCorrect) return 6;
    return 3;
  }
}
