# VPS State Summary - LabOlavs Platform on labolavs.com

**Date:** May 12, 2026  
**Author:** Juan Betancur (olav)  
**Purpose:** Current-reference document for continuing work on the LabOlavs VPS and the AngleMaze project. This version reflects the latest known VPS deployment topology plus the current repository state after the backend integration, persistence work, responsive/mobile UX work, leaderboard/timing additions, and the first visual alignment pass with the landing page design system.

---

## 1. VPS Provider and Server Specs

- **Provider:** Hetzner Cloud
- **Plan:** CPX22 (Shared Resources, Regular Performance)
- **CPU:** 2 vCPU (AMD)
- **RAM:** 4 GB
- **Disk:** 80 GB SSD (NVMe)
- **Traffic:** 20 TB/month
- **Location:** Helsinki, Finland (eu-central)
- **OS:** Ubuntu 24.04.4 LTS (kernel 6.8.0-111-generic)
- **Public IPv4:** 204.168.171.109
- **Public IPv6:** 2a01:4f9:c015:75c::/64
- **Monthly cost:** ~$10.09/month ($9.49 server + $0.60 IPv4)
- **Hetzner project name:** `devops-platform`
- **Hetzner server name:** `devops-platform`
- **Hetzner server ID:** `129057619`

---

## 2. Server Access and Security Configuration

### SSH Access

- **Login user:** `olav` (non-root sudo user, full name: Juan Betancur)
- **SSH command from Windows:** `ssh olav@204.168.171.109`
- **Authentication method:** SSH key only (Ed25519)
- **Private key location on Windows:** `C:\Users\IJR\.ssh\id_ed25519`
- **Public key location on Windows:** `C:\Users\IJR\.ssh\id_ed25519.pub`
- **Public key on server:** `/home/olav/.ssh/authorized_keys`
- **Root login:** Disabled (`PermitRootLogin no`)
- **Password authentication:** Disabled
- **SSH service name on Ubuntu 24.04:** `ssh`

### Firewall (UFW)

- **Status:** Active
- **Default policy:** deny incoming, allow outgoing
- **Allowed ports:**
  - `22/tcp` - SSH
  - `80/tcp` - HTTP
  - `443/tcp` - HTTPS reserved for future direct TLS use
- **Blocked externally:** PostgreSQL (`5432`), backend (`3001`), local frontend ports, and all other non-exposed services

### User Accounts

| User | UID | Groups | Purpose |
|------|-----|--------|---------|
| root | 0 | root | System root, SSH login disabled |
| olav | 1000 | olav, sudo, docker, users | Primary admin user, SSH key access |

---

## 3. Domain and DNS Configuration

### Domain Registration

- **Domain:** `labolavs.com`
- **Registrar:** Namecheap
- **Nameservers:** Cloudflare
- **WhoisGuard:** Enabled

### Cloudflare DNS

- **Cloudflare account email:** `juan.jbetancur852@gmail.com`
- **Cloudflare plan:** Free
- **Proxy status:** Proxied (orange cloud) on all public records

| Type | Name | Content | Proxy Status |
|------|------|---------|-------------|
| A | labolavs.com | 204.168.171.109 | Proxied |
| A | www | 204.168.171.109 | Proxied |
| A | anglemaze | 204.168.171.109 | Proxied |

### SSL/TLS Configuration

- **SSL mode:** Flexible
- **Always Use HTTPS:** Enabled
- **Certificates on VPS:** None currently required because Cloudflare terminates SSL
- **Current server-side transport:** HTTP on port `80`

### Live URLs

- `https://labolavs.com` - landing page
- `https://www.labolavs.com` - landing page
- `https://anglemaze.labolavs.com` - AngleMaze frontend
- `https://anglemaze.labolavs.com/api/health` - AngleMaze backend health endpoint

---

## 4. Application Architecture

### Overview

The VPS currently hosts two deployed web applications:

1. **AngleMaze platform** - PostgreSQL + Node/Express backend + React/Vite frontend + Nginx reverse proxy
2. **Landing page** - separate React/Vite site served through the same reverse-proxy layer

Traffic flow:

```text
Internet
  -> HTTPS
Cloudflare
  -> HTTP :80
VPS
  -> Nginx reverse proxy
    -> labolavs.com / www.labolavs.com      -> landing-page container
    -> anglemaze.labolavs.com/              -> AngleMaze frontend container
    -> anglemaze.labolavs.com/api/          -> AngleMaze backend container

AngleMaze backend
  -> PostgreSQL container (internal network only)
```

