/**
 * IntroCinematic.jsx - Fullscreen cinematic introduction.
 *
 * WHAT: A black overlay that plays the AngleMaze presentation video, with a
 *   Skip button that appears a few seconds in.
 * WHY: New players get a game-style opening between registration and the
 *   level menu; it must never block access to the game.
 * HOW: Mounted once at the app root and rendered through a portal, so it is
 *   independent of routes, GameContext, and the Phaser game. Every exit path
 *   (skip, Escape, video end, playback error) goes through finish(), which
 *   runs once, releases the video, and fades back to the page underneath.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  closeIntro,
  getIntroSnapshot,
  markIntroSeen,
  notifyIntroCovered,
  subscribeIntro,
} from '../lib/introCinematic.js';

const VIDEO_SRC = '/assets/video/anglemaze-intro-v1-720p.mp4';
const POSTER_SRC = '/assets/video/anglemaze-intro-v1-poster.jpg';
const FADE_MS = 450;
const SKIP_DELAY_MS = 5000;
const STALL_TIMEOUT_MS = 12000;

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function IntroOverlay() {
  const overlayRef = useRef(null);
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const closingRef = useRef(false);
  const closeTimerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  // loading | playing | paused | blocked | error
  const [status, setStatus] = useState('loading');
  const [buffering, setBuffering] = useState(false);
  const [skipVisible, setSkipVisible] = useState(false);

  const finish = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    videoRef.current?.pause();
    setVisible(false);
    closeTimerRef.current = window.setTimeout(closeIntro, prefersReducedMotion() ? 0 : FADE_MS);
  }, []);

  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || closingRef.current) return;
    setStatus('loading');
    const attempt = video.play();
    attempt?.catch((error) => {
      if (closingRef.current) return;
      // AbortError: a pause() interrupted play(). NotAllowedError: the browser
      // wants a tap first. Anything else: the video cannot be played.
      if (error?.name === 'AbortError') return;
      const next = error?.name === 'NotAllowedError' ? 'blocked' : 'error';
      setStatus((current) => (current === 'error' ? current : next));
    });
  }, []);

  const togglePause = useCallback(() => {
    const video = videoRef.current;
    if (!video || closingRef.current) return;
    if (video.paused) startPlayback();
    else video.pause();
  }, [startPlayback]);

  // Open: hide the page behind the overlay, then start the video.
  useEffect(() => {
    const root = document.getElementById('root');
    const previousFocus = document.activeElement;
    const reducedMotion = prefersReducedMotion();
    const video = videoRef.current;
    closingRef.current = false;
    // Set here rather than in JSX so a re-run of this effect restores it.
    if (video) video.src = VIDEO_SRC;
    root?.setAttribute('inert', '');
    overlayRef.current?.focus();

    const frame = window.requestAnimationFrame(() => setVisible(true));
    const coveredTimer = window.setTimeout(() => {
      markIntroSeen();
      notifyIntroCovered();
      // Visitors who asked for reduced motion choose whether to play it.
      if (reducedMotion) setStatus('blocked');
      else startPlayback();
    }, reducedMotion ? 0 : FADE_MS);
    const skipTimer = window.setTimeout(() => setSkipVisible(true), SKIP_DELAY_MS);
    const stallTimer = window.setTimeout(() => {
      setStatus((current) => (current === 'loading' ? 'error' : current));
    }, STALL_TIMEOUT_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(coveredTimer);
      window.clearTimeout(skipTimer);
      window.clearTimeout(stallTimer);
      window.clearTimeout(closeTimerRef.current);
      root?.removeAttribute('inert');
      if (video) {
        // Release the decoder and stop any download still in progress.
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [startPlayback]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish();
      } else if ((event.key === ' ' || event.key === 'k') && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finish, togglePause]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !progressRef.current || !video.duration) return;
    progressRef.current.style.transform = `scaleX(${Math.min(1, video.currentTime / video.duration)})`;
  };

  const handlePause = () => {
    const video = videoRef.current;
    if (closingRef.current || !video || video.ended) return;
    setStatus((current) => (current === 'playing' ? 'paused' : current));
  };

  const showVideo = status !== 'blocked' && status !== 'error';
  const actionsVisible = skipVisible || status === 'blocked' || status === 'error';

  return createPortal(
    <div
      ref={overlayRef}
      className={`maze-intro${visible ? ' is-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="AngleMaze introduction video"
      aria-describedby="maze-intro-description"
      tabIndex={-1}
      data-intro-status={status}
    >
      <p id="maze-intro-description" className="maze-intro-sr">
        A silent three-minute video that introduces Pipe, the maze, the Stone Golems, and how to move with
        distances and angles. Press Escape to skip it at any time.
      </p>

      <video
        ref={videoRef}
        className={`maze-intro-video${showVideo ? '' : ' is-hidden'}`}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        onClick={togglePause}
        onPlaying={() => { setBuffering(false); setStatus('playing'); }}
        onWaiting={() => setBuffering(true)}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onEnded={finish}
        onError={() => { if (!closingRef.current) setStatus('error'); }}
      />

      {status === 'blocked' && (
        <div className="maze-intro-panel">
          <img className="maze-intro-poster" src={POSTER_SRC} alt="" />
          <button type="button" className="maze-intro-btn maze-intro-btn-primary" onClick={startPlayback}>
            ▶ Play intro
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="maze-intro-panel" role="alert">
          <p className="maze-intro-message">The intro couldn&apos;t be loaded.</p>
          <button type="button" className="maze-intro-btn maze-intro-btn-primary" onClick={finish}>
            Continue to the game
          </button>
        </div>
      )}

      {(status === 'loading' || (buffering && status === 'playing')) && (
        <span className="maze-intro-spinner" role="status" aria-label="Loading video" />
      )}

      {status === 'paused' && (
        <button type="button" className="maze-intro-btn maze-intro-resume" onClick={togglePause}>
          ▶ Resume
        </button>
      )}

      {showVideo && <p className="maze-intro-rotate" aria-hidden="true">Rotate your phone for a bigger picture</p>}

      {status !== 'error' && (
        <button
          type="button"
          className={`maze-intro-btn maze-intro-skip${actionsVisible ? ' is-visible' : ''}`}
          onClick={finish}
          disabled={!actionsVisible}
          data-intro-skip="true"
        >
          Skip intro ⏭
        </button>
      )}

      <div className="maze-intro-progress" aria-hidden="true">
        <div ref={progressRef} className="maze-intro-progress-fill" />
      </div>
    </div>,
    document.body,
  );
}

export default function IntroCinematic() {
  const { isOpen } = useSyncExternalStore(subscribeIntro, getIntroSnapshot);
  return isOpen ? <IntroOverlay /> : null;
}
