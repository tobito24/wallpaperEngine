import type { EdgeStyle, EffectiveLimits, FillMode, GeneratorOptions, WaveShape } from './autotileGenerator';

function byId<Control extends HTMLElement>(id: string): Control {
  return document.querySelector<Control>(`#${id}`)!;
}

const styleSelect = byId<HTMLSelectElement>('style');
const waveShapeSelect = byId<HTMLSelectElement>('waveShape');
const amplitudeInput = byId<HTMLInputElement>('amplitude');
const amplitudeText = byId<HTMLSpanElement>('amplitudeText');
const periodSelect = byId<HTMLSelectElement>('period');
const seedInput = byId<HTMLInputElement>('seed');
const insetInput = byId<HTMLInputElement>('inset');
const sideInsetInputs = {
  top: byId<HTMLInputElement>('insetTop'),
  right: byId<HTMLInputElement>('insetRight'),
  bottom: byId<HTMLInputElement>('insetBottom'),
  left: byId<HTMLInputElement>('insetLeft'),
};
const outerRadiusInput = byId<HTMLInputElement>('outerRadius');
const innerRadiusInput = byId<HTMLInputElement>('innerRadius');
const fillModeSelect = byId<HTMLSelectElement>('fillMode');
const rimWidthInput = byId<HTMLInputElement>('rimWidth');
const ditherInput = byId<HTMLInputElement>('dither');
const shadeWidthInput = byId<HTMLInputElement>('shadeWidth');
const shadeAmountInput = byId<HTMLInputElement>('shadeAmount');
const offsetXInput = byId<HTMLInputElement>('offsetX');
const offsetYInput = byId<HTMLInputElement>('offsetY');
const limitsElement = byId<HTMLSpanElement>('limits');

const allControls: HTMLElement[] = [
  styleSelect,
  waveShapeSelect,
  amplitudeInput,
  periodSelect,
  seedInput,
  insetInput,
  ...Object.values(sideInsetInputs),
  outerRadiusInput,
  innerRadiusInput,
  fillModeSelect,
  rimWidthInput,
  ditherInput,
  shadeWidthInput,
  shadeAmountInput,
  offsetXInput,
  offsetYInput,
];

function insetOrAll(input: HTMLInputElement): number {
  return input.value === '' ? Number(insetInput.value) : Number(input.value);
}

export function readGeneratorOptions(): GeneratorOptions {
  return {
    style: styleSelect.value as EdgeStyle,
    insets: {
      top: insetOrAll(sideInsetInputs.top),
      right: insetOrAll(sideInsetInputs.right),
      bottom: insetOrAll(sideInsetInputs.bottom),
      left: insetOrAll(sideInsetInputs.left),
    },
    outerCornerRadiusPx: Number(outerRadiusInput.value),
    innerCornerRadiusPx: Number(innerRadiusInput.value),
    waveShape: waveShapeSelect.value as WaveShape,
    waveAmplitudePx: Number(amplitudeInput.value),
    wavePeriodPx: Number(periodSelect.value),
    roughSeed: seedInput.value,
    fillMode: fillModeSelect.value as FillMode,
    rimWidthPx: Number(rimWidthInput.value),
    ditherPx: Number(ditherInput.value),
    shadeWidthPx: Number(shadeWidthInput.value),
    shadeAmountPercent: Number(shadeAmountInput.value),
    textureOffsetXPx: Number(offsetXInput.value),
    textureOffsetYPx: Number(offsetYInput.value),
  };
}

function toggleByAttribute(attribute: string, value: string): void {
  document.querySelectorAll<HTMLElement>(`[${attribute}]`).forEach((element) => {
    const shownFor = (element.getAttribute(attribute) ?? '').split(' ');
    element.classList.toggle('off', !shownFor.includes(value));
  });
}

export function describeLimits(limits: EffectiveLimits, options: GeneratorOptions): string {
  const { insets, waveAmplitudes } = limits;
  const parts = [
    `inset top ${insets.top}, right ${insets.right}, bottom ${insets.bottom}, left ${insets.left} px`,
    `outer radius ${limits.outerCornerRadiusPx} (max ${limits.maxOuterCornerRadiusPx}) px`,
    `inner radius ${limits.innerCornerRadiusPx} (max ${limits.maxInnerCornerRadiusPx}) px`,
  ];
  if (options.fillMode === 'rim') parts.push(`band ${limits.rimWidthPx} (max ${limits.maxRimWidthPx}) px`);
  if (options.ditherPx > 0) parts.push(`dither ${limits.ditherPx} (max ${limits.maxDitherPx}) px`);
  if (options.shadeWidthPx > 0) parts.push(`shade ${limits.shadeWidthPx} (max ${limits.maxShadeWidthPx}) px`);
  if (options.style === 'wavy' || options.style === 'rough') {
    parts.push(
      `height top ${waveAmplitudes.top}, right ${waveAmplitudes.right}, bottom ${waveAmplitudes.bottom}, left ${waveAmplitudes.left} px`,
    );
  }
  return `Used: ${parts.join('; ')}`;
}

export function showLimits(limits: EffectiveLimits, options: GeneratorOptions): void {
  outerRadiusInput.max = String(limits.maxOuterCornerRadiusPx);
  innerRadiusInput.max = String(limits.maxInnerCornerRadiusPx);
  rimWidthInput.max = String(limits.maxRimWidthPx);
  ditherInput.max = String(limits.maxDitherPx);
  shadeWidthInput.max = String(limits.maxShadeWidthPx);
  limitsElement.textContent = describeLimits(limits, options);
}

export function updateControlVisibility(): void {
  toggleByAttribute('data-shown-for', styleSelect.value);
  toggleByAttribute('data-shown-for-fill', fillModeSelect.value);
  amplitudeText.textContent = styleSelect.value === 'rough' ? 'Roughness px (0-4)' : 'Height px (0-4)';
}

export function onGeneratorControlsChange(callback: () => void): void {
  allControls.forEach((control) => control.addEventListener('input', callback));
}
