# Portal Alfa

Portal React/Vite com API Node preparada para Supabase e deploy no Netlify.

## Rodar localmente

**Prerequisitos:** Node.js.

1. Instale as dependencias:
   `npm install`
2. Crie `.env.local` com base em `.env.example`.
3. No Supabase, execute `supabase/schema.sql` no SQL Editor.
4. Rode o app:
   `npm run dev`

Login inicial criado pelo schema:

- CPF: `000.000.000-00`
- Senha: `rh`

## Deploy no Netlify

1. Publique este projeto em um repositorio Git.
2. No Netlify, crie um site a partir do repositorio.
3. Confirme as configuracoes:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. Em **Site configuration > Environment variables**, adicione:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_URL`
5. Faca o deploy.

O arquivo `netlify.toml` ja redireciona `/api/*` para a Netlify Function.

## Banco Supabase

O schema cria tabelas para colaboradores, senhas, empresa, documentos e logs de auditoria. As tabelas ficam com RLS habilitado e o app acessa tudo pelo backend usando a service role key, que deve ficar somente nas variaveis do Netlify.
