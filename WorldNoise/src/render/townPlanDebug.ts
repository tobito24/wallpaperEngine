import { cellIndexOf } from '../skeleton/cellGrid';
import type { Camera, TileBounds } from '../core/Camera';
import { townOfCell } from '../town/townPlacement';
import { townPlanOf } from '../town/townPlan';
import type { Frontage } from '../town/townLots';

const SIDE_STREET_FILL = 'rgba(80, 140, 255, 0.45)';
const LOT_COLOR_BY_FRONTAGE: Readonly<Record<'through' | 'side' | 'none', string>> = {
  through: '#ffd400',
  side: '#ff8a00',
  none: '#ff4fa3',
};

function frontageKey(frontage: Frontage): 'through' | 'side' | 'none' {
  return frontage ?? 'none';
}

export function drawTownPlans(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  bounds: TileBounds,
  viewportWidth: number,
  viewportHeight: number,
  size: number,
): void {
  for (let cellY = cellIndexOf(bounds.minY); cellY <= cellIndexOf(bounds.maxY); cellY++) {
    for (let cellX = cellIndexOf(bounds.minX); cellX <= cellIndexOf(bounds.maxX); cellX++) {
      const town = townOfCell(cellX, cellY);
      if (!town) continue;
      const plan = townPlanOf(town);

      ctx.fillStyle = SIDE_STREET_FILL;
      for (const street of plan.sideStreets) {
        const origin = camera.worldToScreen(street.minX, street.minY, viewportWidth, viewportHeight);
        ctx.fillRect(origin.x, origin.y, street.width * size, street.height * size);
      }

      ctx.lineWidth = 2;
      for (const lot of plan.lots) {
        const origin = camera.worldToScreen(lot.x, lot.y, viewportWidth, viewportHeight);
        ctx.strokeStyle = LOT_COLOR_BY_FRONTAGE[frontageKey(lot.frontage)];
        ctx.strokeRect(origin.x + 1, origin.y + 1, lot.width * size - 2, lot.depth * size - 2);
      }
    }
  }
}
