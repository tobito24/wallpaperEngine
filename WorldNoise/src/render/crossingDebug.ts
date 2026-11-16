import type { Camera } from '../core/Camera';
import { roadEdgesIn } from '../road/roadEdge';
import type { CrossingOutcome } from '../road/roadCrossing';

const MARKER_COLORS: Readonly<Record<CrossingOutcome, string>> = {
  stairs: '#3ddc4a',
  noBoundary: '#9aa0a6',
  overlap: '#ff3b30',
  tooExpensive: '#ff9500',
  water: '#0a84ff',
  curve: '#ff2d92',
};

const OUTCOME_LABELS: Readonly<Record<CrossingOutcome, string>> = {
  stairs: 'stairs',
  noBoundary: 'no straight edge',
  overlap: 'too close to a stair',
  tooExpensive: 'too much to flatten',
  water: 'water near',
  curve: 'road curve',
};

const MARKER_SCALE = 1.4;
const LEGEND_ROW_PX = 16;

export const CROSSING_LEGEND_HEIGHT_PX = Object.keys(MARKER_COLORS).length * LEGEND_ROW_PX;

export function drawCrossingMarkers(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
  tileSizePx: number,
): void {
  const bounds = camera.getVisibleTileBounds(viewportWidth, viewportHeight);
  const edges = roadEdgesIn(
    bounds.minX,
    bounds.minY,
    bounds.maxX - bounds.minX + 1,
    bounds.maxY - bounds.minY + 1,
  );
  const markerSizePx = tileSizePx * MARKER_SCALE;
  for (const edge of edges) {
    for (const { x, y, outcome } of edge.candidateOutcomes) {
      const screen = camera.worldToScreen(x, y, viewportWidth, viewportHeight);
      ctx.fillStyle = MARKER_COLORS[outcome];
      ctx.globalAlpha = 0.75;
      ctx.fillRect(
        screen.x + (tileSizePx - markerSizePx) / 2,
        screen.y + (tileSizePx - markerSizePx) / 2,
        markerSizePx,
        markerSizePx,
      );
      ctx.globalAlpha = 1;
    }
  }
}

export function drawCrossingLegend(ctx: CanvasRenderingContext2D, left: number, top: number): void {
  ctx.font = '12px monospace';
  (Object.keys(MARKER_COLORS) as CrossingOutcome[]).forEach((outcome, row) => {
    const y = top + row * LEGEND_ROW_PX;
    ctx.fillStyle = MARKER_COLORS[outcome];
    ctx.fillRect(left, y, 12, 12);
    ctx.fillStyle = '#cfd3d8';
    ctx.fillText(OUTCOME_LABELS[outcome], left + 18, y + 11);
  });
}
