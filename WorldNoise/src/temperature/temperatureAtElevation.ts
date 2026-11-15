import { TEMPERATURE_DROP_PER_ELEVATION, TEMPERATURE_REFERENCE_ELEVATION } from '../config/constants';

export function temperatureAtElevation(temperature: number, elevation: number): number {
  return temperature - TEMPERATURE_DROP_PER_ELEVATION * (elevation - TEMPERATURE_REFERENCE_ELEVATION);
}
