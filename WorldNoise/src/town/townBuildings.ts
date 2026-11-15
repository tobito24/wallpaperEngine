export type BuildingKind = 'center' | 'mart' | 'house';

export interface BuildingType {
  readonly name: string;
  readonly kind: BuildingKind;
  readonly column: number;
  readonly row: number;
  readonly width: number;
  readonly height: number;
}

export const BUILDING_TYPES: readonly BuildingType[] = [
  { name: 'center', kind: 'center', column: 0, row: 326, width: 5, height: 5 },
  { name: 'mart', kind: 'mart', column: 0, row: 331, width: 4, height: 4 },
  { name: 'blueHouse', kind: 'house', column: 0, row: 171, width: 5, height: 4 },
  { name: 'orangeHouse', kind: 'house', column: 0, row: 192, width: 5, height: 4 },
  { name: 'redHouse', kind: 'house', column: 0, row: 198, width: 5, height: 4 },
  { name: 'greyHouse', kind: 'house', column: 0, row: 179, width: 5, height: 4 },
  { name: 'purpleHouse', kind: 'house', column: 3, row: 183, width: 5, height: 4 },
];
