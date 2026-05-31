import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FD_API = 'https://api.football-data.org/v4';

// Competições monitoradas na football-data.org
const COMPETITION_CODES = ['WC', 'BSA', 'CL', 'BL1', 'PL', 'PD', 'SA', 'FL1', 'PPL', 'DED', 'ELC'];

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
}

function nameMatch(dbName: string, apiName: string): boolean {
  const db  = normalize(dbName);
  const api = normalize(apiName);
  if (db === api) return true;
  if (db.length > 4 && api.includes(db.slice(0, 5))) return true;
  if (api.length > 4 && db.includes(api.slice(0, 5))) return true;

  const aliases: Record<string, string[]> = {
    'crflamengo':            ['flamengo'],
    'sepalmeiras':           ['palmeiras'],
    'sccorinthianspaulista': ['corinthians'],
    'fluminensefc':          ['fluminense'],
    'scinternal':            ['internacional'],
    'gremiofbpa':            ['gremio'],
    'camineiro':             ['atleticomineiro', 'atleticomg'],
    'cruzeiroec':            ['cruzeiro'],
    'botafogofrj':           ['botafogo'],
    'crvascodagama':         ['vasco'],
    'saopaulofc':            ['saopaulo'],
    'ecbahia':               ['bahia'],
    'santosfc':              ['santos'],
    'caparanaense':          ['paranaense', 'athletico'],
    'rbbragantino':          ['bragantino', 'redbullbragantino'],
    'ecvitoria':             ['vitoria'],
    'coritibafbc':           ['coritiba'],
    'mirassolfc':            ['mirassol'],
    'chapecoenseaf':         ['chapecoense'],
    'clubedoremo':           ['remo'],
  };

  for (const [key, vals] of Object.entries(aliases)) {
    if (db.includes(key) || key.includes(db)) {
      if (vals.some(v => api.includes(normalize(v)))) return true;
    }
    if (api.includes(key) || key.includes(api)) {
      if (vals.some(v => db.includes(normalize(v)))) return true;
    }
  }
  return false;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const debug = searchParams.get('debug') === 'true';

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Busca jogos pendentes no banco
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('id, team_a, team_b, score_a, score_b, match_date, is_knockout')
      .is('score_a', null);

    if (!dbMatches?.length) {
      return NextResponse.json({ updated: 0, msg: 'Nenhum jogo pendente' });
    }

    // Datas a buscar (hoje e ontem no horário Brasília)
    const now         = new Date();
    const todayBR     = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const yesterdayBR = new Date(now.getTime() - 3 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10);

    // Busca jogos finalizados nas últimas 48h em todas as competições
    const res = await fetch(
      `${FD_API}/matches?status=FINISHED&dateFrom=${yesterdayBR}&dateTo=${todayBR}`,
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
    );

    if (!res.ok) throw new Error(`football-data.org error: ${res.status}`);
    const json = await res.json();
    const apiMatches = json.matches ?? [];

    if (debug) {
      return NextResponse.json({
        total: apiMatches.length,
        dates: [yesterdayBR, todayBR],
        matches: apiMatches.map((m: any) => {
          const homeTeam = m.homeTeam?.name ?? '';
          const awayTeam = m.awayTeam?.name ?? '';
          const found = dbMatches.find(d =>
            nameMatch(d.team_a, homeTeam) && nameMatch(d.team_b, awayTeam)
          );
          return {
            home: homeTeam,
            away: awayTeam,
            score: `${m.score?.fullTime?.home} x ${m.score?.fullTime?.away}`,
            competition: m.competition?.name,
            matched: found ? `✅ ${found.team_a} x ${found.team_b}` : '❌ não encontrado'
          };
        })
      });
    }

    let updated = 0;
    for (const m of apiMatches) {
      const homeTeam = m.homeTeam?.name ?? '';
      const awayTeam = m.awayTeam?.name ?? '';
      const scoreA   = m.score?.fullTime?.home;
      const scoreB   = m.score?.fullTime?.away;
      if (scoreA === null || scoreA === undefined) continue;

      const dbMatch = dbMatches.find(d =>
        nameMatch(d.team_a, homeTeam) && nameMatch(d.team_b, awayTeam)
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