### Active Containers / Services

| Service | Project | Internal Port | External Port | Networks | Restart Policy |
|---------|---------|---------------|---------------|----------|----------------|
| db | anglemaze-platform | 5432 | none | default | unless-stopped |
| backend | anglemaze-platform | 3001 | none in production | default, web | unless-stopped |
| frontend | anglemaze-platform | 80 | none in production | default, web | unless-stopped |
| proxy | anglemaze-platform | 80 | 80 host | default, web | unless-stopped |
| landing-page | landing-page | 80 | none | web | unless-stopped |

### Important repo vs VPS note

The **current local repository** still contains a simple local-development `docker-compose.yml` that exposes:

- backend on `3001`
- frontend on `8080`
- database only internally

The **current production VPS compose/proxy setup** is still more advanced than the local Git version because production uses:

- a shared external Docker network named `web`
- a reverse proxy container
- domain-based routing between AngleMaze and the landing page

This mismatch is still one of the main operational caveats for future deployments.

### Persistent Storage

- **Volume:** `pgdata`
- **Mounted path in db container:** `/var/lib/postgresql/data`
- **Purpose:** preserves PostgreSQL data across container rebuilds/restarts

---

## 5. File System Layout on VPS

```text
/home/olav/
|- anglemaze-platform/
|  |- .env
|  |- .env.example
|  |- docker-compose.yml              <- production version on VPS is still ahead of Git
|  |- proxy/
|  |  `- nginx.conf
|  |- frontend/
|  |  |- Dockerfile
|  |  |- nginx.conf
|  |  |- package.json
|  |  |- package-lock.json
|  |  |- vite.config.js
|  |  |- public/assets/
|  |  `- src/
|  |     |- main.jsx
|  |     |- App.jsx                   <- route definitions + RequireTeam guard
|  |     |- index.css                 <- design tokens, theme inheritance, shared game UI classes
|  |     |- context/
|  |     |  `- GameContext.jsx        <- backend-backed global state + session restore
|  |     |- pages/
|  |     |  |- Registration.jsx       <- team registration + saved session + first-time instructions
|  |     |  |- LevelMenu.jsx          <- persisted level menu + winners chart
|  |     |  `- GamePage.jsx           <- Phaser integration + responsive/mobile controls
|  |     |- lib/
|  |     |  `- api.js                 <- frontend API client
|  |     `- game/
|  |        |- config.js              <- Phaser config with fixed internal world + responsive shell strategy
|  |        |- mazeData.js
|  |        |- mazeDataLevel2.js
|  |        |- checkpointData.js
|  |        |- minecraftTheme.js
|  |        `- scenes/
|  |           `- MazeScene.js
|  `- backend/
|     |- Dockerfile
|     |- package.json
|     |- package-lock.json
|     |- prisma.config.ts
|     |- prisma/
|     |  `- schema.prisma
|     `- src/
|        |- server.js                 <- Express + CORS
|        |- db.js                     <- Prisma 7 + PrismaPg adapter
|        |- seed.js                   <- Level seed data
|        `- routes/
|           |- health.js
|           |- teams.js
|           `- progress.js
|
`- landing-page/
   |- Dockerfile
   |- docker-compose.yml
   |- nginx.conf
   `- src/
