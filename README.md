# Bolão da Copa

MVP de bolão da Copa: Next.js + Supabase + Vercel. Tudo no plano gratuito.

## 1) Rodar localmente

```bash
npm install
cp .env.local.example .env.local
# edite .env.local com URL e ANON KEY do seu Supabase
npm run dev
```

## 2) Configurar Supabase (grátis)

1. Crie conta em https://supabase.com
2. New project → escolha região São Paulo, defina senha (anote).
3. Em **SQL Editor**, cole o SQL do README (seção "Schema") e rode.
4. Em **Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Schema (cole no SQL Editor)

```sql
create table participants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  team_a text not null,
  team_b text not null,
  match_date timestamptz not null,
  score_a int,
  score_b int,
  phase text default 'Fase de grupos'
);

create table guesses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  match_id uuid references matches(id) on delete cascade,
  guess_a int not null,
  guess_b int not null,
  created_at timestamptz default now(),
  unique(participant_id, match_id)
);

create or replace view ranking as
select
  p.id, p.name,
  count(*) filter (where g.guess_a = m.score_a and g.guess_b = m.score_b) as exact_hits,
  count(*) filter (
    where (g.guess_a = m.score_a and g.guess_b = m.score_b) = false
    and sign(g.guess_a - g.guess_b) = sign(m.score_a - m.score_b)
  ) as result_hits,
  (count(*) filter (where g.guess_a = m.score_a and g.guess_b = m.score_b) * 3
   + count(*) filter (
       where (g.guess_a = m.score_a and g.guess_b = m.score_b) = false
       and sign(g.guess_a - g.guess_b) = sign(m.score_a - m.score_b)
     ) * 1) as total_points
from participants p
left join guesses g on g.participant_id = p.id
left join matches m on m.id = g.match_id and m.score_a is not null and m.score_b is not null
group by p.id, p.name
order by total_points desc;

alter table participants enable row level security;
alter table matches enable row level security;
alter table guesses enable row level security;

create policy "read all" on participants for select using (true);
create policy "insert all" on participants for insert with check (true);
create policy "read all" on matches for select using (true);
create policy "read all" on guesses for select using (true);
create policy "insert all" on guesses for insert with check (true);
```

### Cadastrar jogos (manual via Supabase)

Em **Table Editor → matches → Insert row**:
- team_a: Brasil
- team_b: Argentina
- match_date: 2026-06-15 16:00 (timestamp)
- phase: Fase de grupos
- score_a, score_b: deixe em branco (preencha depois do jogo)

Quando o jogo acabar, edite a linha e preencha `score_a` e `score_b`. O ranking se recalcula sozinho.

## 3) Publicar grátis na Vercel

1. Crie conta em https://vercel.com (com GitHub).
2. Suba este projeto pro GitHub (`git init`, `git push`).
3. Na Vercel: **Add New → Project → Import** seu repositório.
4. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clique **Deploy**.

Pronto. URL gratuita: `https://bolao-da-copa-xxx.vercel.app`. Você pode renomear o projeto na Vercel pra ter um link mais bonito tipo `bolao-da-copa.vercel.app` (se estiver livre).

## 4) Compartilhar com a galera

É só mandar o link da Vercel no WhatsApp. Cada um digita o nome e palpita. Quem usar Android/iPhone pode "Adicionar à tela inicial" pelo navegador — vira ícone igual app.

## 5) Como evoluir depois

- **Trancar palpite antes do jogo começar:** filtrar na tela `match_date > now()`.
- **Pontuação bônus:** acertar saldo de gols vale 2, etc. Mexer só na view `ranking`.
- **Senha leve:** adicionar coluna `pin` em `participants` e validar no login.
- **Admin no app:** página `/admin` protegida por PIN pra atualizar placar real.
- **Realtime:** trocar `select` por `supabase.channel(...)` pra ranking atualizar ao vivo.

## Regras de pontuação

- 3 pts: placar exato (2x1 chutou, 2x1 saiu)
- 1 pt: acertou vencedor ou empate (2x1 chutou, 3x0 saiu)
- 0 pt: errou
