import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FD_API = 'https://api.football-data.org/v4';
const COMPETITIONS = '2000,2001,2152,2013,2014,2015,2019,2021,2002';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const debug = searchParams.get('debug') === 'true';

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const res = await fetch(
      `${FD_API}/matches?status=FINISHED&competitions=${COMPETITIONS}&dateFrom=${yesterday}&dateTo=${today}`,
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
    );

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    const apiMatches = json.matches ?? [];

    if (debug) {
      return NextResponse.json({
        total: apiMatches.length,
        matches: apiMatches.map((m: any) => ({
          home: m.homeTeam?.name,
          away: m.awayTeam?.name,
          date: m.utcDate?.slice(0, 10),
          score: `${m.score?.fullTime?.home} x ${m.score?.fullTime?.away}`,
          competition: m.competition?.name
        }))
      });
    }

    const { data: dbMatches } = await supabase
      .from('matches')
      .select('id, team_a, team_b, score_a, score_b, match_date')
      .is('score_a', null);

    if (!dbMatches?.length) return NextResponse.json({ updated: 0, msg: 'Nenhum jogo pendente' });

    let updated = 0;
    for (const m of apiMatches) {
      const homeTeam = m.homeTeam?.name ?? '';
      const awayTeam = m.awayTeam?.name ?? '';
      const scoreA   = m.score?.fullTime?.home;
      const scoreB   = m.score?.fullTime?.away;
      if (scoreA === null || scoreA === undefined) continue;

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
        if (penA !== null && penB !== null) penaltyWinner = penA > penB ? 'A' : 'B';
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

  // Partial match — se um contém os 5 primeiros chars do outro
  if (db.length > 4 && api.includes(db.slice(0, 5))) return true;
  if (api.length > 4 && db.includes(api.slice(0, 5))) return true;

  const aliases: Record<string, string[]> = {
    // Seleções Copa do Mundo
    'brasil':              ['brazil', 'cbf'],
    'alemanha':            ['germany'],
    'franca':              ['france'],
    'espanha':             ['spain'],
    'holanda':             ['netherlands'],
    'suica':               ['switzerland'],
    'belgica':             ['belgium'],
    'coreiadosul':         ['southkorea', 'korearep'],
    'reptcheca':           ['czechia', 'czechrepublic'],
    'africadosul':         ['southafrica'],
    'arabiasaudita':       ['saudiarabia'],
    'novazelandia':        ['newzealand'],
    'costadomarfim':       ['ivorycoast', 'cotedivoire'],
    'rdcongo':             ['drcongo'],
    'bosniaherz':          ['bosniaandherzegovina'],

    // Times brasileiros (nome curto → nome completo da API)
    'flamengo':            ['crflamengo', 'clubederegatasflamengo'],
    'fluminense':          ['fluminensefootballclub', 'fluminensefc'],
    'palmeiras':           ['sociedadeesportivapalmeiras', 'seapalmeiras'],
    'corinthians':         ['sportclubecorinthianspaulista', 'sccorinthians'],
    'saopaulofc':          ['saopaulofutebolclube', 'saopaulofc'],
    'saopaulofc':          ['saopaulofutebolclube'],
    'atleticomineiro':     ['clubeatleticomg', 'atleticomg', 'atleticomgfc'],
    'inter':               ['sportclubinternacional', 'internacional'],
    'gremio':              ['gremio', 'gremiofoot'],
    'santos':              ['santosfc', 'santsfutebolclube'],
    'botafogo':            ['botafogoderj', 'botafogofr'],
    'vasco':               ['crvasco', 'vascodagama'],
    'cruzeiro':            ['cruzeiroec'],
    'bahia':               ['ecbahia', 'esporteclubebahia'],
    'fortaleza':           ['fortalezaec'],
    'athleticopr':         ['clubeatleticoparanaense', 'athletico'],

    // Times sul-americanos comuns na Libertadores
    'nacional':            ['clubnacionaldefootball', 'nacionaluy'],
    'penharol':            ['clubatleticope', 'penaroluy'],
    'riverplate':          ['clubatleticoriverplate', 'riverplatearg'],
    'bocajuniors':         ['clubatleticobocajuniors'],
    'racing':              ['racingclubarg'],
    'independiente':       ['clubatleticoindependiente', 'independientemedellin', 'cdindependientemedellin'],
    'sanlorenzo':          ['casanlorenzoalmagro'],
    'huracan':             ['clubatleticohuracan'],
    'lanus':               ['clubatleticolanusarg'],
    'talleres':            ['tallerescordoba'],
    'estudianteslp':       ['estudiantesdelajplata', 'estudianteslaplata'],
    'velez':               ['velezssfield'],
    'tigre':               ['clubatleticotigre'],
    'colocolo':            ['clubsocialydeportivocolocolo'],
    'universidaddechile':  ['clubuniversidaddechile'],
    'universidadcatolica': ['clubdeportivouniversidadcatolica'],
    'coquimbo':            ['cdcoquimbounido'],
    'huracanarg':          ['clubatleticohuracan'],
    'bolivar':             ['clubbolicar', 'clubbolivar'],
    'strongest':           ['thestrongest'],
    'wilstermann':         ['clubdeportivowilstermann'],
    'always ready':        ['clubalwaysready'],
    'oriente petrolero':   ['cluborientepetrolerobogota'],
    'universitario':       ['clubuniversitariodedeportes'],
    'alianza lima':        ['clubalianzalima'],
    'sporting cristal':    ['clubsportingcristal'],
    'melgar':              ['fnmelgar'],
    'tolima':              ['cdtolima'],
    'medellin':            ['deportivomedellin', 'independientemedellin'],
    'millonarios':         ['millonariosfc'],
    'america cali':        ['americadecali'],
    'junior':              ['atleticojuniorbarranquilla'],
    'cusco':               ['cuscofc'],
    'peñarol':             ['clubnacionaldefootball', 'penarol'],
    'santa fe':            ['cdcoquimbounido', 'santafe'],
  };

  const normalize2 = normalize;
  for (const [key, vals] of Object.entries(aliases)) {
    const k = normalize2(key);
    if ((db.includes(k) || k.includes(db)) && vals.some(v => api.includes(normalize2(v)))) return true;
    if ((api.includes(k) || k.includes(api)) && vals.some(v => db.includes(normalize2(v)))) return true;
  }

  return false;
}
