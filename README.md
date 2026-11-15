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
   Editar `.env.local` (exemplos):
   ```env
   # Local
   LUNARIS_API_URL=http://127.0.0.1:8000
   # ou via Cloudflare Tunnel (URL atual)
   # LUNARIS_API_URL=https://vary-vienna-rooms-prefers.trycloudflare.com
   ```
3. Iniciar em desenvolvimento:
   ```bash
   npm run dev
   ```
4. Abrir `http://localhost:3000`.

## Variáveis de ambiente

| Variável | Obrigatória (produção) | Descrição |
|---|---:|---|
| `LUNARIS_API_URL` | Sim | URL base do backend FastAPI (ex.: `https://<tunel>.trycloudflare.com` ou `http://127.0.0.1:8000` em local). Usada **no servidor** pelo Next.js para fazer rewrite/proxy de `/api/v1/*` para o backend. Não é exposta ao browser. |

Notas:
- O frontend chama `/api/v1/...` no mesmo domínio (same-origin) e o **Next.js encaminha** para `${LUNARIS_API_URL}/api/v1/...` (`next.config.ts`). Isto evita problemas de CORS no browser.
- Todas as chamadas HTTP do frontend passam por um **cliente centralizado** (`lib/api-config.ts` + `lib/api-client.ts` + `services/api.ts`).
- Não existe URL de API hardcoded nos componentes.
- Também são aceites como aliases de configuração no servidor: `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_URL` (compatibilidade). **Recomendado:** `LUNARIS_API_URL`.

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
   - Local: `.env.local` → `LUNARIS_API_URL=https://<seu-tunel>.trycloudflare.com`
   - Vercel: variável de ambiente `LUNARIS_API_URL` com a mesma URL pública.
4. Reiniciar/redeploy do frontend após alterar `LUNARIS_API_URL`.

## Configuração na Vercel (produção)

1. No projeto na Vercel: **Settings → Environment Variables**.
2. Adicionar:
   - **Name**: `LUNARIS_API_URL`
   - **Value**: `https://vary-vienna-rooms-prefers.trycloudflare.com` (URL pública atual do Cloudflare Tunnel; atualizar se o tunnel mudar)
   - **Environments**: **Production** (e **Preview** se aplicável; **Development** se usar Vercel dev)
3. Fazer **Redeploy** para aplicar a variável.
4. Validar no frontend (Lunar Explorer) o indicador de **Estado do backend**.

> A alteração da variável requer novo build/deploy para que o rewrite/proxy aponte para o destino correto. **Nota:** não é possível confirmar alteração no painel Vercel sem acesso à conta; a configuração acima deve ser aplicada manualmente. Se a Vercel apresentar erro/aviso com variáveis `NEXT_PUBLIC_*`, utilize `LUNARIS_API_URL` (sem prefixo público), como acima.

## Endpoints reais utilizados

O frontend consome os endpoints reais do backend:
- `GET /api/v1/health` — disponibilidade da API
- `GET /api/v1/capabilities` — capacidades/motores (motor científico, provider de efemérides, DEM/topografia quando exposto)
- `GET /api/v1/sites` — listagem de locais (quando disponível)
- `POST /api/v1/analysis` — análise por local (chamadas independentes por local, sincronizadas no mesmo intervalo/passo)

Os contratos/schemas científicos devolvidos pelo backend não são alterados pelo frontend; o frontend normaliza para visualização e nunca inventa resultados.

## Como testar a comunicação

1. Confirmar backend acessível (diretamente):
   ```bash
   curl -sS "$LUNARIS_API_URL/api/v1/health"
   curl -sS "$LUNARIS_API_URL/api/v1/capabilities"
   ```
2. Testar análise (exemplo, diretamente no backend):
   ```bash
   curl -sS -X POST "$LUNARIS_API_URL/api/v1/analysis" \
     -H "Content-Type: application/json" \
     -d '{"start_time":"2026-11-15T00:00:00Z","stop_time":"2026-11-15T12:00:00Z","step_minutes":360,"site":{"type":"coordinates","name":"Teste","latitude_deg":-89.9,"longitude_deg":0.0},"thresholds":{"sun_elevation_deg":0,"earth_elevation_deg":5},"include_samples":true}'
   ```
3. No frontend (com proxy ativo): abrir **Lunar Explorer**, verificar o cartão **Estado do backend** e executar **Analisar** com até 3 locais. As chamadas do browser vão para `/api/v1/*` no mesmo domínio e são reencaminhadas ao backend.

## Resolução de problemas

### CORS
- Com o **proxy do Next.js** (chamadas same-origin para `/api/v1/*` reencaminhadas ao backend), o browser não faz pedidos cross-origin diretos, reduzindo/eliminando problemas de CORS no frontend.
- Se optar por chamadas diretas cross-origin (sem proxy), o backend deve permitir as origens do frontend (`http://localhost:3000`, domínio Vercel) e preflight `OPTIONS`.

### Cloudflare Tunnel
- Sintoma: “Não foi possível contactar o backend…” / timeout / API offline.
- Verificar: processo do `cloudflared` ativo, URL do tunnel atualizada (quick tunnels mudam de URL), backend local a escutar na porta correta.
- Ação: reiniciar tunnel, atualizar `LUNARIS_API_URL` (e redeploy na Vercel se mudou) e usar **Atualizar** no cartão de estado.

### Alternar entre backend local e outro servidor
- Alterar apenas `LUNARIS_API_URL` no `.env.local` (dev) ou nas Environment Variables da Vercel (produção) e reiniciar/redeploy.
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
