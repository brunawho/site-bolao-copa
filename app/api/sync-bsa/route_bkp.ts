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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Busca só jogos dos últimos 2 dias + próximos 2 dias (janela pequena)
    const now       = new Date();
    const dateFrom  = new Date(now.getTime() - 86400000 * 2).toISOString().slice(0, 10);
    const dateTo    = new Date(now.getTime() + 86400000 * 2).toISOString().slice(0, 10);

    const res = await fetch(
      `${FD_API}/competitions/BSA/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
    );
    if (!res.ok) throw new Error(`error ${res.status}`);
    const json = await res.json();
    const matches = json.matches ?? [];

    let inserted = 0, updated = 0;

    for (const m of matches) {
      const homeTeam = m.homeTeam?.name ?? '';
      const awayTeam = m.awayTeam?.name ?? '';
      const utcDate  = m.utcDate ?? '';
      const stage    = m.stage ?? '';
      const matchday = m.matchday ?? '';
      const status   = m.status ?? '';

      if (!homeTeam || !awayTeam || homeTeam === 'TBD' || awayTeam === 'TBD' || !utcDate) continue;

      const matchDate  = toBrazilISO(utcDate);
      const phaseLabel = `Brasileirão 2026 · ${stage} · Rodada ${matchday}`;
      const scoreA     = ['FINISHED', 'AWARDED'].includes(status) ? (m.score?.fullTime?.home ?? null) : null;
      const scoreB     = ['FINISHED', 'AWARDED'].includes(status) ? (m.score?.fullTime?.away ?? null) : null;

      // Busca jogo existente por times
      const { data: existing } = await supabase
        .from('matches').select('id, score_a, score_b')
        .eq('team_a', homeTeam).eq('team_b', awayTeam)
        .maybeSingle();

      if (existing) {
        const updateData: any = { match_date: matchDate, phase: phaseLabel };
        if (existing.score_a === null && scoreA !== null) {
          updateData.score_a = scoreA;
          updateData.score_b = scoreB;
        }
        await supabase.from('matches').update(updateData).eq('id', existing.id);
        updated++;
      } else {
        await supabase.from('matches').insert({
          team_a: homeTeam, team_b: awayTeam,
          match_date: matchDate, phase: phaseLabel,
          is_knockout: false, score_a: scoreA, score_b: scoreB,
        });
        inserted++;
      }
    }

    return NextResponse.json({ competition: 'BSA', inserted, updated, total: matches.length, dateFrom, dateTo });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
