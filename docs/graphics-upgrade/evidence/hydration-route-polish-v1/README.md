# Shared team hydration loading states

## Change

Registration and LevelMenu now use the same branded accessible loading screen as the protected game route. All three display “Restoring your team…” as a polite status region; the spinner stops under reduced-motion preference. This removes plain unstyled loading text when a saved session is restored.

## Validation

The focused Chrome scenario delayed the synthetic team/progress API responses and captured the loading state on registration, LevelMenu, and game entry. Each route exposed `role="status"`, `aria-live="polite"`, the expected label, and no spinner animation under reduced motion. The team then hydrated successfully and the game reached its ready state.

Screenshots: `react-registration-team-hydration-loading.png`, `react-menu-team-hydration-loading.png`, and `react-team-hydration-loading.png`. `runtime-trace.json` contains the three route states and completion result.

The same implementation passed ESLint, all 18 geometry tests, Vite production build, and the 8 MB premium asset gate. The complete browser regression is being rerun after this UI change.
