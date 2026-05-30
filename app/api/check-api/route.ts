import { NextResponse } from 'next/server';

const API_FOOTBALL = 'https://v3.football.api-sports.io';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    // Testa buscar jogos de hoje na Libertadores e Brasileirão
    const [resLib, resBra, resWC] = await Promise.all([
      fetch(`${API_FOOTBALL}/fixtures?league=13&season=2026&date=${today}`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
      }),
      fetch(`${API_FOOTBALL}/fixtures?league=71&season=2026&date=${today}`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
      }),
      fetch(`${API_FOOTBALL}/fixtures?league=1&season=2026&date=${today}`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
      })
    ]);

    const [jsonLib, jsonBra, jsonWC] = await Promise.all([
      resLib.json(), resBra.json(), resWC.json()
    ]);

    return NextResponse.json({
      date: today,
      libertadores: {
        total: jsonLib?.results,
        errors: jsonLib?.errors,
        matches: jsonLib?.response?.map((f: any) => ({
          home: f.teams?.home?.name,
          away: f.teams?.away?.name,
          time: f.fixture?.date,
          status: f.fixture?.status?.short
        }))
      },
      brasileirao: {
        total: jsonBra?.results,
        errors: jsonBra?.errors,
        matches: jsonBra?.response?.map((f: any) => ({
          home: f.teams?.home?.name,
          away: f.teams?.away?.name,
          time: f.fixture?.date,
          status: f.fixture?.status?.short
        }))
      },
      copa_mundo: {
        total: jsonWC?.results,
        errors: jsonWC?.errors,
        matches: jsonWC?.response?.slice(0, 5)?.map((f: any) => ({
          home: f.teams?.home?.name,
          away: f.teams?.away?.name,
          time: f.fixture?.date,
          status: f.fixture?.status?.short
        }))
      }
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
