# 🥇 DOM | Ficha Técnica

Plataforma premium para gestão operacional de eventos, desenvolvida para alta performance em campo. O sistema centraliza logística, hospedagem, cronograma e riders técnicos em uma experiência mobile-first (PWA).

## 🚀 Funcionalidades Principais

- **PWA (Progressive Web App)**: Instalável no iOS/Android com ícone customizado e experiência de app nativo.
- **Gestão de Hospedagem**: Suporte a múltiplos hotéis por evento com abas dinâmicas e upload de Room List (PDF).
- **Logística Integrada**: Coordenação de transporte, segurança, responsáveis de banda e local.
- **Cronograma de Produção**: Controle de horários desde a montagem até o encerramento.
- **Armazenamento Local (MinIO)**: Sistema de storage S3-compatible próprio rodando via Docker, garantindo independência e zero custo extra.
- **Automação GPS**: Geração inteligente de links para o Google Maps.

## 🛠️ Stack Tecnológica

- **Frontend**: React, TypeScript, Vite, Framer Motion, Lucide Icons.
- **Backend**: Node.js, tRPC (API type-safe), Express.
- **Banco de Dados**: MySQL 8.0 (Gerenciado via Drizzle ORM).
- **Storage**: MinIO (Hospedagem local de arquivos).
- **Infraestrutura**: Docker & Docker Compose.

## 📦 Estrutura do Projeto

```text
├── client/           # Frontend React
├── server/           # Backend Node.js + tRPC
├── shared/           # Tipagens e constantes compartilhadas
├── drizzle/          # Schema do banco de dados e migrações
├── scripts/          # Scripts de mock e utilitários
└── docker-compose.yml # Orquestração da infraestrutura
```

## 🚀 Como Rodar (Deploy)

O sistema é totalmente dockerizado. Para subir o ambiente completo (App + MySQL + MinIO + phpMyAdmin):

```bash
docker compose up -d --build
```

### Variáveis de Ambiente (.env)
- `DATABASE_URL`: String de conexão MySQL.
- `JWT_SECRET`: Chave para autenticação.
- `S3_ENDPOINT`: Endpoint do MinIO (`http://minio:9000`).
- `S3_ACCESS_KEY` / `S3_SECRET_KEY`: Credenciais do Storage.
- `S3_FORCE_PATH_STYLE`: `true` para MinIO local, `false` para S3/MinIO compatível com host virtual no VPS.

### Produção e VPS
- Para desenvolvimento local, o projeto usa o MinIO do `docker compose`.
- Para VPS ou produção, a recomendação é apontar `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` e `S3_BUCKET` para um storage persistente fora do container do app.
- Você pode usar um MinIO separado no VPS com disco persistente ou qualquer serviço S3-compatible.
- Se o endpoint exigir URLs estilo `bucket.host.com`, defina `S3_FORCE_PATH_STYLE=false`.

## 🥇 Design e Identidade
O design utiliza uma paleta **Luxury Black & Gold**, tipografia Serif clássica e micro-animações para uma sensação de exclusividade e robustez.

---
**DOM PRODUÇÕES** - *Tecnologia para Alta Performance em Eventos.*
