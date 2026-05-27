import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FD_API = 'https://api.football-data.org/v4';

// Competições cobertas pelo plano gratuito da football-data.org
// 2000=Copa do Mundo, 2001=Champions, 2152=Libertadores, 2013=Brasileirão
// 2003=Eredivisie, 2014=La Liga, 2015=Ligue1, 2019=Serie A, 2021=Premier League, 2002=Bundesliga
const COMPETITIONS = '2000,2001,2152,2013,2014,2015,2019,2021,2002';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Busca jogos finalizados nas últimas 24h em todas as competições
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const res = await fetch(
      `${FD_API}/matches?status=FINISHED&competitions=${COMPETITIONS}&dateFrom=${yesterday}&dateTo=${today}`,
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
    );

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    const apiMatches = json.matches ?? [];

    // Busca jogos do bolão ainda sem placar
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('id, team_a, team_b, score_a, score_b, match_date')
      .is('score_a', null);

    if (!dbMatches?.length) {
      return NextResponse.json({ updated: 0, msg: 'Nenhum jogo pendente' });
    }

    let updated = 0;

    for (const m of apiMatches) {
      const homeTeam = m.homeTeam?.name ?? '';
      const awayTeam = m.awayTeam?.name ?? '';
      const scoreA   = m.score?.fullTime?.home;
      const scoreB   = m.score?.fullTime?.away;

      if (scoreA === null || scoreA === undefined) continue;

      // Tenta encontrar o jogo no banco por nome + data próxima
      const apiDate = m.utcDate?.slice(0, 10);
      const dbMatch = dbMatches.find(d => {
        const dbDate = d.match_date?.slice(0, 10);
        return nameMatch(d.team_a, homeTeam) && 
               nameMatch(d.team_b, awayTeam) &&
               (!apiDate || !dbDate || apiDate === dbDate);
      });

      if (!dbMatch) continue;

      let penaltyWinner: 'A' | 'B' | null = null;
      if (m.score?.penalties) {
        const penA = m.score.penalties.home;
        const penB = m.score.penalties.away;
        if (penA !== null && penB !== null) {
          penaltyWinner = penA > penB ? 'A' : 'B';
        }
      }

      const { error } = await supabase
        .from('matches')
        .update({
          score_a: scoreA,
          score_b: scoreB,
          ...(penaltyWinner && { penalty_winner: penaltyWinner })
        })
        .eq('id', dbMatch.id);

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

function nameMatch(dbName: string, apiName: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]/g, '');

  const db  = normalize(dbName);
  const api = normalize(apiName);
  if (db === api) return true;
  if (db.length > 4 && api.includes(db.slice(0, 5))) return true;
  if (api.length > 4 && db.includes(api.slice(0, 5))) return true;

  const aliases: Record<string, string[]> = {
    'brasil':         ['brazil'],
    'alemanha':       ['germany'],
    'franca':         ['france'],
    'espanha':        ['spain'],
    'holanda':        ['netherlands'],
    'suica':          ['switzerland'],
    'belgica':        ['belgium'],
    'coreiadosul':    ['southkorea', 'korearep'],
    'reptcheca':      ['czechia'],
    'africadosul':    ['southafrica'],
    'arabiasaudita':  ['saudiarabia'],
    'novazelandia':   ['newzealand'],
    'costadomarfim':  ['ivorycoast', 'cotedivoire'],
    'rdcongo':        ['drcongo'],
    'corinthians':    ['sportclubecorinthianspaulista'],
    'fluminense':     ['fluminensefootballclub'],
    'flamengo':       ['clubederegatasflamengo'],
    'palmeiras':      ['sociedadeesportivapalmeiras'],
    'saopaulofc':     ['saopaulofutebolclube'],
    'atleticomineiro':['clubeatleticomg'],
    'inter':          ['sportclubinternacional'],
    'gremio':         ['gremio'],
    'bolafc':         ['bolivar'],
    'independiente':  ['clubatleticoindriv'],
  };

  for (const [key, vals] of Object.entries(aliases)) {
    if ((db.includes(key) || key.includes(db)) && 
        vals.some(v => api.includes(normalize(v)))) return true;
    if ((api.includes(key) || key.includes(api)) && 
        vals.some(v => db.includes(normalize(v)))) return true;
  }

  return false;
}
