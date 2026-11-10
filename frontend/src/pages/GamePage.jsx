/**
 * Root React component for AngleMaze.
 *
 * TURTLE GRAPHICS MODEL (same as Python's turtle library):
 *   Turning and moving are ALWAYS separate actions — each is its own button:
 *
 *     ▲ Forward     — walk `distance` pixels in the current facing direction.
 *     ↰ Turn Left   — rotate CCW (counterclockwise) by `degrees`, no movement.
 *     Turn Right ↱  — rotate CW  (clockwise)        by `degrees`, no movement.
 *     🔄 Start Over  — voluntarily restart the maze at any time.
 *
 * CRASH / RESTART FLOW:
 *   1. Player touches a wall → MazeScene._onWallHit() fires.
 *   2. MazeScene calls game._onCrash() → React sets disabled=true (buttons locked).
 *   3. Phaser shows "Oops!" on canvas and waits 2 seconds.
 *   4. scene.restart() is called → Phaser rebuilds the scene from scratch.
 *   5. MazeScene.create() calls game._onReset(true) → React resets all state,
 *      shows encourage message for 3 seconds, re-enables buttons.
 *
 * React ↔ Phaser bridge:
 *   The Phaser game lives in a ref (gameRef). React never owns the canvas.
 *   Scene → React: callbacks stored on gameRef.current (_onCrash, _onReset).
 *   React → Scene: direct method calls via getScene().
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import config from '../game/config.js';
import { normalizeProgressResponse } from '../context/progress.js';
import { useGame } from '../context/useGame.js';
import { completeLevel as saveCompletedLevel } from '../lib/api';

function formatElapsedTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getViewportWidth() {
  if (typeof window === 'undefined') {
    return 1280;
  }

  // clientWidth excludes a classic vertical scrollbar; match the actual layout
  // width so the scaled canvas never spills outside its shell by scrollbar width.
  if (typeof document !== 'undefined' && document.documentElement?.clientWidth > 0) {
    return document.documentElement.clientWidth;
  }

  return window.innerWidth;
}

function getViewportHeight() {
  if (typeof window === 'undefined') {
    return 800;
  }

  return window.innerHeight;
}

function getResponsiveGameScale(width, height) {
  const phone = width <= 640;
  const compact = width <= 1151;
  const shortLandscape = compact && width > height && height <= 500;
  let maxCanvasWidth;
  let maxCanvasHeight;

  if (phone) {
    maxCanvasWidth = Math.max(240, Math.min(width - 32, 420));
    maxCanvasHeight = shortLandscape
      ? Math.max(240, height - 80)
      : Math.max(240, height - 360);
  } else if (compact) {
    // Tablets use a full-width board, with the control console below it.
    maxCanvasWidth = Math.max(360, Math.min(width - 32, 920));
    maxCanvasHeight = shortLandscape
      ? Math.max(240, height - 80)
      : Math.min(900, Math.max(360, height - 24));
  } else {
    // Reserve a compact right rail, then let the board use the remaining width.
    // The Phaser world stays 800x600; only its display wrapper is scaled.
    const controlsWidth = Math.max(224, Math.min(280, width * 0.2));
    const pageContentWidth = Math.max(400, Math.min(width, 1800) - 32);
    maxCanvasWidth = Math.min(1200, pageContentWidth - controlsWidth - 16);
    // Desktop prioritizes the available row width. On short windows, the whole
    // 4:3 board remains in its shell and the document scrolls vertically instead
    // of shrinking the maze and leaving unused horizontal space.
    maxCanvasHeight = 900;
  }

  return Math.min(1.5, maxCanvasWidth / 800, maxCanvasHeight / 600);
}

const MOBILE_INCREMENT_OPTIONS = [10, 30, 45, 100];

export default function GamePage() {

  // WHAT: Read which level to play from the URL.
  //   /game/1 → levelNum = 1, /game/2 → levelNum = 2.
  // WHY: The level menu navigates here with the level number in the URL.
  //   This means each level has its own URL — bookmarkable and shareable.
  const { levelNum } = useParams();
  const navigate = useNavigate();
  const { team, levelProgress, isHydrating, completeLevel } = useGame();
  const levelNumber = parseInt(levelNum, 10) || 1;
  const currentProgress = levelProgress[levelNumber];
  const canPlayLevel = Boolean(currentProgress?.unlocked && !currentProgress?.completed);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const gameRef    = useRef(null);
  const distRef    = useRef(null);
  const degreesRef = useRef(null);
  const teamRef = useRef(team);
  const moveCountRef = useRef(0);
  const livesRef = useRef(5);
  const levelStartTimeRef = useRef(null);
  const elapsedSecondsRef = useRef(0);

  // ── State ─────────────────────────────────────────────────────────────────────

  // WHAT: Initial position and facing angle for the React status display.
  // WHY: These must match the DEFAULT level's LEVEL_CONFIG values.
  //   Default level is 2 → start at (740, 60) facing 180° (left).
  //   If you change the default level back to 1, change these to
  //   { x: 60, y: 60 } and 0.
  // HOW: After Phaser's create() runs, _onReset syncs these to the actual
  //   values. But for the brief moment before that, React uses these.
  const [position,     setPosition]     = useState({ x: 740, y: 60 });
  const [facingAngle,  setFacingAngle]  = useState(180);
  const [moveCount,    setMoveCount]    = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const [viewportHeight, setViewportHeight] = useState(getViewportHeight);
  const [mobileQuantity, setMobileQuantity] = useState(0);
  const [protractorEnabled, setProtractorEnabled] = useState(false);
  const [gameReady, setGameReady] = useState(false);

   /**
   * WHAT: Remaining lives before checkpoint is lost.
   * WHY: Displayed in the sidebar as hearts or a number.
   * HOW: Updated by the _onLivesChanged callback from Phaser.
   */
  const [lives, setLives] = useState(5);

  /**
   * WHAT: Brief message when a checkpoint is saved or lost.
   * WHY: Feedback so the kid knows something happened.
   * HOW: Set by _onLivesChanged, auto-cleared after 2 seconds.
   */
  const [checkpointMsg, setCheckpointMsg] = useState('');

  /**
   * disabled — true while buttons should be non-interactive:
   *   • During a goForward animation (player is mid-move).
   *   • During the 2-second crash delay after hitting a wall.
   *   • During a voluntary restart (brief moment before scene.restart fires).
   *
   * WHY a single `disabled` flag for all these cases?
   *   All three cases share the same desired behaviour: "ignore button clicks."
   *   Using one flag keeps the JSX simple — one `disabled={disabled}` prop
   *   on each button rather than a complex boolean expression.
   */
  const [disabled, setDisabled] = useState(false);

  /**
   * encourageMsg — shown briefly after a restart to cheer the kid on.
   *   Set in the _onReset callback when wasRestart=true.
   *   Cleared automatically after 3 seconds via setTimeout.
   *   Empty string '' = no message shown.
   */
  const [encourageMsg, setEncourageMsg] = useState('');

  useEffect(() => {
    teamRef.current = team;
  }, [team]);

  useEffect(() => {
    moveCountRef.current = moveCount;
  }, [moveCount]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    if (isHydrating) return;
    if (!team) {
      navigate('/', { replace: true });
      return;
    }
    if (!canPlayLevel) {
      navigate('/menu', { replace: true });
    }
  }, [canPlayLevel, isHydrating, navigate, team]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!levelStartTimeRef.current) return;
      const nextElapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - levelStartTimeRef.current) / 1000)
      );
      setElapsedSeconds(nextElapsedSeconds);
    }, 250);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    function handleResize() {
      const width = getViewportWidth();
      const height = getViewportHeight();
      setViewportWidth(width);
      setViewportHeight(height);
      const scale = getResponsiveGameScale(width, height);
      if (gameRef.current) {
        gameRef.current._gameScale = scale;
        gameRef.current.scene.getScene('MazeScene')?.setProtractorScale?.(scale);
      }
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Phaser lifecycle ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (gameRef.current !== null) return; // React 18 StrictMode double-mount guard

    // Make the selected level available to Phaser preload before its first
    // scene starts so level-specific art can be loaded on demand.
    window.__anglemazeInitialLevel = levelNumber;
    gameRef.current = new Phaser.Game(config);
    gameRef.current._protractorVisible = false;
    gameRef.current._gameScale = getResponsiveGameScale(getViewportWidth(), getViewportHeight());

    // WHAT: Tell Phaser which level to load BEFORE the game starts.
    // WHY: The game reads _currentLevel in create(). If we set it
    //   after the game starts, create() would use the old default.
    // HOW: MazeScene.create() copies this global to this.game._currentLevel.

    // ── Scene → React callbacks ───────────────────────────────────────────────
    //
    // We store callbacks directly on the Phaser.Game object because it survives
    // across scene restarts. Storing them on the scene instance would not work
    // — the old scene instance is destroyed on restart, losing the callbacks.
    //
    // WHY store them here (in useEffect) rather than at module scope?
    //   The React state setters (setPosition, setFacingAngle, etc.) are only
    //   available inside the component. useEffect runs after first render, when
    //   `gameRef.current` has been assigned and the setters are in scope.
    //
    // WHY is it safe to call React setters from Phaser callbacks?
    //   React 18 "automatic batching" handles state updates from any context —
    //   including non-React code like Phaser timer callbacks — batching them
    //   into a single re-render automatically.

    /**
     * _onCrash — called by MazeScene when the player touches a wall OR when
     *   a voluntary restart begins via restartGame(). Its only job is to
     *   disable the React buttons immediately so the kid can't spam them
     *   during the reset countdown.
     */
    gameRef.current._onCrash = () => {
      setDisabled(true);
    };

    gameRef.current._onProtractorVisibilityChange = (visible) => {
      setProtractorEnabled(Boolean(visible));
    };

    // Keep the canvas covered until Phaser has rendered its first complete frame.
    // React.lazy only signals that the GamePage module loaded, which can precede
    // Phaser's asset loading and scene creation by a noticeable interval.
    gameRef.current._onSceneReady = () => setGameReady(true);

    /**
     * _onReset(wasRestart) — called at the start of MazeScene.create()
     *   whenever the scene has been restarted (not on first load).
     *
     *   @param {boolean} wasRestart  true if this create() is a restart.
     *
     * Resets all React state to match the fresh Phaser scene:
     *   - Position back to start (60, 60).
     *   - Facing angle back to 0° (right).
     *   - Move counter back to 0.
     *   - Buttons re-enabled.
     *   - Encourage message shown for 3 seconds then cleared.
     */
    /**
     * _onReset(wasRestart, cfg)
     *
     * WHAT: Called by MazeScene.create() to sync React state with Phaser.
     *
     * @param {boolean} wasRestart  true if this is a restart, false on first load.
     * @param {Object}  cfg         The LEVEL_CONFIG entry for the current level:
     *   { startX, startY, exitX, exitY, facingAngle }
     *
     * WHY the `cfg` parameter?
     *   Before: we always reset to (60, 60) and 0° — correct for Level 1,
     *   but WRONG for Level 2 (start at 740, 60, facing 180°).
     *   Now: Phaser passes the level config, so React uses the right values.
     *
     * HOW the destructuring works:
     *   const { startX = 60, startY = 60, facingAngle: startAngle = 0 } = cfg || {};
     *
     *   This says:
     *   - Pull startX from cfg. If missing, use 60.
     *   - Pull startY from cfg. If missing, use 60.
     *   - Pull facingAngle from cfg, rename it to startAngle. If missing, use 0.
     *   - If cfg itself is undefined/null, use {} (empty object) so all defaults kick in.
     *
     *   The rename `facingAngle: startAngle` avoids shadowing the React state
     *   variable also called `facingAngle`.
     */
    gameRef.current._onReset = (wasRestart, cfg) => {
      const { startX = 60, startY = 60, facingAngle: startAngle = 0 } = cfg || {};

      levelStartTimeRef.current = Date.now();
      setDisabled(false);
      setPosition({ x: startX, y: startY });
      setFacingAngle(startAngle);
      setMoveCount(0);
      setElapsedSeconds(0);
      setLives(gameRef.current?._lives ?? 5);
      setCheckpointMsg('');

      if (wasRestart) {
        setEncourageMsg('Try again! You got this!');
        setTimeout(() => setEncourageMsg(''), 3000);
      }
    };

    /**
     * _onLivesChanged(newLives, checkpointLabel)
     *
     * WHAT: Called by MazeScene whenever lives change or a checkpoint is activated.
     *
     * @param {number} newLives  The new lives count (1-5).
     * @param {string|null} checkpointLabel  If a checkpoint was just activated,
     *   its label string. If lives decreased (crash), null.
     */
    gameRef.current._onLivesChanged = (newLives, checkpointLabel) => {
      setLives(newLives);
      if (checkpointLabel) {
        setCheckpointMsg(`✓ ${checkpointLabel}`);
        setTimeout(() => setCheckpointMsg(''), 2000);
      }
    };

    /**
     * _onRespawn(x, y)
     *
     * WHAT: Called after a soft respawn (teleport to checkpoint).
     *   Updates React's position display and re-enables buttons.
     *
     * @param {number} x  New player X position.
     * @param {number} y  New player Y position.
     */
    gameRef.current._onRespawn = (x, y) => {
      setPosition({ x: Math.round(x), y: Math.round(y) });
      setDisabled(false);
    };

    /**
     * _onLevelWin(levelNum)
     *
     * WHAT: Called by MazeScene when the player reaches the exit zone.
     * WHY: Updates the context (marks level as completed, unlocks next)
     *   and navigates back to the level menu after a delay.
     * FUTURE: This is where we'll save progress to the database.
     *
     * BUG FIX: This was previously placed AFTER the useEffect's `return`
     *   statement, making it unreachable. JavaScript's `return` exits the
     *   function immediately — any code after it never executes.
     *   Moving it BEFORE the `return` fixes the issue.
     */
    gameRef.current._onLevelWin = async (levelNum) => {
      try {
        if (teamRef.current?.id) {
          const result = await saveCompletedLevel({
            teamId: teamRef.current.id,
            level: levelNum,
            moves: moveCountRef.current,
            livesRemaining: livesRef.current,
            elapsedSeconds: elapsedSecondsRef.current,
          });

          completeLevel(normalizeProgressResponse(result.progress));
        } else {
          completeLevel(levelNum);
        }
      } catch (error) {
        console.error('Error saving completed level:', error);
        completeLevel(levelNum);
      }

      // Navigate back to the level menu after a short celebration delay.
      // The delay gives the "You Win!" message time to display.
      setTimeout(() => {
        // Destroy the Phaser game before navigating away.
        gameRef.current?.destroy(true);
        gameRef.current = null;
        navigate('/menu');
      }, 3000);
    };

    // ── useEffect cleanup — MUST be the LAST thing in the useEffect ─────
    //
    // WHAT: The function returned from useEffect is the "cleanup" function.
    //   React calls it when the component unmounts (navigates away).
    // WHY: Destroys the Phaser game to free memory and prevent canvas leaks.
    // RULE: Nothing can come after `return` — JavaScript stops executing here.
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [completeLevel, levelNumber, navigate]);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const getScene = () => gameRef.current?.scene.getScene('MazeScene') ?? null;

  const toggleProtractor = () => {
    const enabled = !protractorEnabled;
    setProtractorEnabled(enabled);
    if (gameRef.current) gameRef.current._protractorVisible = enabled;
    getScene()?.setProtractorVisible?.(enabled);
  };

  /**
   * facingLabel(angle) — maps well-known angles to friendly direction words.
   * e.g. 90 → " — up", 270 → " — down". Returns '' for non-standard angles.
   */
  const facingLabel = (angle) => {
    const map = {
      0:   'right',
      45:  'upper-right',
      90:  'up',
      135: 'upper-left',
      180: 'left',
      225: 'lower-left',
      270: 'down',
      315: 'lower-right',
    };
    return map[angle] ? ` — ${map[angle]}` : '';
  };

  // ── Action handlers ───────────────────────────────────────────────────────────

  /**
   * handleForward()
   *
   * Calls goForward() on the scene. The scene returns `true` if the call was
   * accepted (not blocked by hasWon / isMoving / isResetting), `false` if ignored.
   *
   * WHY check the return value?
   *   We disable buttons and increment the move counter ONLY if the scene
   *   actually started a move. If goForward returns false (e.g. called mid-
   *   restart), we avoid setting disabled=true with no matching re-enable path.
   */
  const performMotion = (action, quantity) => {
    const scene = getScene();
    if (!scene || quantity <= 0) return false;

    if (action === 'forward') {
      const accepted = scene.goForward(quantity, (x, y) => {
        setPosition({ x: Math.round(x), y: Math.round(y) });
        setDisabled(false);
      });

      if (!accepted) {
        return false;
      }

      setDisabled(true);
      setMoveCount((current) => current + 1);
      return true;
    }

    const newAngle =
      action === 'left' ? scene.turnLeft(quantity) : scene.turnRight(quantity);

    if (newAngle === undefined) {
      return false;
    }

    setFacingAngle(newAngle);
    setMoveCount((current) => current + 1);
    return true;
  };

  const handleForward = () => {
    const distance = isPhoneLayout
      ? mobileQuantity
      : parseFloat(distRef.current.value) || 0;
    const accepted = performMotion('forward', distance);

    if (!accepted) {
      return;
    }

    if (isPhoneLayout) {
      setMobileQuantity(0);
      return;
    }

    if (distRef.current) {
      distRef.current.value = '';
    }
  };

  /**
   * handleTurnLeft() / handleTurnRight()
   *
   * Turns are INSTANT — no animation. The scene updates facingAngle and
   * redraws the arrow in the same synchronous call, then returns the new angle.
   * We don't need to set `disabled` because there is no wait time.
   *
   * If the return value is `undefined`, the scene rejected the call
   * (hasWon / isMoving / isResetting) — we skip the React state update.
   */
  const handleTurnLeft = () => {
    const degrees  = isPhoneLayout
      ? mobileQuantity
      : parseFloat(degreesRef.current.value) || 0;
    const accepted = performMotion('left', degrees);
    if (!accepted) {
      return;
    }

    if (isPhoneLayout) {
      setMobileQuantity(0);
      return;
    }

    if (degreesRef.current) {
      degreesRef.current.value = '';
    }
  };

  const handleTurnRight = () => {
    const degrees  = isPhoneLayout
      ? mobileQuantity
      : parseFloat(degreesRef.current.value) || 0;
    const accepted = performMotion('right', degrees);
    if (!accepted) {
      return;
    }

    if (isPhoneLayout) {
      setMobileQuantity(0);
      return;
    }

    if (degreesRef.current) {
      degreesRef.current.value = '';
    }
  };

  const handleMobileQuantityChange = (event) => {
    const { value } = event.target;

    if (value === '') {
      setMobileQuantity(0);
      return;
    }

    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue) && parsedValue >= 0) {
      setMobileQuantity(parsedValue);
    }
  };

  /**
   * handleStartOver()
   *
   * Voluntary restart — calls MazeScene.restartGame() which stops motion,
   * notifies React (_onCrash → setDisabled(true)), and calls scene.restart()
   * immediately (no 2-second delay). The new scene's create() then calls
   * _onReset(true) which re-enables buttons and resets all state.
   */
  const handleStartOver = () => {
    getScene()?.restartGame();
  };

  if (isHydrating || !team || !canPlayLevel) {
    return (
      <div
        className="maze-experience maze-loading-screen"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
        }}
      >
        Loading level...
      </div>
    );
  }

  const isCompactLayout = viewportWidth <= 1151;
  const isPhoneLayout = viewportWidth <= 640;
  const gameScale = getResponsiveGameScale(viewportWidth, viewportHeight);
  const gameViewportWidth = Math.round(800 * gameScale);
  const gameViewportHeight = Math.round(600 * gameScale);









  // ── Render ────────────────────────────────────────────────────────────────────
  //
  // LAYOUT STRUCTURE:
  //
  //   <root column>          ← vertical: title on top, content below
  //     <title />
  //     <level buttons />
  //     <content row>        ← horizontal: maze left, controls right
  //       <game-container /> ← left: the Phaser canvas
  //       <sidebar column>   ← right: controls + status stacked vertically
  //         <forward card />
  //         <turn card />
  //         <start over />
  //         <encourage msg />
  //         <status />
  //       </sidebar>
  //     </content>
  //   </root>
  //
  // WHY this structure?
  //   The title and level buttons span the full width (they're outside the row).
  //   The maze and controls sit side-by-side inside the row.
  //   The controls panel uses flexDirection: 'column' to stack its children
  //   vertically, and justifyContent: 'center' to vertically center them
  //   against the maze canvas height.

  return (
    <div className="maze-experience maze-game-page" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isCompactLayout ? '16px' : '0 16px',
      width: '100%',
      maxWidth: isCompactLayout ? '100%' : '1800px',
      margin: '0 auto',
    }}>

      {/* ── Header (spans full width) ──────────────────────────────────────── */}
      <header className="maze-game-header">
        <div>
          <h1 className="maze-page-title"><span>Angle</span>Maze</h1>
          <p className="maze-brand-tagline">Move with Math!</p>
        </div>
        <p className="maze-current-level">Level <strong>{levelNumber}</strong></p>
      </header>

      
      {/* ── Side-by-side row: maze (left) + controls (right) ──────────────── */}
      {/*
        WHAT: A horizontal flex container that puts the Phaser canvas on the
          left and the control panel on the right.
        WHY: So the kid can see the maze AND the controls at the same time,
          without scrolling.
        HOW: display: 'flex' with flexDirection: 'row' (the default).
          gap: '24px' adds spacing between the canvas and controls.
          alignItems: 'flex-start' aligns both to the top edge.
      */}
      <div className="maze-game-layout" style={{
        flexDirection: isCompactLayout ? 'column' : 'row',
        gap: isCompactLayout ? '18px' : '16px',
        maxWidth: isCompactLayout ? `${gameViewportWidth}px` : '100%',
      }}>

        {/* ── Left side: Phaser game canvas ────────────────────────────────── */}
        {/*
          WHAT: The div Phaser injects its <canvas> into.
          WHY: It must be a separate element so Phaser can control it.
          HOW: Phaser's config.js has `parent: 'game-container'`, which tells
            Phaser to find this div by id and append the canvas inside it.
            The canvas is 800×600 px (set in config.js width/height).
            flexShrink: 0 prevents the canvas from being squished if the
            browser window is narrower than the total row width.
        */}
        <div
          className="maze-canvas-shell"
          style={{
            width: `${gameViewportWidth}px`,
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '800px',
              height: '600px',
              transform: `scale(${gameScale})`,
              transformOrigin: 'top center',
              marginBottom: `${-(600 - gameViewportHeight)}px`,
            }}
          >
            <div id="game-container" style={{ flexShrink: 0 }} />
            <div
              data-game-ready={gameReady ? 'true' : 'false'}
              className="maze-scene-loading"
              role={gameReady ? undefined : 'status'}
              aria-live="polite"
              aria-hidden={gameReady ? 'true' : undefined}
              style={{ display: gameReady ? 'none' : 'flex' }}
            >
              Preparing maze...
            </div>
          </div>
        </div>

        {/* ── Right side: control panel ────────────────────────────────────── */}
        {/*
          WHAT: All the turtle controls, the restart button, encourage message,
            and status readout — stacked vertically in a sidebar.
          WHY: Keeps controls visible at all times alongside the maze.
          HOW: flexDirection: 'column' stacks children vertically.
            justifyContent: 'center' vertically centers the controls
            against the height of the maze canvas (600px).
            minWidth prevents the controls from collapsing too narrow.
        */}
        <div className="maze-game-controls" style={{
          minWidth: isCompactLayout ? '100%' : '0',
          width: isCompactLayout ? '100%' : 'auto',
        }}>

          {/* ── Forward card (green) ───────────────────────────────────────── */}
          {isPhoneLayout && (
            <div className="maze-mobile-console">
              <label className="maze-mobile-display">
                <span className="maze-mobile-display-label">Quantity</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={mobileQuantity === 0 ? '' : mobileQuantity}
                  onChange={handleMobileQuantityChange}
                  disabled={disabled}
                  placeholder="0"
                  className="maze-mobile-display-input"
                />
                <span className="maze-mobile-display-hint">Pixels forward · Degrees to turn</span>
              </label>

              <div className="maze-mobile-action-row">
                <button
                  onClick={handleTurnLeft}
                  disabled={disabled || mobileQuantity <= 0}
                  className="maze-mobile-action-btn maze-mobile-action-btn-left"
                >
                  <span className="maze-mobile-action-symbol">↺</span>
                  <span className="maze-mobile-action-label">Turn Left</span>
                </button>
                <button
                  onClick={handleForward}
                  disabled={disabled || mobileQuantity <= 0}
                  className="maze-mobile-action-btn maze-mobile-action-btn-forward"
                >
                  <span className="maze-mobile-action-symbol">↑</span>
                  <span className="maze-mobile-action-label">Forward</span>
                </button>
                <button
                  onClick={handleTurnRight}
                  disabled={disabled || mobileQuantity <= 0}
                  className="maze-mobile-action-btn maze-mobile-action-btn-right"
                >
                  <span className="maze-mobile-action-symbol">↻</span>
                  <span className="maze-mobile-action-label">Turn Right</span>
                </button>
              </div>

              <div className="maze-mobile-chip-row">
                {MOBILE_INCREMENT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="maze-mobile-chip"
                    onClick={() => setMobileQuantity((current) => current + option)}
                    disabled={disabled}
                  >
                    +{option}
                  </button>
                ))}
                <button
                  type="button"
                  className="maze-mobile-chip maze-mobile-chip-clear"
                  onClick={() => setMobileQuantity(0)}
                  disabled={disabled || mobileQuantity === 0}
                >
                  Clear
                </button>
              </div>
              <button
                type="button"
                className="maze-protractor-toggle"
                aria-pressed={protractorEnabled}
                onClick={toggleProtractor}
              >
                {protractorEnabled ? 'Hide Protractor' : 'Protractor'}
              </button>
            </div>
          )}

          <div className="maze-card maze-game-card maze-game-card-accent" style={{
            display: isPhoneLayout ? 'none' : 'flex',
          }}>
            <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                width: '100%',
              }}>
                <span className="maze-game-label">Distance</span>
                <input
                  ref={distRef}
                  type="number"
                  defaultValue={50}
                  min={1}
                  step={10}
                  placeholder="px"
                  className="maze-input"
                  style={{ width: '72px' }}
                />
                <span className="maze-game-unit">px</span>
              </label>

            <button
              onClick={handleForward}
              disabled={disabled}
              className="maze-btn-forward"
            >
              ▲ Forward
            </button>
          </div>

          {/* ── Turn card (amber) ──────────────────────────────────────────── */}
          <div className="maze-card maze-game-card" style={{
            display: isPhoneLayout ? 'none' : 'flex',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              width: '100%',
            }}>
              <span className="maze-game-label">Degrees</span>
              <input
                ref={degreesRef}
                type="number"
                defaultValue={90}
                min={0}
                step={5}
                placeholder="°"
                className="maze-input"
                style={{ width: '72px' }}
              />
              <span>°</span>
            </label>

            <div style={{ display: 'none' }}>
                <button
                  onClick={handleTurnLeft}
                  disabled={disabled}
                  className="maze-turn-icon-btn maze-turn-icon-btn-left"
                >
                  <span className="maze-turn-icon-symbol">↺</span>
                  <span className="maze-turn-icon-label">Turn Left</span>
                </button>
                <button
                  onClick={handleTurnRight}
                  disabled={disabled}
                  className="maze-turn-icon-btn maze-turn-icon-btn-right"
                >
                  <span className="maze-turn-icon-symbol">↻</span>
                  <span className="maze-turn-icon-label">Turn Right</span>
                </button>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                width: '100%',
                flexDirection: 'row',
              }}
            >
              <button
                onClick={handleTurnLeft}
                disabled={disabled}
                className="maze-btn-turn"
              >
                ↰ Turn Left
              </button>
              <button
                onClick={handleTurnRight}
                disabled={disabled}
                className="maze-btn-turn"
              >
                Turn Right ↱
              </button>
            </div>
          </div>

          {/* ── Start Over button ──────────────────────────────────────────── */}
          <button
            onClick={handleStartOver}
            className="maze-btn-reset"
          >
            ↻ Start Over
          </button>

          {!isPhoneLayout && (
            <button
              type="button"
              className="maze-protractor-toggle"
              aria-pressed={protractorEnabled}
              onClick={toggleProtractor}
            >
              {protractorEnabled ? 'Hide Protractor' : 'Protractor'}
            </button>
          )}

          <button
            onClick={() => {
              gameRef.current?.destroy(true);
              gameRef.current = null;
              navigate('/menu');
            }}
            className="maze-inline-btn"
            style={{ width: isCompactLayout ? '100%' : 'auto' }}
          >
            ← Back to Menu
          </button>

          <a
            href="https://www.labolavs.com/category/games"
            className="maze-inline-btn"
            style={{ width: isCompactLayout ? '100%' : 'auto' }}
          >
            Back to Games
          </a>

          {/* ── Encourage message ──────────────────────────────────────────── */}
          {encourageMsg && (
            <div className="maze-game-encourage">
              {encourageMsg}
            </div>
          )}

          {/* ── Status readout ─────────────────────────────────────────────── */}
          <div className="maze-card maze-game-status" style={{
            padding: isPhoneLayout ? '16px 18px' : isCompactLayout ? '14px 16px' : '12px',
          }}>
            <div className="maze-game-status-row"><span>Position</span><strong>({position.x}, {position.y})</strong></div>
            <div className="maze-game-status-row"><span>Facing</span><strong>{facingAngle}°{facingLabel(facingAngle)}</strong></div>
            <div className="maze-game-status-row"><span>Moves</span><strong>{moveCount}</strong></div>
            <div className="maze-game-status-row"><span>Time</span><strong>{formatElapsedTime(elapsedSeconds)}</strong></div>

            {/* ── Lives display ─────────────────────────────────────────────── */}
            {/*
              WHAT: Shows remaining lives as filled (♥) and empty (♡) hearts.
              WHY: Hearts are universally understood by kids — more intuitive
                than "Lives: 3/5". The red color draws attention when lives
                are low.
              HOW: String.repeat() creates the right number of each character.
                Color shifts from green (5 lives) to yellow (3) to red (1).
            */}
            <div className="maze-game-lives" role="img" aria-label={`${lives} of 5 lives remaining`}>
              <span className="maze-game-lives-active" aria-hidden="true">{'♥'.repeat(lives)}</span>
              <span className="maze-game-lives-lost" aria-hidden="true">{'♡'.repeat(5 - lives)}</span>
            </div>

            {/* ── Checkpoint message ─────────────────────────────────────── */}
            {checkpointMsg && (
              <div className="maze-game-checkpoint">
                {checkpointMsg}
              </div>
            )}
          </div>

        </div>
        {/* ── End of control panel ─────────────────────────────────────────── */}

      </div>
      {/* ── End of side-by-side row ──────────────────────────────────────────── */}

    </div>
  );
}
