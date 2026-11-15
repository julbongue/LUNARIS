# LUNARIS — Frontend (Lunar Explorer)

Frontend **Next.js** do LUNARIS para exploração e análise lunar (globo 3D, seleção de até 3 locais, comparação científica e linha temporal).

- **Frontend**: Next.js (hospedável na Vercel)
- **Backend**: FastAPI (pode correr localmente e ser exposto via Cloudflare Tunnel)
- **Comunicação**: HTTPS via URL configurável por variável de ambiente

> O frontend **não** depende de o backend estar hospedado na Vercel. Em produção (Vercel), aponte para a URL pública do backend/tunnel.

## Requisitos

- Node.js + npm
- Backend LUNARIS (FastAPI) acessível por HTTP/HTTPS (local, tunnel ou servidor remoto)

## Configuração local

1. Instalar dependências:
   ```bash
   npm install
   ```
2. Configurar a URL da API (criar `.env.local` a partir do exemplo):
   ```bash
   cp .env.example .env.local
   ```
   Editar `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```
3. Iniciar em desenvolvimento:
   ```bash
   npm run dev
   ```
4. Abrir `http://localhost:3000`.

## Variáveis de ambiente

| Variável | Obrigatória (produção) | Descrição |
|---|---:|---|
| `NEXT_PUBLIC_API_URL` | Sim | URL base pública do backend FastAPI (ex.: `https://<tunel>.trycloudflare.com` ou `http://127.0.0.1:8000` em local). O frontend normaliza barras finais e preserva os prefixos reais dos endpoints (`/api/v1/...`). |

Notas:
- Todas as chamadas HTTP do frontend passam por um **cliente centralizado** (`lib/api-config.ts` + `lib/api-client.ts` + `services/api.ts`).
- Não existe URL de API hardcoded nos componentes.
- Se `NEXT_PUBLIC_API_URL` não estiver definida em produção, o frontend sinaliza **API não configurada** e as análises ficam indisponíveis (sem fallback silencioso para dados mock/científicos).

## Integração com backend local exposto via Cloudflare Tunnel

1. Executar o backend FastAPI localmente (exemplo):
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
2. Expor com Cloudflare Tunnel (exemplo, quick tunnel):
   ```bash
   cloudflared tunnel --url http://127.0.0.1:8000
   ```
   Copie a URL pública `https://...trycloudflare.com` gerada.
3. Configurar o frontend:
   - Local: `.env.local` → `NEXT_PUBLIC_API_URL=https://<seu-tunel>.trycloudflare.com`
   - Vercel: variável de ambiente `NEXT_PUBLIC_API_URL` com a mesma URL pública.
4. Reiniciar/redeploy do frontend após alterar `NEXT_PUBLIC_API_URL`.

## Configuração na Vercel (produção)

1. No projeto na Vercel: **Settings → Environment Variables**.
2. Adicionar:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: URL pública do backend/tunnel (HTTPS), ex.: `https://nome-do-tunel.trycloudflare.com`
   - **Environments**: Production (e Preview se aplicável).
3. Fazer **Redeploy** para aplicar a variável.
4. Validar no frontend (Lunar Explorer) o indicador de **Estado do backend**.

> A alteração de variáveis `NEXT_PUBLIC_*` requer novo build/deploy.

## Endpoints reais utilizados

O frontend consome os endpoints reais do backend:
- `GET /api/v1/health` — disponibilidade da API
- `GET /api/v1/capabilities` — capacidades/motores (motor científico, provider de efemérides, DEM/topografia quando exposto)
- `GET /api/v1/sites` — listagem de locais (quando disponível)
- `POST /api/v1/analysis` — análise por local (chamadas independentes por local, sincronizadas no mesmo intervalo/passo)

Os contratos/schemas científicos devolvidos pelo backend não são alterados pelo frontend; o frontend normaliza para visualização e nunca inventa resultados.

## Como testar a comunicação

1. Confirmar backend acessível:
   ```bash
   curl -sS "$NEXT_PUBLIC_API_URL/api/v1/health"
   curl -sS "$NEXT_PUBLIC_API_URL/api/v1/capabilities"
   ```
2. Testar análise (exemplo):
   ```bash
   curl -sS -X POST "$NEXT_PUBLIC_API_URL/api/v1/analysis" \
     -H "Content-Type: application/json" \
     -d '{"start_time":"2026-11-15T00:00:00Z","stop_time":"2026-11-15T12:00:00Z","step_minutes":360,"site":{"type":"coordinates","name":"Teste","latitude_deg":-89.9,"longitude_deg":0.0},"thresholds":{"sun_elevation_deg":0,"earth_elevation_deg":5},"include_samples":true}'
   ```
3. No frontend: abrir **Lunar Explorer**, verificar o cartão **Estado do backend** e executar **Analisar** com até 3 locais.

## Resolução de problemas

### CORS
- Sintoma no browser: erro de rede/CORS ao chamar a API (análises ficam “Indisponíveis”, estado pode indicar inacessível).
- Causa: backend não permite a origem do frontend (ex.: `http://localhost:3000` ou domínio `*.vercel.app`).
- Ação: configurar CORS no backend para as origens necessárias (produção Vercel e desenvolvimento local). Não contornar CORS no frontend.

### Cloudflare Tunnel
- Sintoma: “Não foi possível contactar o backend…” / timeout / API offline.
- Verificar: processo do `cloudflared` ativo, URL do tunnel atualizada (quick tunnels mudam de URL), backend local a escutar na porta correta.
- Ação: reiniciar tunnel, atualizar `NEXT_PUBLIC_API_URL` (e redeploy na Vercel se mudou) e usar **Atualizar** no cartão de estado.

### Alternar entre backend local e outro servidor
- Alterar apenas `NEXT_PUBLIC_API_URL` no `.env.local` (dev) ou nas Environment Variables da Vercel (produção) e reiniciar/redeploy.
- Não é necessário alterar código nem componentes.

## Estados e erros tratados no frontend

- API não configurada, indisponível/offline, tunnel desligado, timeout, falhas de rede.
- Erros HTTP: 400, 401/403, 404, 422, 429, 500, 503.
- Respostas inválidas.
- Distinção entre **API**, **motor científico**, **provider de efemérides** e **DEM/topografia** (quando reportado por `/api/v1/capabilities`).
- Resultados antigos não são apresentados como resultado da última análise; ausência de ligação não é confundida com ausência de visibilidade lunar.

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run start` — servir build de produção
- `npm run lint` — lint
- `npm run typecheck` — verificação de tipos TypeScript

## Verificações de produção

Antes de publicar na Vercel:
```bash
npm run lint
npm run typecheck
npm run build
```
(Ausência de segredos no bundle: apenas variáveis `NEXT_PUBLIC_*` são expostas ao cliente, e apenas a URL da API é utilizada.)
