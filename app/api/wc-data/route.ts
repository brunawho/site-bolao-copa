import { NextResponse } from 'next/server';

const FD_API = 'https://api.football-data.org/v4';
const WC_ID  = 2000;

// Bandeiras das seleções via flagcdn.com
const FLAG_CODES: Record<string, string> = {
  'Algeria': 'dz', 'Argentina': 'ar', 'Australia': 'au', 'Austria': 'at',
  'Belgium': 'be', 'Bosnia-Herzegovina': 'ba', 'Brazil': 'br', 'Canada': 'ca',
  'Cape Verde Islands': 'cv', 'Colombia': 'co', 'Congo DR': 'cd', 'Croatia': 'hr',
  'Curaçao': 'cw', 'Czechia': 'cz', 'Ecuador': 'ec', 'Egypt': 'eg',
  'England': 'gb-eng', 'France': 'fr', 'Germany': 'de', 'Ghana': 'gh',
  'Haiti': 'ht', 'Iran': 'ir', 'Iraq': 'iq', 'Ivory Coast': 'ci',
  'Japan': 'jp', 'Jordan': 'jo', 'Mexico': 'mx', 'Morocco': 'ma',
  'Netherlands': 'nl', 'New Zealand': 'nz', 'Norway': 'no', 'Panama': 'pa',
  'Paraguay': 'py', 'Portugal': 'pt', 'Qatar': 'qa', 'Saudi Arabia': 'sa',
  'Scotland': 'gb-sct', 'Senegal': 'sn', 'South Africa': 'za', 'South Korea': 'kr',
  'Spain': 'es', 'Sweden': 'se', 'Switzerland': 'ch', 'Tunisia': 'tn',
  'Turkey': 'tr', 'United States': 'us', 'Uruguay': 'uy', 'Uzbekistan': 'uz',
};

// Escudos dos times de clube via football-data.org IDs
// https://crests.football-data.org/{id}.png
const CLUB_CRESTS: Record<string, string> = {
  'CR Flamengo':            'https://crests.football-data.org/264.png',
  'SE Palmeiras':           'https://crests.football-data.org/1598.png',
  'SC Corinthians Paulista':'https://crests.football-data.org/1783.png',
  'Fluminense FC':          'https://crests.football-data.org/263.png',
  'SC Internacional':       'https://crests.football-data.org/1784.png',
  'Grêmio FBPA':            'https://crests.football-data.org/1777.png',
  'CA Mineiro':             'https://crests.football-data.org/1062.png',
  'Cruzeiro EC':            'https://crests.football-data.org/1782.png',
  'Botafogo FR':            'https://crests.football-data.org/262.png',
  'CR Vasco da Gama':       'https://crests.football-data.org/260.png',
  'São Paulo FC':           'https://crests.football-data.org/1785.png',
  'EC Bahia':               'https://crests.football-data.org/1774.png',
  'Santos FC':              'https://crests.football-data.org/1773.png',
  'CA Paranaense':          'https://crests.football-data.org/1768.png',
  'RB Bragantino':          'https://crests.football-data.org/1747.png',
  'EC Vitória':             'https://crests.football-data.org/7991.png',
  'Coritiba FBC':           'https://crests.football-data.org/1771.png',
  'Mirassol FC':            'https://crests.football-data.org/7453.png',
  'Chapecoense AF':         'https://crests.football-data.org/1769.png',
  'Clube do Remo':          'https://crests.football-data.org/7986.png',
};

function getCrest(teamName: string): string | null {
  // Primeiro tenta escudo de clube
  if (CLUB_CRESTS[teamName]) return CLUB_CRESTS[teamName];
  // Depois tenta bandeira de seleção
  const code = FLAG_CODES[teamName];
  if (code) return `https://flagcdn.com/w40/${code}.png`;
  return null;
}

let cachedData: any = null;
let cachedAt: number = 0;
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 horas

export async function GET() {
  if (cachedData && Date.now() - cachedAt < CACHE_TTL) {
    return NextResponse.json(cachedData);
  }

  try {
    const res = await fetch(`${FD_API}/competitions/${WC_ID}/teams`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! }
    });
    const json = await res.json();
    const teams = json.teams ?? [];

    const result = {
      teams: teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        flag: getCrest(t.name)
      })).sort((a: any, b: any) => a.name.localeCompare(b.name)),
      players: teams.flatMap((t: any) =>
        (t.squad ?? []).map((p: any) => ({
          name: p.name,
          team: t.name,
          position: p.position,
          nationality: p.nationality,
          flag: getCrest(t.name)
        }))
      ).sort((a: any, b: any) => a.name.localeCompare(b.name)),
      // Mapa completo de escudos para uso nos palpites
      crests: Object.fromEntries(
        Object.keys({ ...CLUB_CRESTS, ...FLAG_CODES }).map(name => [name, getCrest(name)])
      )
    };

    cachedData = result;
    cachedAt = Date.now();

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
