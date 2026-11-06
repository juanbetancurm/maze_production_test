/**
 * App.jsx - Route definitions and route guards for AngleMaze.
 *
 * WHAT: Maps URLs to pages and protects routes that require a saved team.
 * WHY: Menu and game pages should not open without a valid active team.
 * HOW: A small wrapper checks hydration state and redirects to registration
 *   when protected routes are accessed without a team.
 */
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useGame } from './context/useGame.js';
import Registration from './pages/Registration';
import LevelMenu from './pages/LevelMenu';
import AdminPage from './pages/AdminPage';

// Keep Phaser and its scene graph out of the registration/menu download.
const GamePage = lazy(() => import('./pages/GamePage'));

function GamePageLoading() {
  return (
    <main
      className="maze-experience maze-loading-screen"
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      Loading game...
    </main>
  );
}

function RequireTeam({ children }) {
  const { team, isHydrating } = useGame();

  if (isHydrating) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          fontFamily: 'monospace',
          color: '#99aabb',
        }}
      >
        Restoring saved team...
      </div>
    );
  }

  if (!team) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
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
            <Suspense fallback={<GamePageLoading />}>
              <GamePage />
            </Suspense>
          </RequireTeam>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
