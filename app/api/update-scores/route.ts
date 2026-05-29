import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_FOOTBALL = 'https://v3.football.api-sports.io';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token  = searchParams.get('token');
  const debug  = searchParams.get('debug') === 'true';

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Busca jogos finalizados hoje e ontem no horário de Brasília
    const now       = new Date();
    const todayBR   = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const yesterdayBR = new Date(now.getTime() - 3 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10);

    // Busca os dois dias
    const [resHoje, resOntem] = await Promise.all([
      fetch(`${API_FOOTBALL}/fixtures?date=${todayBR}&status=FT`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
      }),
      fetch(`${API_FOOTBALL}/fixtures?date=${yesterdayBR}&status=FT`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
      })
    ]);

    const [jsonHoje, jsonOntem] = await Promise.all([resHoje.json(), resOntem.json()]);
    const apiMatches = [
      ...(jsonHoje.response ?? []),
      ...(jsonOntem.response ?? [])
    ];

    if (debug) {
      const { data: dbMatches } = await supabase
        .from('matches').select('id, team_a, team_b, match_date').is('score_a', null);

      return NextResponse.json({
        total: apiMatches.length,
        dates_searched: [yesterdayBR, todayBR],
        matches: apiMatches.map((m: any) => {
          const homeTeam = m.teams?.home?.name ?? '';
          const awayTeam = m.teams?.away?.name ?? '';
          const apiDate  = new Date(m.fixture?.date).toISOString().slice(0, 10);
          const found = dbMatches?.find(d => {
            const dbDate = d.match_date?.slice(0, 10);
            return nameMatch(d.team_a, homeTeam) &&
                   nameMatch(d.team_b, awayTeam) &&
                   Math.abs(new Date(d.match_date).getTime() - new Date(m.fixture?.date).getTime()) < 86400000;
          });
          return {
            api_home: homeTeam,
            api_away: awayTeam,
            date: apiDate,
            league: m.league?.name,
            score: `${m.goals?.home ?? '?'} x ${m.goals?.away ?? '?'}`,
            matched_in_db: found ? `✅ ${found.team_a} x ${found.team_b}` : '❌ não encontrado'
          };
        })
      });
    }

    // Modo normal — atualiza placares
    const { data: dbMatches } = await supabase
      .from('matches').select('id, team_a, team_b, score_a, score_b, match_date').is('score_a', null);

    if (!dbMatches?.length) return NextResponse.json({ updated: 0, msg: 'Nenhum jogo pendente' });

    let updated = 0;
    for (const m of apiMatches) {
      const homeTeam = m.teams?.home?.name ?? '';
      const awayTeam = m.teams?.away?.name ?? '';
      const scoreA   = m.goals?.home;
      const scoreB   = m.goals?.away;
      if (scoreA === null || scoreA === undefined) continue;

      const dbMatch = dbMatches.find(d =>
        nameMatch(d.team_a, homeTeam) &&
        nameMatch(d.team_b, awayTeam) &&
        Math.abs(new Date(d.match_date).getTime() - new Date(m.fixture?.date).getTime()) < 86400000
      );
      if (!dbMatch) continue;

      // Pênaltis
      let penaltyWinner: 'A' | 'B' | null = null;
      const penA = m.score?.penalty?.home;
      const penB = m.score?.penalty?.away;
      if (penA !== null && penA !== undefined && penB !== null && penB !== undefined) {
        penaltyWinner = penA > penB ? 'A' : 'B';
      }

      const { error } = await supabase.from('matches').update({
        score_a: scoreA, score_b: scoreB,
        ...(penaltyWinner && { penalty_winner: penaltyWinner })
      }).eq('id', dbMatch.id);
      if (!error) updated++;
    }

    return NextResponse.json({ updated, total_finished: apiMatches.length, pending_in_db: dbMatches.length });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function nameMatch(dbName: string, apiName: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');

  const db  = normalize(dbName);
  const api = normalize(apiName);
  if (db === api) return true;
  if (db.length > 4 && api.includes(db.slice(0, 5))) return true;
  if (api.length > 4 && db.includes(api.slice(0, 5))) return true;

  const aliases: Record<string, string[]> = {
    'brasil':             ['brazil'],
    'alemanha':           ['germany'],
    'franca':             ['france'],
    'espanha':            ['spain'],
    'holanda':            ['netherlands'],
    'suica':              ['switzerland'],
    'belgica':            ['belgium'],
    'coreiadosul':        ['southkorea'],
    'reptcheca':          ['czechia'],
    'africadosul':        ['southafrica'],
    'arabiasaudita':      ['saudiarabia'],
    'novazelandia':       ['newzealand'],
    'costadomarfim':      ['ivorycoast', 'cotedivoire'],
    'rdcongo':            ['drcongo'],
    'flamengo':           ['crflamengo', 'flamengorj'],
    'fluminense':         ['fluminensefc'],
    'palmeiras':          ['seapalmeiras', 'palmeirassp'],
    'corinthians':        ['sccorinthians', 'corinthianssp'],
    'atleticomineiro':    ['atleticomg'],
    'inter':              ['internacional', 'scinter'],
    'gremio':             ['gremiors'],
    'cruzeiro':           ['cruzeiroec', 'cruzeromg'],
    'botafogo':           ['botafogorj'],
    'vasco':              ['vascodagama', 'crvasco'],
    'bahia':              ['ecbahia'],
    'fortaleza':          ['fortalezaec'],
    'athleticopr':        ['athleticoparanaense'],
    'bocajuniors':        ['bocajrs'],
    'riverplate':         ['riverarg'],
    'racing':             ['racingarg'],
    'independiente':      ['independientearg', 'independientemedellin'],
    'nacional':           ['nacionaluy', 'nacionalmontevideo'],
    'penharol':           ['penaroluy'],
    'cerroporteno':       ['cerrouy'],
    'universitario':      ['universitarioperu'],
    'sportingcristal':    ['sportingcristalperu'],
    'tolima':             ['cdtolima'],
    'junior':             ['atleticojunior', 'juniorbarranquilla'],
    'universidadcatolica':['udecatolica', 'ucatolica'],
    'barcelonasc':        ['barcelonaec', 'barcelonaguayaquil'],
    'bolivar':            ['clubbolivar'],
    'cusco':              ['cuscofc'],
    'coquimbo':           ['coquimbounido'],
  };

  for (const [key, vals] of Object.entries(aliases)) {
    const k = normalize(key);
    if ((db.includes(k) || k.includes(db)) && vals.some(v => api.includes(normalize(v)))) return true;
    if ((api.includes(k) || k.includes(api)) && vals.some(v => db.includes(normalize(v)))) return true;
  }
  return false;
}
