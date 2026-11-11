# AngleMaze

**Move with Math!**

**[Play the live game](https://anglemaze.labolavs.com/)**

AngleMaze is a browser-based maze game where players guide a character with explicit distance and angle commands. Predict a route, enter the numbers, and see how each move changes the player’s position and direction.

![AngleMaze Level 2 on a laptop, with the player, Stone Golems, checkpoints, exit, coordinates, controls, and protractor visible](docs/media/screenshots/anglemaze-level2-laptop-protractor.png)
<p align="center"><em>Level 2: distance and turn controls share the screen with the maze, player coordinates, enemies, checkpoints, exit, and protractor.</em></p>

## What is AngleMaze?

AngleMaze makes geometry part of the action. Instead of steering with arrow keys, a player chooses how far to move and how many degrees to turn. The game then shows the result on the maze, so learners can compare a prediction with the route and coordinates they actually produce.

The game is intended for learners practicing angles, distance, coordinates, and spatial reasoning, and for educators demonstrating those ideas through interaction. It is a practice experience; no formal learning-outcome study is claimed.

Players register a team and course before choosing a level. Completed runs record moves, elapsed time, and remaining lives. The level leaderboard orders teams by fewest moves, then fastest time, then most lives remaining.

## How the game works

1. **Register a team and course.** Team progress is stored by the game’s API.
2. **Choose a level.** Level 1 introduces right-angle routes. Completing it unlocks Level 2.
3. **Move by distance.** Enter a distance in maze pixels and choose **Forward**. The character travels along its current heading; a turn and a move are separate commands.
4. **Turn by degrees.** Choose **Turn Left** or **Turn Right** and enter an angle. The character rotates in place.
5. **Plan with the math display.** Read the player’s coordinates and optionally show the protractor centered on the player.
6. **Navigate hazards.** Avoid wooden walls and, in Level 2, Stone Golems. A collision costs a life; while lives remain, the player respawns at the active checkpoint or the level start. Losing the last life resets the run. Level 2 checkpoints become respawn points when reached.
7. **Reach the exit.** Completing a level records the run and updates team progress.

### Move by distance

Enter a distance and press **Forward**. The player travels along the current heading, and the coordinate display updates to the resulting position.

![Gameplay recording: enter a 100-pixel distance and move the player forward; the coordinates update](docs/media/gifs/distance-based-movement.gif)
<p align="center"><em>A 100-pixel command moves the player from (60, 60) to (160, 60).</em></p>

### Turn by angle

Enter an angle and choose **Turn Left** or **Turn Right**. The player rotates in place; the next forward command uses the updated heading.

![Gameplay recording: turn the player left by 90 degrees and see the heading update](docs/media/gifs/angle-based-rotation.gif)
<p align="center"><em>The 90° turn changes the heading from right to up without moving the player.</em></p>

### The protractor is optional

The interactive protractor is an optional visual aid, not a requirement for movement. Players can enter a distance and turn with the protractor hidden. Show it whenever you want a visual reference for the player’s heading and angle planning, then hide it again at any time. The same movement and rotation controls work in either state.

![Gameplay recording showing navigation with the protractor hidden, then shown for a 45-degree turn, and hidden again](docs/media/gifs/optional-protractor.gif)
<p align="center"><em>The protractor can be toggled on for a turn and hidden again; it does not control movement.</em></p>

### The angle and coordinate convention

The maze uses a fixed logical playfield with its origin at the upper-left. X increases to the right; Y increases downward. The game’s heading values are:

| Heading | Screen direction |
|---:|---|
| 0° | Right |
| 90° | Up |
| 180° | Left |
| 270° | Down |

A left turn adds degrees; a right turn subtracts them. For a clear path of distance *d* at heading *θ*, the coordinate change is:

<p align="center"><code>x₂ = x₁ + d cos(θ)</code> &nbsp;&nbsp; <code>y₂ = y₁ − d sin(θ)</code></p>

For example, the phone screenshot below shows a +45° turn ending at 225°. At that heading, a forward move goes down and left on screen. The live protractor shows the turn and the player’s direction against the same angle convention.

<p align="center">
  <img src="docs/media/screenshots/anglemaze-level2-phone-45-degree-turn.png" alt="Phone gameplay screenshot showing a 45-degree turn and the protractor marking the resulting 225-degree heading" width="360">
</p>
<p align="center"><em>A 45° turn changes the heading to 225°, which points down-left in the maze’s screen coordinates.</em></p>

### The two levels

| Level | What it introduces |
|---|---|
| **Level 1 — Right Angles** | Horizontal and vertical corridors provide an introduction to distance commands and 90° turns. |
| **Level 2 — Tricky Angles** | Diagonal walls require non-right-angle planning; the level includes 30°, 45°, and 60° turns, a protractor, Stone Golems, and checkpoints. |

![Full Level 1 desktop interface showing the player, right-angle maze, exit, distance and turn controls, coordinates, and lives](docs/media/screenshots/anglemaze-level1-desktop.png)
<p align="center"><em>Level 1 keeps the route focused on right-angle turns before diagonal corridors appear in Level 2.</em></p>

## Player, enemies, and visual design

The active game uses a top-down player, a four-frame walk cycle, a Stone Golem sprite, painted grass, wooden wall art, checkpoint badges, and an exit marker. The full Level 2 screenshot above shows these elements together in their actual gameplay layout.

<p align="center"><strong>Standing player</strong><br><img src="frontend/public/assets/premium/characters/player-topdown-v2.png" alt="Current top-down standing player sprite" width="150"></p>
<p align="center"><strong>Stone Golem</strong><br><img src="frontend/public/assets/premium/characters/golem-static-v2.png" alt="Current Stone Golem sprite with glowing eyes and foliage" width="180"></p>

During movement, the game selects among four walk poses based on actual travel distance and adds a restrained lift and contact-shadow change; the frames do not advance on a wall-clock timer. The distance-based movement demonstration above shows the animation in gameplay context. When standing, the game uses the top-down player artwork. Stone Golems use one sprite that smoothly turns toward the player rather than a multi-direction animation sheet.

![Gameplay recording of the player navigating near a Stone Golem, taking a hit, and losing a life](docs/media/gifs/stone-golem-interaction.gif)
<p align="center"><em>Stone Golems are hazards: contact costs a life, so players must plan a route around them.</em></p>

## Responsive experience

The game preserves its 4:3 logical playfield as the browser resizes it. React manages the responsive layout and touch controls; Phaser keeps movement and collision coordinates in the same 800 × 600 game space. The coordinate display and protractor are rendered as SVG over the game canvas, keeping their positions aligned as the board scales.

On desktop and laptop screens, controls sit beside the maze. On portrait tablet and phone screens, the board fills the available width and controls flow below it.

<p align="center"><strong>Portrait tablet · 768 × 1024</strong><br><img src="docs/media/screenshots/anglemaze-level2-tablet-portrait.png" alt="Level 2 on a portrait tablet, with the full maze above vertically stacked controls" width="360"></p>
<p align="center"><strong>Phone · 360 × 800</strong><br><img src="docs/media/screenshots/anglemaze-level2-phone-portrait.png" alt="Level 2 on a phone with touch controls below the maze" width="220"></p>

The phone angle-turn screenshot earlier in this README also shows the mobile touch controls and optional protractor together. Short landscape viewports can require vertical scrolling to reach controls.

## Checkpoints and level completion

In Level 2, passing through a checkpoint saves it as the latest respawn point. A collision after activation returns the player there while lives remain.

![Gameplay recording showing the player reach Level 2 checkpoint 1 and its saved notification](docs/media/gifs/checkpoint-activation.gif)
<p align="center"><em>Reaching Checkpoint 1 activates it as a respawn point.</em></p>

In Level 1, reaching the exit completes the run and displays the win state.

![Gameplay recording showing the player’s route trail, final approach to the exit, and the You Win message](docs/media/gifs/level-completion.gif)
<p align="center"><em>The player reaches the exit and the game confirms the completed level.</em></p>

## Technology

| Area | Current implementation |
|---|---|
| Frontend | JavaScript, React 19, React Router 7, and Vite 7 |
| Game | Phaser 3.90 with Arcade Physics |
| Rendering | Phaser WebGL with Canvas fallback; SVG for the mathematical HUD and protractor |
| API | Node.js 20, Express 5, and Prisma 7 |
| Data | PostgreSQL 16 |
| Local orchestration | Docker Compose; Nginx serves the built frontend |

### Project layout

- <code>frontend/src/pages/</code> — team registration, level selection, game, and admin pages.
- <code>frontend/src/game/scenes/MazeScene.js</code> — maze setup, movement, turns, collisions, checkpoints, and exit handling.
- <code>frontend/src/game/visuals/</code> — SVG math overlay, protractor state, character views, and collision visualization.
- <code>frontend/public/assets/premium/</code> — active player, golem, environment, checkpoint, and exit art.
- <code>backend/src/routes/</code> — health, team registration, progress, leaderboard, and admin API routes.
- <code>backend/prisma/schema.prisma</code> — team, level, progress, and attempt data models.
- <code>docs/graphics-upgrade/</code> — visual design decisions and implementation validation.
- <code>docs/media/screenshots/</code> — selected screenshots used in this README.
- <code>docs/media/gifs/</code> — short gameplay and character-animation demonstrations used in this README.

## Run locally

### Prerequisites

- Docker with the Compose v2 plugin.
- Node.js 20.19 or newer in the 20.x line, or Node.js 22.12 or newer, and npm.

### Clone the repository

~~~sh
git clone https://github.com/juanbetancurm/maze_production_test.git
cd maze_production_test
~~~

### Start the database and initialize a fresh local database

1. Copy <code>.env.example</code> to <code>.env</code> and replace the placeholder database password and admin secret. Keep the database password consistent across <code>POSTGRES_PASSWORD</code> and <code>DATABASE_URL</code>. Do not commit <code>.env</code>.

   Windows PowerShell:

   ~~~powershell
   Copy-Item .env.example .env
   ~~~

   macOS or Linux:

   ~~~sh
   cp .env.example .env
   ~~~

2. Start PostgreSQL from the repository root:

   ~~~sh
   docker compose up -d db
   ~~~

3. In a terminal at the repository root, set <code>DATABASE_URL</code> for host-side Prisma commands. Use the same credentials as <code>.env</code>, with <code>localhost</code> as the database host.

   PowerShell:

   ~~~powershell
   $env:DATABASE_URL = "postgresql://anglemaze:YOUR_PASSWORD@localhost:5432/anglemaze"
   ~~~

   macOS or Linux:

   ~~~sh
   export DATABASE_URL="postgresql://anglemaze:YOUR_PASSWORD@localhost:5432/anglemaze"
   ~~~

4. In that same terminal, install the backend tools, create the Prisma client and tables, seed the two levels, and start the API:

   ~~~sh
   cd backend
   npm ci
   npx prisma generate
   npx prisma db push
   npm run seed
   npm run dev
   ~~~

5. In a second terminal, start the Vite frontend:

   ~~~sh
   cd frontend
   npm ci
   npm run dev
   ~~~

Open <http://localhost:5173>. The Vite development server uses the API at <http://localhost:3001/api>. Leave the backend and frontend terminals running while you play.

### Run the full Docker Compose stack

After the database has been initialized and seeded, stop the local API and Vite servers. Use a fresh terminal at the repository root, then set the root <code>.env</code> values for Compose:

- Set <code>DATABASE_URL</code> to use <code>db</code> as the database host, for example <code>postgresql://anglemaze:YOUR_PASSWORD@db:5432/anglemaze</code>.
- Set <code>VITE_API_BASE_URL</code> to <code>http://localhost:3001/api</code>. The checked-in Nginx configuration serves the frontend files and does not proxy <code>/api</code>; the browser therefore uses the backend’s published port directly.

Then, from the repository root:

~~~sh
docker compose up --build -d
docker compose ps
~~~

Open <http://localhost:8080>. To stop the containers without removing the database volume, run:

~~~sh
docker compose down
~~~

### Frontend checks

From the <code>frontend</code> directory:

~~~sh
npm run test
npm run lint
npm run build
~~~

<code>npm run build</code> runs the frontend tests, Vite production build, and asset-bundle check.

## Educational purpose

A maze gives a visible outcome to abstract quantities. Players can plan with the angle convention and movement formula above, issue one command, then inspect the new position and heading before deciding on the next move. This connects calculation with spatial planning without claiming a measured learning outcome.

AngleMaze is free for everyone to play and use as a game. It was created to make mathematical learning more accessible, engaging, and enjoyable through interactive play. Free access to the game does not itself grant rights to redistribute its source code or artwork.

## Dedication

*This game is dedicated to my student, Felipe Gomes Trujillo (Pipe), with deep affection.*

*We will always remember you.*

## Credits and license

**Project author:** Juan Betancur, as recorded in the Git history. The repository has no root-level <code>LICENSE</code> file, so no project-wide license is asserted here. Review the terms for individual assets and dependencies before redistributing them.
