import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FD_API = 'https://api.football-data.org/v4';

const COMPETITIONS = [
  { code: 'WC',  name: 'Copa do Mundo 2026',      knockout: false },
  { code: 'BSA', name: 'Brasileirão 2026',         knockout: false },
  { code: 'CL',  name: 'Champions League 2025/26', knockout: false },
];

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

async function syncCompetition(code: string, compName: string) {
  const res = await fetch(`${FD_API}/competitions/${code}/matches`, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! }
  });

  if (!res.ok) throw new Error(`football-data.org error ${res.status} for ${code}`);
  const json = await res.json();
  const matches = json.matches ?? [];

  let inserted = 0;
  let updated  = 0;

  for (const m of matches) {
    const homeTeam = m.homeTeam?.name ?? '';
    const awayTeam = m.awayTeam?.name ?? '';
    const utcDate  = m.utcDate ?? '';
    const stage    = m.stage ?? '';
    const group    = m.group ?? '';
    const matchday = m.matchday ?? '';
    const status   = m.status ?? '';

    // Ignora jogos sem times definidos ainda (TBD)
    if (!homeTeam || !awayTeam || homeTeam === 'TBD' || awayTeam === 'TBD' || !utcDate) continue;

    const matchDate  = toBrazilISO(utcDate);
    const phaseLabel = group
      ? `${compName} · ${group} · Rodada ${matchday}`
      : `${compName} · ${stage} · Rodada ${matchday}`;
    const knockout   = isKnockout(stage);

    const scoreA = ['FINISHED', 'AWARDED'].includes(status) ? (m.score?.fullTime?.home ?? null) : null;
    const scoreB = ['FINISHED', 'AWARDED'].includes(status) ? (m.score?.fullTime?.away ?? null) : null;

    let penaltyWinner: 'A' | 'B' | null = null;
    const penA = m.score?.penalties?.home;
    const penB = m.score?.penalties?.away;
    if (penA !== null && penA !== undefined && penB !== null && penB !== undefined) {
      penaltyWinner = penA > penB ? 'A' : 'B';
    }

    // Busca por times + dia
    const dayStart = utcDate.slice(0, 10) + 'T00:00:00Z';
    const dayEnd   = utcDate.slice(0, 10) + 'T23:59:59Z';

    const { data: existing } = await supabase
      .from('matches')
      .select('id, score_a, score_b')
      .eq('team_a', homeTeam)
      .eq('team_b', awayTeam)
      .gte('match_date', dayStart)
      .lte('match_date', dayEnd)
      .maybeSingle();

    if (existing) {
      const updateData: any = {
        match_date: matchDate,
        phase: phaseLabel,
        is_knockout: knockout,
      };
      if (existing.score_a === null && scoreA !== null) {
        updateData.score_a = scoreA;
        updateData.score_b = scoreB;
        if (penaltyWinner) updateData.penalty_winner = penaltyWinner;
      }
      await supabase.from('matches').update(updateData).eq('id', existing.id);
      updated++;
    } else {
      await supabase.from('matches').insert({
        team_a: homeTeam,
        team_b: awayTeam,
        match_date: matchDate,
        phase: phaseLabel,
        is_knockout: knockout,
        score_a: scoreA,
        score_b: scoreB,
        ...(penaltyWinner && { penalty_winner: penaltyWinner }),
      });
      inserted++;
    }
  }

  return { inserted, updated, total: matches.length };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const debug = searchParams.get('debug') === 'true';
  const only  = searchParams.get('only'); // ex: ?only=BSA pra rodar só uma

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, any> = {};
  const comps = only
    ? COMPETITIONS.filter(c => c.code === only.toUpperCase())
    : COMPETITIONS;

  for (const comp of comps) {
    try {
      const r = await syncCompetition(comp.code, comp.name);
      results[comp.code] = r;
    } catch (err: unknown) {
      results[comp.code] = { error: err instanceof Error ? err.message : String(err) };
    }
    // Respeita limite de 10 req/min da football-data.org
    await new Promise(r => setTimeout(r, 6500));
  }

  return NextResponse.json({ results, ...(debug && { debug: true }) });
}
