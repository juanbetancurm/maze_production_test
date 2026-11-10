/** Shared accessible loading state for team routes, game route, and Phaser scene. */
export default function GameLoadingScreen({
  label = 'Loading game…',
  variant = 'page',
  className = '',
  ...attributes
}) {
  const classes = [
    'maze-experience',
    'maze-loading-screen',
    `maze-loading-${variant}`,
    className,
  ].filter(Boolean).join(' ');
  const Wrapper = variant === 'scene' ? 'div' : 'main';

  return (
    <Wrapper {...attributes} className={classes} role="status" aria-live="polite">
      <span className="maze-loading-spinner" aria-hidden="true" />
      <span className="maze-loading-wordmark"><span>Angle</span>Maze</span>
      <span className="maze-loading-message">{label}</span>
    </Wrapper>
  );
}
