/**
 * Stub for Phase 3 (villages/structures). Unused in Phase 1 — exists now so the chunk/generation
 * pipeline doesn't need reshaping when POIs are introduced, only this file filled in.
 */
export interface PointOfInterest {
  id: string;
  x: number;
  y: number;
  kind: string;
}

export class POIRegistry {
  private readonly points: PointOfInterest[] = [];

  register(poi: PointOfInterest): void {
    this.points.push(poi);
  }

  findNear(x: number, y: number, radius: number): PointOfInterest[] {
    return this.points.filter((poi) => Math.hypot(poi.x - x, poi.y - y) <= radius);
  }
}
