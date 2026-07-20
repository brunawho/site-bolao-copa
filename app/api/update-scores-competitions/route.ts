import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const FD_API = 'https://api.football-data.org/v4';

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
      // Janela de 2 dias atrás até 2 dias à frente
      const dateFrom = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);
      const dateTo   = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

      const res = await fetch(
        `${FD_API}/competitions/${comp.code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&season=${comp.season}&status=FINISHED`,
        { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
      );

      if (!res.ok) {
        results.push({ competition: comp.code, error: `API error ${res.status}` });
        continue;
      }

      const json = await res.json();
      const matches = json.matches ?? [];
      let updated = 0;

      for (const m of matches) {
        const homeTeam  = m.homeTeam?.name || 'TBD';
        const awayTeam  = m.awayTeam?.name  || 'TBD';
        const matchDate = m.utcDate;

        // Placar
        const penA = m.score?.penalties?.home;
        const penB = m.score?.penalties?.away;
        const hasPenalties = penA != null && penB != null;

        let scoreA: number | null = null;
        let scoreB: number | null = null;
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

        if (scoreA === null) continue;

        let penaltyWinner: 'A' | 'B' | null = null;
        if (hasPenalties) penaltyWinner = penA > penB ? 'A' : 'B';

        // Atualiza placar no banco
        const { data: existing } = await supabase
          .from('matches')
          .select('id, score_locked')
          .eq('team_a', homeTeam)
          .eq('team_b', awayTeam)
          .eq('match_date', matchDate)
          .maybeSingle();

        if (existing && !existing.score_locked) {
          await supabase.from('matches').update({
            score_a: scoreA,
            score_b: scoreB,
            status: 'FINISHED',
            ...(penaltyWinner ? { penalty_winner: penaltyWinner } : { penalty_winner: null }),
          }).eq('id', existing.id);
          updated++;
        }
      }

      results.push({ competition: comp.code, name: comp.name, updated, total_finished: matches.length });
    } catch (e: any) {
      results.push({ competition: comp.code, error: e.message });
    }
  }

  return NextResponse.json({ success: true, results });
}