```

---

## 6. Technology Stack - Current Versions

### Frontend (AngleMaze)

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19 | UI framework |
| React DOM | 19 | rendering |
| React Router DOM | 7 | routing |
| Vite | 7 | build/dev |
| Phaser | 3.90.0 | game engine |
| Nginx | Alpine | serves built frontend |

### Backend (AngleMaze)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20 Alpine | runtime |
| Express | 5.2.1 | HTTP server |
| Prisma | 7.8.0 | ORM |
| @prisma/client | 7.8.0 | generated client |
| @prisma/adapter-pg | Prisma 7 runtime requirement | PostgreSQL adapter |
| pg | runtime dependency | PostgreSQL driver |
| cors | 2.8.6 | CORS middleware |
| dotenv | 17.4.2 | env loading |
| nodemon | 3.1.14 | local dev only |

### Database

| Technology | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 16 Alpine | relational database |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| Docker Engine | container runtime |
| Docker Compose | multi-container orchestration |
| Nginx reverse proxy | host/domain routing |
| Shared Docker network `web` | cross-project routing on VPS |
| Cloudflare | DNS, SSL termination, proxy/CDN |
| UFW | firewall |

---

## 7. Database Schema (Current Prisma State)

The schema is defined in `backend/prisma/schema.prisma` and currently contains **5 models**:

### Team (`teams`)

- `id` UUID primary key
- `course`
- `createdAt`
- `updatedAt`
- Relations:
  - many `TeamMember`
  - many `LevelProgress`
  - many `Attempt`

### TeamMember (`team_members`)

- `id`
- `teamId`
- `name`
- `createdAt`

### Level (`levels`)

- `id` integer primary key
- `name`
- `difficulty`
- `isActive`

Current seeded levels:

- Level 1 - `Right Angles`
- Level 2 - `Tricky Angles`

### LevelProgress (`level_progress`)

- `id`
- `teamId`
- `levelId`
- `unlocked`
- `completed`
- `bestMoves`
- `bestTimeSeconds`
- `bestLivesRemaining`
- `completedAt`
- `updatedAt`

Important current behavior:

- new teams get:
  - Level 1 unlocked
  - Level 2 locked
- when a level is completed:
  - that level is marked `completed = true`
  - that same level is also set `unlocked = false`
  - the next level is unlocked if it exists

### Attempt (`attempts`)

- `id`
- `teamId`
- `levelId`
- `movesCount`
- `durationSeconds`
- `livesRemaining`
- `activeCheckpointId`
- `status`
- `startedAt`
- `endedAt`

### Important Prisma 7 notes

- Prisma now uses the `prisma-client-js` generator with output at `backend/generated/prisma`
- `backend/src/db.js` must build Prisma with:
  - `PrismaPg`
  - `new PrismaClient({ adapter })`
- `prisma db push` is required after schema changes
- `seed.js` is still required to ensure base levels exist

---

## 8. API Endpoints - Current State

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | health check + DB connectivity |
| POST | `/api/teams` | create team + members + initial progress |
| GET | `/api/teams/:id` | fetch team + members + progress |
| POST | `/api/progress/complete-level` | save level completion, stats, unlock next |
| GET | `/api/progress/:teamId` | fetch full team progress |
| GET | `/api/progress/leaderboard/:levelId` | fetch top 10 winners for a level |

### Current payload notes

#### `POST /api/teams`

Request:

```json
{
  "members": ["Ana", "Luis"],
  "course": "8A"
}
```

Behavior:

- creates one `Team`
- creates N `TeamMember` rows
- creates 2 `LevelProgress` rows
- returns team + members + levelProgress

#### `POST /api/progress/complete-level`

Current request shape:

```json
{
  "teamId": "uuid",
  "level": 1,
  "moves": 14,
  "livesRemaining": 3,
  "elapsedSeconds": 47
}
```

Behavior:

- marks the level completed
- stores:
  - `bestMoves`
  - `bestTimeSeconds`
  - `bestLivesRemaining`
- locks the completed level
- unlocks the next level if present
- creates an `Attempt` row with:
  - `movesCount`
  - `durationSeconds`
  - `livesRemaining`
  - `status = completed`
- returns the full progress array for the team

#### `GET /api/progress/leaderboard/:levelId`

Current ranking order:

1. fewest `bestMoves`
2. shortest `bestTimeSeconds`
3. highest `bestLivesRemaining`
4. earliest `completedAt`

---

## 9. Frontend Application State - Current Reality

### Registration / team persistence

The frontend is no longer in-memory only. It now saves and restores real backend data.

Current behavior:

- Registration submits to `POST /api/teams`
- Team object from backend is normalized into `GameContext`
- Team members are stored as display names in context
- `teamId` is saved in:
  - `localStorage`
  - a cookie fallback

### Session restore

`GameContext.jsx` now restores the active team by:

1. reading `teamId` from browser storage
2. calling `GET /api/teams/:id`
3. calling `GET /api/progress/:teamId`
4. rebuilding `team` and `levelProgress`

Current restore state flags:

- `isHydrating`
- `hydrateError`
- `clearSavedSession()`

### Route protection

`frontend/src/App.jsx` now protects:

- `/menu`
- `/game/:levelNum`

Current rules:

- no team -> redirect to `/`
- locked level -> redirect to `/menu`
- already completed level opened directly -> redirect to `/menu`

### Gameplay persistence

On win, `GamePage.jsx` now sends:

- `teamId`
- `level`
- `moves`
- `livesRemaining`
- `elapsedSeconds`

to `POST /api/progress/complete-level`.

Important metric note:

- saved **moves** means **commands used**
- every successful forward command counts
- every successful left/right turn command counts

### Leaderboard / winners chart

The level menu now shows a winners chart for completed levels.

Current chart content:

- rank
- team member names
- course
- best moves
- best time
- best remaining lives

### First-time instructions

Registration now contains a first-time instructions modal controlled with:

- `localStorage` key: `anglemaze:instructionsSeen`

Current note:

- the instructions exist and work
- they are still considered improvable from a beginner-onboarding perspective

---

## 10. Gameplay UX State - Responsive and Mobile

### Phase 1 responsive work

This is complete and working.

Current responsive behavior:

- desktop keeps the canvas + controls side by side
- narrower screens stack the canvas above the controls
- canvas fit is width-aware and height-aware
- Phaser keeps a fixed internal `800x600` world
- outer layout handles responsive scaling

Important Phaser config note:

- `frontend/src/game/config.js` now explicitly uses:
  - `Phaser.Scale.NONE`
  - `Phaser.Scale.CENTER_BOTH`

This preserves a fixed internal game world while the React shell scales the visible viewport.

### Phase 2 mobile controls

This has moved significantly beyond the original desktop-only input model.

Current mobile control model:

- one shared quantity input
- quantity can be:
  - typed directly
  - increased by additive buttons: `+10`, `+30`, `+45`, `+100`
  - reset with `Clear`
- the same quantity is used by three actions:
  - Forward
  - Turn Left
  - Turn Right

Implementation note:

- `GamePage.jsx` now uses a shared motion abstraction for mobile flow
- after a successful action, the mobile quantity resets

### Desktop control model

Desktop still preserves separate numeric inputs for:

- distance
- degrees

This means the current app supports:

- desktop numeric control flow
- mobile compact shared-quantity control flow

without changing the gameplay semantics underneath.

---

## 11. Visual / Theme Integration State

### Current direction

The game has begun a visual alignment pass with the landing page design system.

Current styling architecture:

- `frontend/src/index.css` now contains a shared token layer
- tokens support:
  - light mode by default
  - dark mode through parent-controlled `[data-theme="dark"]`

Important constraint:

- **the game does not own theme state**
- it must only **inherit** the parent project theme
- there is **no local theme toggle logic** in the game

### What is already visually migrated

- Registration page: partially aligned to the parent card/button system
- Level Menu: substantially restyled to use the parent card language
- Gameplay shell: partially restyled away from the old arcade look

### Honest current status

The visual migration is functional but not fully finished.

Current reality:

- Registration and Level Menu are closer to the landing-page system
- Gameplay is much improved but still has some transitional styling remnants
- there is still some dead/hidden legacy gameplay styling and markup that should be cleaned up later

Examples of current technical remnants:

- hidden old turn-icon fragment still exists inside `GamePage.jsx`
- some old gameplay CSS classes remain even if no longer central to the visible UI

This is not a logic blocker, but it is an important maintenance note for future visual polish.

---

## 12. Environment Variables

### Production `.env` on VPS

Expected production values remain conceptually:

```env
POSTGRES_USER=anglemaze
POSTGRES_PASSWORD=<strong password>
POSTGRES_DB=anglemaze
DATABASE_URL=postgresql://anglemaze:<password>@db:5432/anglemaze
PORT=3001
CORS_ORIGIN=https://anglemaze.labolavs.com
NODE_ENV=production
VITE_API_BASE_URL=https://anglemaze.labolavs.com/api
```

### Current `.env.example` in repo

Local development example now reflects the current dev flow:

```env
POSTGRES_USER=anglemaze
POSTGRES_PASSWORD=CHANGE_ME_USE_A_STRONG_PASSWORD
POSTGRES_DB=anglemaze
DATABASE_URL=postgresql://anglemaze:CHANGE_ME_USE_A_STRONG_PASSWORD@db:5432/anglemaze
PORT=3001
CORS_ORIGIN=http://localhost:8080,http://localhost:5173
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:8080/api
```

### CORS behavior

`backend/src/server.js` now supports:

- comma-separated configured origins in `CORS_ORIGIN`
- `localhost` / `127.0.0.1` dynamic dev ports in non-production mode

This specifically fixed local Vite development issues such as:

- `http://localhost:5173`
- `http://localhost:5174`

