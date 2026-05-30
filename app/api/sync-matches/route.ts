import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_FOOTBALL = 'https://v3.football.api-sports.io';
const SEASON = 2026;

const COMPETITIONS = [
  { id: 71,  name: 'Brasileirão',   phase: 'Brasileirão 2026',  onlyNext: true  },
  { id: 1,   name: 'Copa do Mundo', phase: 'Copa do Mundo 2026', onlyNext: false },
  { id: 13,  name: 'Libertadores',  phase: 'Libertadores 2026', onlyNext: false },
  { id: 11,  name: 'Sudamericana',  phase: 'Sudamericana 2026', onlyNext: false },
];

async function fetchAPI(path: string) {
  const res = await fetch(`${API_FOOTBALL}${path}`, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

function toBrazilISO(utcDate: string): string {
  const d = new Date(utcDate);
  const br = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${br.getUTCFullYear()}-${pad(br.getUTCMonth()+1)}-${pad(br.getUTCDate())}T${pad(br.getUTCHours())}:${pad(br.getUTCMinutes())}:00-03:00`;
}

function isKnockout(round: string): boolean {
  const ko = ['final', 'semi', 'quarter', 'oitavas', 'semifinal', 'quartas', 'round of', 'knockout', 'mata'];
  return ko.some(k => round.toLowerCase().includes(k));
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

  for (const comp of COMPETITIONS) {
    try {
      let fixtures: any[] = [];

      if (comp.onlyNext) {
        // Busca rodada atual do Brasileirão
        const roundsJson = await fetchAPI(
          `/fixtures/rounds?league=${comp.id}&season=${SEASON}&current=true`
        );
        const currentRound = roundsJson.response?.[0];

        if (!currentRound) {
          // Se não tem rodada atual, busca próximos jogos
          const nextJson = await fetchAPI(
            `/fixtures?league=${comp.id}&season=${SEASON}&next=10`
          );
          fixtures = nextJson.response ?? [];
          logs.push(`${comp.name}: sem rodada atual, buscando próximos 10 jogos → ${fixtures.length} encontrados`);
        } else {
          // Busca também a próxima rodada
          const allRoundsJson = await fetchAPI(
            `/fixtures/rounds?league=${comp.id}&season=${SEASON}`
          );
          const allRounds: string[] = allRoundsJson.response ?? [];
          const currentIdx = allRounds.indexOf(currentRound);
          const nextRound  = allRounds[currentIdx + 1] ?? currentRound;

          const [f1, f2] = await Promise.all([
            fetchAPI(`/fixtures?league=${comp.id}&season=${SEASON}&round=${encodeURIComponent(currentRound)}`),
            fetchAPI(`/fixtures?league=${comp.id}&season=${SEASON}&round=${encodeURIComponent(nextRound)}`)
          ]);
          fixtures = [...(f1.response ?? []), ...(f2.response ?? [])];
          logs.push(`${comp.name}: rodadas "${currentRound}" e "${nextRound}" → ${fixtures.length} jogos`);
        }
      } else {
        // Para Copa do Mundo e Libertadores — busca próximos jogos
        const nextJson = await fetchAPI(
          `/fixtures?league=${comp.id}&season=${SEASON}&next=20`
        );
        fixtures = nextJson.response ?? [];
        logs.push(`${comp.name}: próximos 20 jogos → ${fixtures.length} encontrados`);
      }

      for (const f of fixtures) {
        const homeTeam = f.teams?.home?.name ?? '';
        const awayTeam = f.teams?.away?.name ?? '';
        const utcDate  = f.fixture?.date ?? '';
        const round    = f.league?.round ?? '';
        const status   = f.fixture?.status?.short ?? '';

        if (!homeTeam || !awayTeam || !utcDate) continue;

        const matchDate = toBrazilISO(utcDate);
        const phase     = `${comp.phase} · ${round}`;
        const knockout  = isKnockout(round);

        // Verifica se já existe (por times + janela de 24h)
        const matchDateUTC = new Date(utcDate).toISOString();
        const dayStart = matchDateUTC.slice(0, 10) + 'T00:00:00Z';
        const dayEnd   = matchDateUTC.slice(0, 10) + 'T23:59:59Z';

        const { data: existing } = await supabase
          .from('matches')
          .select('id, score_a, score_b')
          .eq('team_a', homeTeam)
          .eq('team_b', awayTeam)
          .gte('match_date', dayStart)
          .lte('match_date', dayEnd)
          .maybeSingle();

        if (existing) {
          const updateData: any = { match_date: matchDate, phase, is_knockout: knockout };
          if (existing.score_a === null && ['FT','AET','PEN'].includes(status)) {
            updateData.score_a = f.goals?.home ?? null;
            updateData.score_b = f.goals?.away ?? null;
          }
          await supabase.from('matches').update(updateData).eq('id', existing.id);
          updated++;
        } else {
          const scoreA = ['FT','AET','PEN'].includes(status) ? (f.goals?.home ?? null) : null;
          const scoreB = ['FT','AET','PEN'].includes(status) ? (f.goals?.away ?? null) : null;

          await supabase.from('matches').insert({
            team_a: homeTeam,
            team_b: awayTeam,
            match_date: matchDate,
            phase,
            is_knockout: knockout,
            score_a: scoreA,
            score_b: scoreB,
          });
          inserted++;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push(`${comp.name}: ERRO — ${msg}`);
    }
  }

  return NextResponse.json({ inserted, updated, logs, ...(debug && { debug: true }) });
}
