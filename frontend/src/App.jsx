/**
 * App.jsx - Route definitions and route guards for AngleMaze.
 *
 * WHAT: Maps URLs to pages and protects routes that require a saved team.
 * WHY: Menu and game pages should not open without a valid active team.
 * HOW: A small wrapper checks hydration state and redirects to registration
 *   when protected routes are accessed without a team.
 */
import { Component, createRef, Suspense } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useGame } from './context/useGame.js';
import GameLoadingScreen from './components/GameLoadingScreen.jsx';
import IntroCinematic from './components/IntroCinematic.jsx';
import { GamePageRoute } from './routes/gameRoute.js';
import Registration from './pages/Registration';
import LevelMenu from './pages/LevelMenu';
import AdminPage from './pages/AdminPage';

class GameRouteErrorBoundary extends Component {
  state = { failed: false };
  retryButtonRef = createRef();

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Game route failed to load:', error);
  }

  componentDidUpdate(previousProps, previousState) {
    if (!previousState.failed && this.state.failed) {
      this.retryButtonRef.current?.focus();
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="maze-experience maze-load-error" role="alert" data-game-load-error="true">
        <h1 className="maze-page-title">We couldn&apos;t load the maze</h1>
        <p>The game did not finish loading. Check your connection and try again.</p>
        <div className="maze-load-error-actions">
          <button
            type="button"
            className="maze-action-btn maze-action-btn-success"
            data-game-load-retry="true"
            ref={this.retryButtonRef}
            onClick={() => window.location.reload()}
          >
            Retry loading
          </button>
          <Link to="/menu" className="maze-pill-btn maze-load-error-menu">Back to levels</Link>
        </div>
      </main>
    );
  }
}

function RequireTeam({ children }) {
  const { team, isHydrating } = useGame();

  if (isHydrating) {
    return <GameLoadingScreen label="Restoring your team…" />;
  }

  if (!team) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <>
    <IntroCinematic />
    <Routes>
      <Route path="/" element={<Registration />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route
        path="/menu"
        element={(
          <RequireTeam>
            <LevelMenu />
          </RequireTeam>
        )}
      />
      <Route
        path="/game/:levelNum"
        element={(
          <RequireTeam>
            <GameRouteErrorBoundary>
              <Suspense fallback={<GameLoadingScreen label="Loading game…" />}>
                <GamePageRoute />
              </Suspense>
            </GameRouteErrorBoundary>
          </RequireTeam>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
