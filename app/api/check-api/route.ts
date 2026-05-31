import { NextResponse } from 'next/server';

const FD_API = 'https://api.football-data.org/v4';

const TEAMS = [
  'Flamengo', 'Palmeiras', 'Corinthians', 'Fluminense', 'Internacional',
  'Gremio', 'Atletico', 'Cruzeiro', 'Botafogo', 'Vasco', 'Sao Paulo',
  'Bahia', 'Santos', 'Paranaense', 'Bragantino', 'Vitoria', 'Coritiba',
  'Mirassol', 'Chapecoense', 'Remo'
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Busca times do Brasileirão Série A (BSA) na football-data.org
    const res = await fetch(`${FD_API}/competitions/BSA/teams`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! }
    });
    const json = await res.json();
    const teams = json.teams ?? [];

    return NextResponse.json({
      total: teams.length,
      teams: teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        crest: t.crest
      }))
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
