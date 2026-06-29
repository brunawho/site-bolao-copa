import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FD_API = 'https://api.football-data.org/v4';

function toBrazilISO(utcDate: string): string {
  const d  = new Date(utcDate);
  const br = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${br.getUTCFullYear()}-${pad(br.getUTCMonth()+1)}-${pad(br.getUTCDate())}T${pad(br.getUTCHours())}:${pad(br.getUTCMinutes())}:00-03:00`;
}

function isKnockout(stage: string): boolean {
  const ko = ['FINAL', 'SEMI', 'QUARTER', 'ROUND_OF_16', 'LAST_16', 'KNOCKOUT', 'PLAYOFF'];
  return ko.some(k => stage?.toUpperCase().includes(k));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Janela de 3 dias atrás até 3 dias à frente
    const now      = new Date();
    const dateFrom = new Date(now.getTime() - 86400000 * 3).toISOString().slice(0, 10);
    const dateTo   = new Date(now.getTime() + 86400000 * 3).toISOString().slice(0, 10);

    const res = await fetch(`${FD_API}/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! }
    });
    if (!res.ok) throw new Error(`error ${res.status}`);
    const json = await res.json();
    const matches = json.matches ?? [];

    let inserted = 0, updated = 0;

    for (const m of matches) {
      const homeTeam = m.homeTeam?.name ?? '';
      const awayTeam = m.awayTeam?.name ?? '';
      const utcDate  = m.utcDate ?? '';
      const stage    = m.stage ?? '';
      const group    = m.group ?? '';
      const matchday = m.matchday ?? '';
      const status   = m.status ?? '';

      if (!homeTeam || !awayTeam || homeTeam === 'TBD' || awayTeam === 'TBD' || !utcDate) continue;

      const matchDate  = toBrazilISO(utcDate);
      const phaseLabel = group
        ? `Copa do Mundo 2026 · ${group} · Rodada ${matchday}`
        : `Copa do Mundo 2026 · ${stage} · Rodada ${matchday}`;
      const knockout = isKnockout(stage);
      const scoreA   = ['FINISHED', 'AWARDED'].includes(status) ? (m.score?.fullTime?.home ?? null) : null;
      const scoreB   = ['FINISHED', 'AWARDED'].includes(status) ? (m.score?.fullTime?.away ?? null) : null;

      let penaltyWinner: 'A' | 'B' | null = null;
      const penA = m.score?.penalties?.home;
      const penB = m.score?.penalties?.away;
      if (penA != null && penB != null) penaltyWinner = penA > penB ? 'A' : 'B';

      // Busca por times exatos — sem depender de data pra evitar duplicatas por fuso
      const { data: existing } = await supabase
        .from('matches').select('id, score_a, score_b, score_locked, is_knockout')
        .eq('team_a', homeTeam).eq('team_b', awayTeam)
        .maybeSingle();

      if (existing) {
        // Nunca rebaixar is_knockout de true para false
        const updateData: any = { match_date: matchDate, phase: phaseLabel };
        if (!existing.is_knockout) updateData.is_knockout = knockout;
        if (existing.score_a === null && scoreA !== null && !existing.score_locked) {
          updateData.score_a = scoreA;
          updateData.score_b = scoreB;
          if (penaltyWinner) updateData.penalty_winner = penaltyWinner;
        }
        await supabase.from('matches').update(updateData).eq('id', existing.id);
        updated++;
      } else {
        await supabase.from('matches').insert({
          team_a: homeTeam, team_b: awayTeam,
          match_date: matchDate, phase: phaseLabel,
          is_knockout: knockout, score_a: scoreA, score_b: scoreB,
          ...(penaltyWinner && { penalty_winner: penaltyWinner }),
        });
        inserted++;
      }
    }

    return NextResponse.json({ competition: 'WC', inserted, updated, total: matches.length, dateFrom, dateTo });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
