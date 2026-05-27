# Bolão da Copa — v3 (login + grupos)

## ⚠️ MUDANÇAS GRANDES NESTA VERSÃO

- ✅ Login com email e senha (Supabase Auth)
- ✅ Múltiplos grupos (Trabalho, Família, etc.)
- ✅ Convite por link OU código de 6 letras
- ✅ Ranking separado por grupo
- ✅ Mesma pessoa pode estar em vários grupos

## 🚨 ATENÇÃO: BANCO SERÁ ZERADO

O SQL apaga `participants`, `matches`, `guesses` e cria tudo novo.
Você terá que **reinserir os jogos da Copa** e **avisar a galera para criar conta**.

---

## Passo a passo do upgrade

### 1. Atualizar banco
- Abra `v3-migration.sql` (no zip)
- Cole no **Supabase → SQL Editor**
- Clique **Run**

### 2. Habilitar Email Auth no Supabase
- **Authentication → Providers → Email**
- Ativar ☑️
- ⚠️ **Desabilitar "Confirm email"** se quiser login imediato sem precisar confirmar (mais simples)

### 3. Criar os grupos manualmente
No **Table Editor → groups → Insert row**:
- name: `Trabalho` → salva (código gerado automaticamente)
- name: `Família` → salva

Pra ver os códigos gerados, olhe a coluna `invite_code`. Você vai compartilhar:
- Código: `ABC123` (6 letras maiúsculas)
- OU Link: `https://seu-site.vercel.app/convite/ABC123`

### 4. Cadastrar os jogos (mesmos para todos os grupos)
Use o SQL `jogos-copa-2026.sql` da versão anterior.

### 5. Substituir os arquivos do projeto
Substitua **todos** os arquivos por estes (o zip já tem a estrutura completa).

### 6. Subir
```bash
git add .
git commit -m "v3: login + grupos"
git push
```

---

## Como funciona

1. Pessoa acessa o site → vê tela de **Login/Cadastro**
2. Cria conta com email + senha + nome
3. Vai pra `/grupos` (lista de grupos que ela participa)
4. **Primeira vez**: clica em "Entrar em grupo com código" e digita o código que você mandou
5. OU acessa direto o link `/convite/ABC123`
6. Dentro do grupo: tem palpites, galera, ranking, regras — tudo separado por grupo

### Quando você quer convidar a galera:
- Manda o link: `https://seu-site.vercel.app/convite/CODIGO`
- Quem clica, se já estiver logado → entra direto
- Quem não estiver logado → cria conta → entra automaticamente

### Compartilhar do app:
Dentro do grupo, vai em **Galera** → tem botão "Copiar link de convite" 🔗

---

## Como criar mais grupos depois
**Supabase → Table Editor → groups → Insert row** com o nome novo. O código gera automático.

## Trocar nome do grupo
**Table Editor → groups** → edita a linha → salva.
