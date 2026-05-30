import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FD_API  = 'https://api.football-data.org/v4';
const WC_ID   = 2000; // Copa do Mundo na football-data.org

function toBrazilISO(utcDate: string): string {
  const d  = new Date(utcDate);
  const br = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${br.getUTCFullYear()}-${pad(br.getUTCMonth()+1)}-${pad(br.getUTCDate())}T${pad(br.getUTCHours())}:${pad(br.getUTCMinutes())}:00-03:00`;
}

function isKnockout(stage: string): boolean {
  const ko = ['FINAL', 'SEMI', 'QUARTER', 'ROUND_OF_16', 'LAST_16', 'KNOCKOUT'];
  return ko.some(k => stage?.toUpperCase().includes(k));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const debug = searchParams.get('debug') === 'true';

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let inserted = 0;
  let updated  = 0;
  const logs: string[] = [];

  try {
    // Busca todos os jogos da Copa do Mundo 2026
    const res = await fetch(`${FD_API}/competitions/${WC_ID}/matches`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! }
    });

    if (!res.ok) throw new Error(`football-data.org error: ${res.status}`);
    const json = await res.json();
    const matches = json.matches ?? [];

    logs.push(`Copa do Mundo: ${matches.length} jogos encontrados`);

    for (const m of matches) {
      const homeTeam = m.homeTeam?.name ?? '';
      const awayTeam = m.awayTeam?.name ?? '';
      const utcDate  = m.utcDate ?? '';
      const stage    = m.stage ?? '';
      const group    = m.group ?? '';
      const matchday = m.matchday ?? '';
      const status   = m.status ?? '';

      if (!homeTeam || !awayTeam || !utcDate) continue;

      const matchDate = toBrazilISO(utcDate);
      const phaseLabel = group
        ? `Copa do Mundo 2026 · ${group} · Rodada ${matchday}`
        : `Copa do Mundo 2026 · ${stage}`;
      const knockout = isKnockout(stage);

      // Placar real (só se finalizado)
      const scoreA = ['FINISHED', 'AWARDED'].includes(status)
        ? (m.score?.fullTime?.home ?? null)
        : null;
      const scoreB = ['FINISHED', 'AWARDED'].includes(status)
        ? (m.score?.fullTime?.away ?? null)
        : null;

      // Pênaltis
      let penaltyWinner: 'A' | 'B' | null = null;
      if (m.score?.penalties?.home !== null && m.score?.penalties?.away !== null) {
        const penA = m.score?.penalties?.home;
        const penB = m.score?.penalties?.away;
        if (penA !== undefined && penB !== undefined) {
          penaltyWinner = penA > penB ? 'A' : 'B';
        }
      }

      // Verifica se já existe no banco
      const matchDateUTC = new Date(utcDate).toISOString();
      const dayStart = matchDateUTC.slice(0, 10) + 'T00:00:00Z';
      const dayEnd   = matchDateUTC.slice(0, 10) + 'T23:59:59Z';

      const { data: existing } = await supabase
        .from('matches')
        .select('id, score_a, score_b')
        .or(`team_a.ilike.%${homeTeam.slice(0,5)}%,team_a.eq.${homeTeam}`)
        .gte('match_date', dayStart)
        .lte('match_date', dayEnd)
        .maybeSingle();

      if (existing) {
        const updateData: any = {
          match_date: matchDate,
          phase: phaseLabel,
          is_knockout: knockout,
          team_a: homeTeam,
          team_b: awayTeam,
        };
        // Só atualiza placar se o jogo terminou e ainda não tem placar
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(`ERRO: ${msg}`);
  }

  return NextResponse.json({ inserted, updated, logs, ...(debug && { debug: true }) });
}
