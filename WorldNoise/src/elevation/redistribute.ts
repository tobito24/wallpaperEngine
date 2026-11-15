import { ELEVATION_CONTRAST, ELEVATION_RAW_RANGE_HIGH, ELEVATION_RAW_RANGE_LOW } from '../config/constants';
import { createRedistribution } from '../core/redistribute';

export const redistributeElevation = createRedistribution(
  ELEVATION_RAW_RANGE_LOW,
  ELEVATION_RAW_RANGE_HIGH,
  ELEVATION_CONTRAST,
);