while keeping production strict.

---

## 13. Docker Compose and Deployment State

### Local repository compose file

Current local `docker-compose.yml` is a local development stack:

- `db` with healthcheck
- `backend` exposed on `3001`
- `frontend` exposed on `8080`
- no proxy service
- no shared `web` network

### Current production compose on VPS

Last known production compose on VPS still includes:

- `db`
- `backend`
- `frontend`
- `proxy`
- shared external Docker network `web`

This is still a known sync gap between repository and VPS.

### Deployment workflow

Current expected AngleMaze deployment flow:

```text
[Windows] edit -> git push -> [VPS] git pull -> docker compose up -d --build
```

### If Prisma schema changed

Run on VPS:

```bash
cd ~/anglemaze-platform
docker compose exec backend npx prisma db push
docker compose exec backend node src/seed.js
```

Note:

- `seed.js` is safe and useful if the `levels` table needs to be re-established
- schema changes were required recently for:
  - `best_time_seconds`
  - `duration_seconds`

### If only frontend build-time env changed

```bash
docker compose up -d --build frontend
```

### If only backend runtime env changed

```bash
docker compose restart backend
```

---

## 14. Recommended Post-Deploy Verification

### On the VPS

```bash
cd ~/anglemaze-platform
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
curl http://localhost/api/health
```

