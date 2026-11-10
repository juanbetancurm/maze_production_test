import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { bearingVector } from './angleGeometry.js';

const logicalWidth = 800;
const logicalHeight = 600;

function makeGeometry(gameScale, requestedRadius) {
  const scale = Number.isFinite(gameScale) && gameScale > 0 ? gameScale : 1;
  const lineScale = 1 / scale;
  const baseRadius = Math.min(150, 64 / scale);
  return {
    scale,
    lineScale,
    mobile: scale < 0.7,
    baseRadius,
    radius: Number.isFinite(requestedRadius) && requestedRadius > 0
      ? Math.min(baseRadius, requestedRadius)
      : baseRadius,
  };
}

function turnArcPath(turn, radius) {
  if (!turn || !turn.direction) return '';
  const sweep = turn.direction * (turn.remainder || (turn.fullTurns ? 360 : 0));
  if (!sweep) return '';
  const start = turn.start;
  const shown = Math.min(Math.abs(sweep), 360) * turn.direction;
  const count = Math.max(2, Math.ceil(Math.abs(shown) / 8));
  return Array.from({ length: count + 1 }, (_, index) => {
    const degree = start + shown * (index / count);
    const point = bearingVector(degree);
    return `${index === 0 ? 'M' : 'L'} ${point.x * radius * 0.54} ${point.y * radius * 0.54}`;
  }).join(' ');
}

