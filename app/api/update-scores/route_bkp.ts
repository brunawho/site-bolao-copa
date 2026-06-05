import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FD_API = 'https://api.football-data.org/v4';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const debug = searchParams.get('debug') === 'true';

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Janela de busca: últimas 48h no horário de Brasília
    const now         = new Date();
    const todayBR     = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const yesterdayBR = new Date(now.getTime() - 3 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10);

    // Busca FINISHED e IN_PLAY para pegar jogos que terminaram recentemente
    const res = await fetch(
      `${FD_API}/matches?status=FINISHED,IN_PLAY,PAUSED&dateFrom=${yesterdayBR}&dateTo=${todayBR}`,
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
    );

    if (!res.ok) throw new Error(`football-data.org error: ${res.status}`);
    const json = await res.json();
    const apiMatches = json.matches ?? [];

    // Busca jogos pendentes no banco
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('id, team_a, team_b, score_a, score_b, match_date')
      .is('score_a', null);

    if (!dbMatches?.length) {
      return NextResponse.json({ updated: 0, msg: 'Nenhum jogo pendente' });
    }

    if (debug) {
      return NextResponse.json({
        total: apiMatches.length,
        dates: [yesterdayBR, todayBR],
        pending_in_db: dbMatches.length,
        matches: apiMatches.map((m: any) => {
          const homeTeam = m.homeTeam?.name ?? '';
          const awayTeam = m.awayTeam?.name ?? '';
          const apiDate  = m.utcDate?.slice(0, 10);
          // Tenta casar por nome exato + data
          const found = dbMatches.find(d => {
            const dbDate = new Date(d.match_date).toISOString().slice(0, 10);
            return d.team_a === homeTeam && d.team_b === awayTeam && dbDate === apiDate;
          });
          // Tenta só por nome exato (sem data)
          const foundByName = dbMatches.find(d =>
            d.team_a === homeTeam && d.team_b === awayTeam
          );
          return {
            home: homeTeam,
            away: awayTeam,
            api_date: apiDate,
            status: m.status,
            score: `${m.score?.fullTime?.home} x ${m.score?.fullTime?.away}`,
            competition: m.competition?.name,
            matched_exact: found ? `✅ ${found.team_a} x ${found.team_b}` : '❌',
            matched_name_only: foundByName ? `✅ ${foundByName.team_a} x ${foundByName.team_b} (${new Date(foundByName.match_date).toISOString().slice(0,10)})` : '❌'
          };
        })
      });
    }

    let updated = 0;
    for (const m of apiMatches) {
      const homeTeam = m.homeTeam?.name ?? '';
      const awayTeam = m.awayTeam?.name ?? '';
      const status   = m.status ?? '';
      const scoreA   = m.score?.fullTime?.home;
      const scoreB   = m.score?.fullTime?.away;
      const apiDate  = m.utcDate?.slice(0, 10);
      // Só atualiza jogos finalizados com placar real
      if (!['FINISHED', 'AWARDED'].includes(status)) continue;
      if (scoreA === null || scoreA === undefined) continue;

      // Casa por nome exato — sem depender de data pois o sync já salvou certo
      const dbMatch = dbMatches.find(d =>
        d.team_a === homeTeam && d.team_b === awayTeam
      );
      if (!dbMatch) continue;

      let penaltyWinner: 'A' | 'B' | null = null;
      const penA = m.score?.penalties?.home;
      const penB = m.score?.penalties?.away;
      if (penA != null && penB != null) {
        penaltyWinner = penA > penB ? 'A' : 'B';
      }

      const { error } = await supabase.from('matches').update({
        score_a: scoreA,
        score_b: scoreB,
        ...(penaltyWinner && { penalty_winner: penaltyWinner })
      }).eq('id', dbMatch.id);

      if (!error) updated++;
    }

    return NextResponse.json({
      updated,
      total_finished: apiMatches.length,
      pending_in_db: dbMatches.length
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