### Functional checks that matter most now

After a deploy, manually verify:

1. Registration still creates teams
2. Team members are saved
3. Level completion saves:
   - moves
   - elapsed time
   - lives
4. Winners chart still loads
5. Session restore still works after refresh
6. Mobile controls still work on small screens
7. Parent-theme inheritance still looks acceptable in both themes

---

## 15. Common Operations Reference

### Check running containers

```bash
cd ~/anglemaze-platform && docker compose ps
cd ~/landing-page && docker compose ps
```

### View logs

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
```

### Restart one service

```bash
docker compose restart backend
docker compose restart frontend
```

### Rebuild and redeploy

```bash
git pull origin main
docker compose up -d --build
```

### Push database schema

```bash
docker compose exec backend npx prisma db push
```

### Seed levels

```bash
docker compose exec backend node src/seed.js
```

### Enter service shells

```bash
docker compose exec backend sh
docker compose exec db psql -U anglemaze -d anglemaze
```

### Teardown

```bash
docker compose down
docker compose down -v
```

---

## 16. Known Issues and Future Work

### Current open issues

1. **Repo vs VPS production config mismatch still exists.**  
   The production reverse-proxy and `web` network wiring are still ahead of the local Git compose file.

2. **Gameplay styling migration is not fully finished.**  
   Registration and Level Menu are closer to the LabOlavs design system. Gameplay is improved but still contains some transitional remnants and cleanup debt.

3. **No CI/CD pipeline.**  
   Deployment is still manual: SSH -> `git pull` -> `docker compose up -d --build`.

4. **No swap configured.**  
   The VPS still relies only on 4 GB RAM.

5. **Cloudflare is still in Flexible SSL mode.**  
   End-to-end encryption between Cloudflare and VPS is still not configured.

6. **No authenticated teacher/admin model.**  
   Active team restore is browser-storage-based, not account/session-based.

### Recently resolved

- Prisma 7 backend initialization issue fixed through `@prisma/adapter-pg`
- frontend-backend integration implemented
- team persistence implemented
- progress persistence implemented
- attempts persistence implemented
- elapsed time persistence implemented
- leaderboard endpoint and winners chart implemented
- refresh/reopen session restore implemented
- route guards implemented
- mobile/small-screen responsive support implemented
- compact mobile quantity control flow implemented

### Next likely improvement areas

- finish visual cleanup of gameplay page
- improve beginner instructions for first-time players
- sync production compose/proxy config back into Git
- add CI/CD or at least scripted deploy helpers
- consider authenticated admin/teacher features

---

## 17. Credentials and Secrets Location Summary

| Secret | Location | Notes |
|--------|----------|-------|
| VPS SSH private key | `C:\Users\IJR\.ssh\id_ed25519` | never commit |
| VPS sudo password | password manager / memory | used for `sudo` |
| PostgreSQL password | `~/anglemaze-platform/.env` on VPS | also used in `DATABASE_URL` |
| Hetzner account | Hetzner dashboard | billing + server management |
| Namecheap account | Namecheap dashboard | domain registration |
| Cloudflare account | Cloudflare dashboard | DNS + proxy + SSL mode |
| AngleMaze GitHub repo | `https://github.com/juanbetancurm/maze_production_test.git` | main app repository |
| Landing page GitHub repo | `https://github.com/juanbetancurm/landing-page.git` | parent project repository |
