import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const FD_API = 'https://api.football-data.org/v4';

const COMP_PHASE_MAP: Record<string, string> = {
  'Regular Season': 'Fase Regular',
  'Group Stage': 'Fase de Grupos',
  'Knockout Stage': 'Mata-Mata',
  'Round of 16': 'Oitavas de Final',
  'Quarter-Finals': 'Quartas de Final',
  'Semi-Finals': 'Semifinais',
  'Final': 'Final',
  'Playoffs': 'Playoffs',
};

function formatPhase(compName: string, stage: string, matchday: number | null): string {
  const phasePT = COMP_PHASE_MAP[stage] || stage;
  if (matchday) return `${compName} · ${phasePT} · Rodada ${matchday}`;
  return `${compName} · ${phasePT}`;
}

function isKnockout(stage: string): boolean {
  return ['Round of 16', 'Quarter-Finals', 'Semi-Finals', 'Final', 'Knockout Stage'].includes(stage);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (token !== process.env.CRON_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Busca competições ativas
  const { data: competitions } = await supabase
    .from('competitions')
    .select('*')
    .eq('active', true);

  if (!competitions?.length) {
    return NextResponse.json({ message: 'Nenhuma competição ativa' });
  }

  const results: any[] = [];

  for (const comp of competitions) {
    try {
      // Janela de 3 dias atrás até 7 dias à frente
      const dateFrom = new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10);
      const dateTo   = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);

      const res = await fetch(
        `${FD_API}/competitions/${comp.code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&season=${comp.season}`,
        { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
      );

      if (!res.ok) {
        results.push({ competition: comp.code, error: `API error ${res.status}` });
        continue;
      }

      const json = await res.json();
      const matches = json.matches ?? [];
      let inserted = 0, updated = 0;

      for (const m of matches) {
        const homeTeam  = m.homeTeam?.name || m.homeTeam?.shortName || 'TBD';
        const awayTeam  = m.awayTeam?.name  || m.awayTeam?.shortName  || 'TBD';
        const matchDate = m.utcDate;
        const status    = m.status;
        const stage     = m.stage || 'Regular Season';
        const matchday  = m.matchday || null;
        const phaseLabel = formatPhase(comp.name, stage, matchday);
        const knockout  = isKnockout(stage);

        // Placar
        const penA = m.score?.penalties?.home;
        const penB = m.score?.penalties?.away;
        const hasPenalties = penA != null && penB != null;

        let scoreA: number | null = null;
        let scoreB: number | null = null;
        if (['FINISHED', 'AWARDED'].includes(status)) {
          if (hasPenalties && m.score?.regularTime?.home != null) {
            scoreA = m.score.regularTime.home;
            scoreB = m.score.regularTime.away;
          } else if (hasPenalties && m.score?.extraTime?.home != null) {
            scoreA = m.score.extraTime.home;
            scoreB = m.score.extraTime.away;
          } else {
            scoreA = m.score?.fullTime?.home ?? null;
            scoreB = m.score?.fullTime?.away ?? null;
          }
        }

        let penaltyWinner: 'A' | 'B' | null = null;
        if (hasPenalties) penaltyWinner = penA > penB ? 'A' : 'B';

        const statusMap: Record<string, string> = {
          'SCHEDULED': 'SCHEDULED', 'TIMED': 'SCHEDULED',
          'IN_PLAY': 'IN_PLAY', 'PAUSED': 'PAUSED',
          'FINISHED': 'FINISHED', 'AWARDED': 'FINISHED',
          'POSTPONED': 'POSTPONED', 'SUSPENDED': 'SUSPENDED',
          'CANCELLED': 'CANCELLED',
        };
        const matchStatus = statusMap[status] || 'SCHEDULED';

        // Verifica se já existe
        const { data: existing } = await supabase
          .from('matches')
          .select('id, score_a, score_b, score_locked, is_knockout, competition_id')
          .eq('team_a', homeTeam)
          .eq('team_b', awayTeam)
          .eq('match_date', matchDate)
          .maybeSingle();

        if (existing) {
          const updateData: any = { phase: phaseLabel, status: matchStatus, competition_id: comp.id };
          if (!existing.is_knockout) updateData.is_knockout = knockout;
          if (scoreA !== null && !existing.score_locked) {
            updateData.score_a = scoreA;
            updateData.score_b = scoreB;
            if (penaltyWinner) updateData.penalty_winner = penaltyWinner;
            else updateData.penalty_winner = null;
          }
          await supabase.from('matches').update(updateData).eq('id', existing.id);
          updated++;
        } else {
          await supabase.from('matches').insert({
            team_a: homeTeam, team_b: awayTeam,
            match_date: matchDate, phase: phaseLabel,
            status: matchStatus, competition_id: comp.id,
            is_knockout: knockout, score_a: scoreA, score_b: scoreB,
            ...(penaltyWinner && { penalty_winner: penaltyWinner }),
          });
          inserted++;
        }
      }

      results.push({ competition: comp.code, name: comp.name, inserted, updated, total: matches.length });
    } catch (e: any) {
      results.push({ competition: comp.code, error: e.message });
    }
  }

  return NextResponse.json({ success: true, results });
}