const MazeMathOverlay = forwardRef(function MazeMathOverlay({ levelNumber, gameScale }, ref) {
  const coordinateRef = useRef(null);
  const coordinateBackgroundRef = useRef(null);
  const protractorRef = useRef(null);
  const needleRef = useRef(null);
  const turnLabelRef = useRef(null);
  const [geometry, setGeometry] = useState(() => makeGeometry(gameScale));
  const [turn, setTurn] = useState(null);

  useImperativeHandle(ref, () => ({
    sync(state) {
      if (coordinateRef.current) {
        coordinateRef.current.textContent = `x: ${Math.round(state.x)}  y: ${Math.round(state.y)}`;
      }
      const coordinateRight = state.x > 400 && state.y < 160 ? 120 : 784;
      if (coordinateRef.current) {
        coordinateRef.current.setAttribute('x', String(coordinateRight - 8 * state.lineScale));
      }
      if (coordinateBackgroundRef.current) {
        coordinateBackgroundRef.current.setAttribute('x', String(coordinateRight - 104 * state.lineScale));
      }
      if (protractorRef.current) {
        protractorRef.current.setAttribute('transform', `translate(${state.x} ${state.y})`);
        protractorRef.current.setAttribute('opacity', String(state.alpha));
        protractorRef.current.setAttribute('display', state.rootVisible ? 'inline' : 'none');
      }
      if (needleRef.current) {
        needleRef.current.setAttribute('transform', `rotate(${-state.angle})`);
      }
      if (turnLabelRef.current) {
        const x = state.x > 400 ? -state.radius : state.radius;
        const y = state.y > 300
          ? -state.radius - 26 * state.lineScale
          : state.radius + 26 * state.lineScale;
        turnLabelRef.current.setAttribute('transform', `translate(${x} ${y})`);
      }
      setGeometry((current) => {
        if (Math.abs(current.scale - state.gameScale) < 0.0001 &&
            Math.abs(current.radius - state.radius) < 0.5) return current;
        return makeGeometry(state.gameScale, state.radius);
      });
      setTurn((current) => current === state.turn ? current : state.turn);
    },
  }), []);

  const tickNodes = useMemo(() => {
    const step = geometry.mobile || geometry.radius * geometry.scale < 38 ? 10 : 5;
    const nodes = [];
    for (let degree = 0; degree < 360; degree += step) {
      const vector = bearingVector(degree);
      const cardinal = degree % 90 === 0;
      const major = degree % 30 === 0;
      const length = (cardinal ? 12 : major ? 8 : 4) * geometry.lineScale;
      nodes.push(
        <line key={degree}
          data-bearing={degree}
          x1={vector.x * (geometry.radius - length)}
          y1={vector.y * (geometry.radius - length)}
          x2={vector.x * geometry.radius}
          y2={vector.y * geometry.radius}
          stroke={cardinal ? '#f0f4f7' : '#c6d8e5'}
          strokeOpacity={cardinal ? 0.98 : 0.72}
          strokeWidth={(cardinal ? 2 : major ? 1.4 : 0.9) * geometry.lineScale}
          strokeLinecap="round" />
      );
    }
    return nodes;
  }, [geometry]);

  const degreeNodes = useMemo(() => {
    const screenRadius = geometry.radius * geometry.scale;
    const degrees = geometry.mobile || screenRadius < 38
      ? [0, 90, 180, 270]
      : screenRadius < 58
        ? Array.from({ length: 8 }, (_, i) => i * 45)
        : Array.from({ length: 12 }, (_, i) => i * 30);
    return degrees.map((degree) => {
      const vector = bearingVector(degree);
      const distance = geometry.radius + 14 * geometry.lineScale;
      return (
        <text key={degree}
          data-bearing={degree}
          x={vector.x * distance} y={vector.y * distance}
          dominantBaseline="central" textAnchor="middle"
          fontFamily="Arial, sans-serif" fontSize={12 * geometry.lineScale}
          fontWeight={degree % 90 === 0 ? 700 : 400}
          fill="#f1f6fa" stroke="#14202b" strokeOpacity="0.88"
          strokeWidth={2.5 * geometry.lineScale} strokeLinejoin="round"
          paintOrder="stroke">{degree}°</text>
      );
    });
  }, [geometry]);

  const title = levelNumber === 2 ? 'Level 2 — Tricky Angles' : 'Level 1 — Right Angles';
  const titleVisible = geometry.scale >= 0.6;
  const titleFontSize = 12 * geometry.lineScale;
  const hudHeight = 20 * geometry.lineScale;
  const hudPad = 8 * geometry.lineScale;
  const arc = turnArcPath(turn, geometry.radius);
  const turnText = turn
    ? `${turn.signedDegrees > 0 ? '+' : ''}${turn.signedDegrees}° → ${turn.end}°`
    : '';

  return (
    <svg className="maze-math-overlay" viewBox={`0 0 ${logicalWidth} ${logicalHeight}`}
      aria-hidden="true" focusable="false" data-math-overlay="true">
      <g className="maze-math-hud" display={titleVisible ? undefined : 'none'}>
        <rect x={186} y={2} width={170 * geometry.lineScale} height={hudHeight}
          rx={2 * geometry.lineScale} fill="#0e1f26" fillOpacity="0.92" />
        <text x={194} y={2 + 14 * geometry.lineScale} fill="#fff4df"
          fontFamily="Arial, sans-serif" fontSize={titleFontSize} fontWeight="700"
          textLength={154 * geometry.lineScale} lengthAdjust="spacingAndGlyphs">{title}</text>
        <rect ref={coordinateBackgroundRef} x={784 - 104 * geometry.lineScale} y={2}
          width={104 * geometry.lineScale} height={hudHeight}
          rx={2 * geometry.lineScale} fill="#0e1f26" fillOpacity="0.92" />
        <text ref={coordinateRef} x={784 - hudPad} y={2 + 14 * geometry.lineScale}
          textAnchor="end" fill="#fff4df" fontFamily="Arial, sans-serif"
          fontSize={titleFontSize} fontWeight="700">x: 0  y: 0</text>
      </g>

      <g ref={protractorRef} className="maze-math-protractor" opacity="0" display="none">
        <circle r={geometry.radius} fill="#14202b" fillOpacity="0.12"
          stroke="#14202b" strokeOpacity="0.2" strokeWidth={5 * geometry.lineScale} />
        <circle r={geometry.radius} fill="none" stroke="#c6d8e5"
          strokeOpacity="0.88" strokeWidth={1.5 * geometry.lineScale} />
        {tickNodes}
        {degreeNodes}
        <circle r={3.5 * geometry.lineScale} fill="#f7f3e9" stroke="#14202b"
          strokeWidth={1.5 * geometry.lineScale} />
        <path d={arc} fill="none" stroke="#72d6c3" strokeOpacity="0.88"
          strokeWidth={2 * geometry.lineScale} strokeLinecap="round" />
        <g ref={needleRef}>
          <line x1="0" y1="0" x2={geometry.radius - 15 * geometry.lineScale} y2="0"
            stroke="#ffbd45" strokeWidth={2.5 * geometry.lineScale} strokeLinecap="round" />
          <path d={`M ${geometry.radius - 15 * geometry.lineScale} 0 l ${-10 * geometry.lineScale} ${-5 * geometry.lineScale} l ${2 * geometry.lineScale} ${5 * geometry.lineScale} l ${-2 * geometry.lineScale} ${5 * geometry.lineScale} Z`}
            fill="#ffbd45" />
        </g>
        <g ref={turnLabelRef} display={turn ? undefined : 'none'}>
          <rect x={-52 * geometry.lineScale} y={-11 * geometry.lineScale}
            width={104 * geometry.lineScale} height={22 * geometry.lineScale}
            rx={3 * geometry.lineScale} fill="#14202b" fillOpacity="0.88" />
          <text x="0" y="4" textAnchor="middle" fill="#fff"
            fontFamily="Arial, sans-serif" fontSize={10 * geometry.lineScale} fontWeight="700">
            {turnText}
          </text>
        </g>
      </g>
    </svg>
  );
});

export default MazeMathOverlay;
