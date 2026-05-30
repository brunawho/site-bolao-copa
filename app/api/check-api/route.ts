import { NextResponse } from 'next/server';

const API_FOOTBALL = 'https://v3.football.api-sports.io';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Testa a chave e busca ligas do Brasil + Copa do Mundo
    const [resBrasil, resWC, resStatus] = await Promise.all([
      fetch(`${API_FOOTBALL}/leagues?country=Brazil&season=2026`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
      }),
      fetch(`${API_FOOTBALL}/leagues?type=World+Cup&season=2026`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
      }),
      fetch(`${API_FOOTBALL}/status`, {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
      })
    ]);

    const [jsonBrasil, jsonWC, jsonStatus] = await Promise.all([
      resBrasil.json(), resWC.json(), resStatus.json()
    ]);

    return NextResponse.json({
      api_status: jsonStatus?.response,
      brasil_leagues: jsonBrasil?.response?.map((l: any) => ({
        id: l.league?.id,
        name: l.league?.name,
        type: l.league?.type,
        season: l.seasons?.find((s: any) => s.year === 2026)
      })),
      world_cup: jsonWC?.response?.map((l: any) => ({
        id: l.league?.id,
        name: l.league?.name,
        country: l.country?.name,
        season: l.seasons?.find((s: any) => s.year === 2026)
      }))
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
