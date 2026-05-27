import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usa service role para poder fazer UPDATE (RLS não bloqueia server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FD_API = 'https://api.football-data.org/v4';
const WC_ID  = 2000; // ID da Copa do Mundo na football-data.org

export async function GET(req: Request) {
  // Verificação de segurança via token secreto
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Busca jogos finalizados na API
    const res = await fetch(`${FD_API}/competitions/${WC_ID}/matches?status=FINISHED`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! }
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    const matches = json.matches ?? [];

    // Busca todos os jogos do bolão ainda sem placar
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('id, team_a, team_b, score_a, score_b')
      .is('score_a', null);

    if (!dbMatches?.length) {
      return NextResponse.json({ updated: 0, msg: 'Nenhum jogo pendente' });
    }

    let updated = 0;

    for (const m of matches) {
      const homeTeam = m.homeTeam?.name ?? '';
      const awayTeam = m.awayTeam?.name ?? '';
      const scoreA   = m.score?.fullTime?.home;
      const scoreB   = m.score?.fullTime?.away;

      if (scoreA === null || scoreA === undefined) continue;

      // Tenta encontrar o jogo no banco por similaridade de nome
      const dbMatch = dbMatches.find(d =>
        nameMatch(d.team_a, homeTeam) && nameMatch(d.team_b, awayTeam)
      );

      if (!dbMatch) continue;

      // Detecta vencedor nos pênaltis (mata-mata)
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

    return NextResponse.json({ updated, total_finished: matches.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Compara nomes com tolerância a variações (ex: "Brazil" vs "Brasil")
function nameMatch(dbName: string, apiName: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]/g, '');

  const db  = normalize(dbName);
  const api = normalize(apiName);

  if (db === api) return true;

  // Mapa de equivalências
  const aliases: Record<string, string[]> = {
    'brasil':        ['brazil'],
    'alemanha':      ['germany'],
    'franca':        ['france'],
    'espanha':       ['spain'],
    'hollanda':      ['netherlands'],
    'holanda':       ['netherlands'],
    'suica':         ['switzerland'],
    'belgica':       ['belgium'],
    'coreiado sul':  ['southkorea', 'korea republic'],
    'coreia do sul': ['southkorea'],
    'rep tcheca':    ['czechia', 'czech republic'],
    'africado sul':  ['south africa'],
    'africa do sul': ['southafrica'],
    'arabia saudita':['saudi arabia'],
    'nova zelandia': ['new zealand'],
    'costa do marfim':['ivory coast', "cote d'ivoire"],
    'rd congo':      ['dr congo', 'democratic republic of congo'],
    'bosnia herz':   ['bosnia and herzegovina'],
    'bosnia herzeg': ['bosnia and herzegovina'],
  };

  for (const [key, vals] of Object.entries(aliases)) {
    if ((db.includes(key) || key.includes(db)) && vals.some(v => api.includes(normalize(v)))) return true;
    if ((api.includes(key) || key.includes(api)) && vals.some(v => db.includes(normalize(v)))) return true;
  }

  // Partial match como fallback
  return db.length > 4 && api.includes(db.slice(0, 5));
}
