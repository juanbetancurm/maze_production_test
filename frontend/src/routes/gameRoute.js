import { lazy } from 'react';

const loadGamePage = () => import('../pages/GamePage.jsx');

// Keep the game's renderer out of registration/menu downloads until a level is
// focused/hovered or the game route is opened.
export const GamePageRoute = lazy(loadGamePage);

export function preloadGamePage() {
  return loadGamePage();
}
