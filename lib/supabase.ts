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
  is_knockout: boolean;        // true = mata-mata (tem pênaltis)
  penalty_winner: 'A' | 'B' | null; // quem ganhou nos pênaltis
};

export type Participant = { id: string; name: string };

export type Guess = {
  id: string;
  participant_id: string;
  match_id: string;
  guess_a: number;
  guess_b: number;
  guess_penalty_winner: 'A' | 'B' | null;
};

export type RankingRow = {
  id: string;
  name: string;
  exact_hits: number;
  result_hits: number;
  partial_hits: number;
  total_points: number;
};

// Calcula pontos de um palpite dado o resultado real
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
    // FASE DE GRUPOS
    if (isExact) return 6;                                       // placar exato
    if (isDraw && !isExact) return 3;                            // empate sem exato
    if (!isDraw && guessSign === realSign) {
      // acertou vencedor
      if (guess_a === real_a || guess_b === real_b) return 4;   // + gols de 1 time
      return 3;                                                  // só vencedor
    }
    // errou vencedor mas acertou gols de um time
    if (guess_a === real_a || guess_b === real_b) return 1;
    return 0;
  } else {
    // MATA-MATA — pênaltis separados
    if (!isDraw) {
      // não houve empate → pênaltis irrelevante
      if (isExact) return 6;
      if (guessSign === realSign) {
        if (guess_a === real_a || guess_b === real_b) return 4;
        return 3;
      }
      if (guess_a === real_a || guess_b === real_b) return 1;
      return 0;
    }
    // terminou empatado → avaliar pênaltis
    const penCorrect = guess_pen !== null && guess_pen === real_pen;
    if (isExact && penCorrect)  return 9;
    if (isExact && !penCorrect) return 6;
    if (!isExact && penCorrect) return 6;
    return 3; // empate sem exato e errou pênaltis
  }
}
