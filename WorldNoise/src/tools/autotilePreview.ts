import { AUTOTILE_QUARTER_COLUMNS, AUTOTILE_QUARTER_SIZE_PX } from '../config/constants';
import {
  onGeneratorControlsChange,
  readGeneratorOptions,
  showLimits,
  updateControlVisibility,
} from './autotileControls';
import {
  SHEET_HEIGHT_PX,
  SHEET_WIDTH_PX,
  TEXTURE_SIZE_PX,
  effectiveLimits,
  generateAutotileSheet,
  guideFromSheet,
} from './autotileGenerator';
import { AUTOTILE_QUARTER_IDS, NEIGHBOUR_OFFSETS, autotileIndexFor } from '../tileset/autotile';

const TILE_SIZE_PX = AUTOTILE_QUARTER_SIZE_PX * 2;
const POLL_INTERVAL_MS = 1000;
const ANIMATION_FRAME_DURATION_MS = 250;
const PATH_STORAGE_KEY = 'autotilePreviewPath';
const PROJECT_FOLDER_PREFIX = 'WorldNoise/';

const TEST_SHAPE = [
  '........................',
  '..#########.............',
  '.###########..####......',
  '.############.#####.....',
  '.####....####.######....',
  '.####....####..#####....',
  '.####....#####.#####....',
  '.###..#..######.###.....',
  '.###.###.....#####......',
  '.###..#...#..##.#.......',
  '..##......#..#...#..##..',
  '...###..#####.....#.###.',
  '....##..#####..#..#.###.',
  '.......###.##.###.......',
  '........................',
].map((line) => [...line].map((character) => character === '#'));

const GALLERY_ZOOM = 2;
const GALLERY_PATCHES_PER_ROW = 6;
const GALLERY_PATCH_PITCH_TILES = 4;
const MASK_COUNT = 256;

function firstMaskByReachableIndex(): Map<number, number> {
  const maskByIndex = new Map<number, number>();
  for (let mask = 0; mask < MASK_COUNT; mask++) {
    const index = autotileIndexFor(mask);
    if (!maskByIndex.has(index)) maskByIndex.set(index, mask);
  }
  return maskByIndex;
}

const FIRST_MASK_BY_INDEX = firstMaskByReachableIndex();
const AUTOTILE_COUNT = FIRST_MASK_BY_INDEX.size;

interface TileLabel {
  column: number;
  row: number;
  text: string;
}

const pathInput = document.querySelector<HTMLInputElement>('#path')!;
const backgroundSelect = document.querySelector<HTMLSelectElement>('#background')!;
const scaleSelect = document.querySelector<HTMLSelectElement>('#scale')!;
const statusElement = document.querySelector<HTMLDivElement>('#status')!;
const sheetCanvas = document.querySelector<HTMLCanvasElement>('#sheet')!;
const mapCanvas = document.querySelector<HTMLCanvasElement>('#map')!;
const galleryCanvas = document.querySelector<HTMLCanvasElement>('#gallery')!;
const textureInput = document.querySelector<HTMLInputElement>('#texture')!;
const guideButton = document.querySelector<HTMLButtonElement>('#guide')!;
const downloadButton = document.querySelector<HTMLButtonElement>('#download')!;
const frameLabel = document.querySelector<HTMLLabelElement>('#frameLabel')!;
const frameSelect = document.querySelector<HTMLSelectElement>('#frame')!;
const animateLabel = document.querySelector<HTMLLabelElement>('#animateLabel')!;
const animateInput = document.querySelector<HTMLInputElement>('#animate')!;

let sheet: CanvasImageSource | undefined;
let sheetLabel = '';
let lastModified: string | null = null;
let textures: ImageData[] = [];
let sheetWidthPx = SHEET_WIDTH_PX;
let frameCount = 1;
let currentFrame = 0;
let generatedSheet: HTMLCanvasElement | undefined;
let generatedGuide: HTMLCanvasElement | undefined;

function urlFromRelativePath(relativePath: string): string {
  const path = relativePath.trim().replaceAll('\\', '/').replace(/^\/+/, '');
  return '/' + (path.startsWith(PROJECT_FOLDER_PREFIX) ? path.slice(PROJECT_FOLDER_PREFIX.length) : path);
}

function setStatus(message: string, isError = false): void {
  statusElement.textContent = message;
  statusElement.classList.toggle('error', isError);
}

function scale(): number {
  return Number(scaleSelect.value);
}

function fillBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  if (backgroundSelect.value !== 'checker') {
    ctx.fillStyle = backgroundSelect.value;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const cellPx = 8 * scale();
  for (let y = 0; y < height; y += cellPx) {
    for (let x = 0; x < width; x += cellPx) {
      ctx.fillStyle = (x / cellPx + y / cellPx) % 2 === 0 ? '#ffffff' : '#cccccc';
      ctx.fillRect(x, y, cellPx, cellPx);
    }
  }
}

function drawQuarter(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  quarterId: number,
  destinationX: number,
  destinationY: number,
): void {
  const position = quarterId - 1;
  ctx.drawImage(
    image,
    currentFrame * SHEET_WIDTH_PX + (position % AUTOTILE_QUARTER_COLUMNS) * AUTOTILE_QUARTER_SIZE_PX,
    Math.floor(position / AUTOTILE_QUARTER_COLUMNS) * AUTOTILE_QUARTER_SIZE_PX,
    AUTOTILE_QUARTER_SIZE_PX,
    AUTOTILE_QUARTER_SIZE_PX,
    destinationX,
    destinationY,
    AUTOTILE_QUARTER_SIZE_PX,
    AUTOTILE_QUARTER_SIZE_PX,
  );
}

type Grid = boolean[][];

function neighbourMaskAt(grid: Grid, column: number, row: number): number {
  let mask = 0;
  for (const { dx, dy, bit } of NEIGHBOUR_OFFSETS) {
    if (grid[row + dy]?.[column + dx]) mask |= bit;
  }
  return mask;
}

function autotileIndicesIn(grid: Grid): Set<number> {
  const indices = new Set<number>();
  grid.forEach((line, row) =>
    line.forEach((isSet, column) => {
      if (isSet) indices.add(autotileIndexFor(neighbourMaskAt(grid, column, row)));
    }),
  );
  return indices;
}

function buildGallery(): { grid: Grid; labels: TileLabel[] } {
  const patchRows = Math.ceil(AUTOTILE_COUNT / GALLERY_PATCHES_PER_ROW);
  const grid: Grid = Array.from({ length: patchRows * GALLERY_PATCH_PITCH_TILES }, () =>
    new Array<boolean>(GALLERY_PATCHES_PER_ROW * GALLERY_PATCH_PITCH_TILES).fill(false),
  );
  const labels: TileLabel[] = [];
  let patch = 0;
  for (const [index, mask] of FIRST_MASK_BY_INDEX) {
    const centerColumn = (patch % GALLERY_PATCHES_PER_ROW) * GALLERY_PATCH_PITCH_TILES + 1;
    const centerRow = Math.floor(patch / GALLERY_PATCHES_PER_ROW) * GALLERY_PATCH_PITCH_TILES + 1;
    grid[centerRow][centerColumn] = true;
    for (const { dx, dy, bit } of NEIGHBOUR_OFFSETS) {
      if (mask & bit) grid[centerRow + dy][centerColumn + dx] = true;
    }
    labels.push({ column: centerColumn, row: centerRow, text: String(index) });
    patch++;
  }
  return { grid, labels };
}

function drawSheetView(image: CanvasImageSource): void {
  const zoom = scale();
  sheetCanvas.width = sheetWidthPx * zoom;
  sheetCanvas.height = SHEET_HEIGHT_PX * zoom;
  const ctx = sheetCanvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  fillBackground(ctx, sheetCanvas.width, sheetCanvas.height);
  ctx.drawImage(image, 0, 0, sheetWidthPx, SHEET_HEIGHT_PX, 0, 0, sheetCanvas.width, sheetCanvas.height);
  ctx.strokeStyle = 'rgba(255, 0, 80, 0.55)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= sheetWidthPx; x += TILE_SIZE_PX) {
    ctx.beginPath();
    ctx.moveTo(x * zoom + 0.5, 0);
    ctx.lineTo(x * zoom + 0.5, sheetCanvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= SHEET_HEIGHT_PX; y += TILE_SIZE_PX) {
    ctx.beginPath();
    ctx.moveTo(0, y * zoom + 0.5);
    ctx.lineTo(sheetCanvas.width, y * zoom + 0.5);
    ctx.stroke();
  }
}

function drawMapView(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource,
  grid: Grid,
  zoom: number,
  labels: TileLabel[] = [],
): void {
  const columns = grid[0].length;
  const rows = grid.length;
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = columns * TILE_SIZE_PX;
  tileCanvas.height = rows * TILE_SIZE_PX;
  const tileCtx = tileCanvas.getContext('2d')!;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (!grid[row][column]) continue;
      const quarterIds = AUTOTILE_QUARTER_IDS[autotileIndexFor(neighbourMaskAt(grid, column, row))];
      quarterIds.forEach((quarterId, quarter) => {
        drawQuarter(
          tileCtx,
          image,
          quarterId,
          column * TILE_SIZE_PX + (quarter % 2) * AUTOTILE_QUARTER_SIZE_PX,
          row * TILE_SIZE_PX + Math.floor(quarter / 2) * AUTOTILE_QUARTER_SIZE_PX,
        );
      });
    }
  }
  canvas.width = tileCanvas.width * zoom;
  canvas.height = tileCanvas.height * zoom;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  fillBackground(ctx, canvas.width, canvas.height);
  ctx.drawImage(tileCanvas, 0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 12px sans-serif';
  ctx.textBaseline = 'top';
  for (const { column, row, text } of labels) {
    const x = column * TILE_SIZE_PX * zoom + 2;
    const y = row * TILE_SIZE_PX * zoom + 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 2, y - 2, ctx.measureText(text).width + 4, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
  }
}

const gallery = buildGallery();
const shapeCoverage = autotileIndicesIn(TEST_SHAPE).size;

function redraw(): void {
  if (!sheet) return;
  drawSheetView(sheet);
  drawMapView(mapCanvas, sheet, TEST_SHAPE, scale());
  drawMapView(galleryCanvas, sheet, gallery.grid, GALLERY_ZOOM, gallery.labels);
}

function updateFrameControls(): void {
  frameLabel.hidden = frameCount === 1;
  animateLabel.hidden = frameCount === 1;
  frameSelect.replaceChildren(
    ...Array.from({ length: frameCount }, (_, frame) => new Option(String(frame), String(frame))),
  );
  currentFrame = Math.min(currentFrame, frameCount - 1);
  frameSelect.value = String(currentFrame);
  if (frameCount === 1) animateInput.checked = false;
}

function showSheet(image: CanvasImageSource, width: number, height: number, label: string): void {
  sheet = image;
  sheetLabel = label;
  sheetWidthPx = width;
  frameCount = Math.max(1, Math.floor(width / SHEET_WIDTH_PX));
  updateFrameControls();
  const frameText = `${frameCount} frame${frameCount === 1 ? '' : 's'}`;
  const sizeWarning =
    width % SHEET_WIDTH_PX !== 0 || height !== SHEET_HEIGHT_PX
      ? ` (expected ${SHEET_WIDTH_PX} px per frame x ${SHEET_HEIGHT_PX}, showing ${frameText})`
      : '';
  setStatus(
    `${sheetLabel}: ${width} x ${height} px, ${frameText}${sizeWarning}. The shape uses ${shapeCoverage} of ${AUTOTILE_COUNT} tiles, the gallery below all of them (number = tile index).`,
    sizeWarning !== '',
  );
  redraw();
}

async function loadFromPath(): Promise<void> {
  const url = urlFromRelativePath(pathInput.value);
  try {
    const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.startsWith('image/'))
      throw new Error('no image found (only files inside WorldNoise/ can be loaded)');
    lastModified = response.headers.get('last-modified');
    const bitmap = await createImageBitmap(await response.blob());
    showSheet(bitmap, bitmap.width, bitmap.height, pathInput.value);
  } catch (error) {
    setStatus(`${pathInput.value}: ${(error as Error).message}`, true);
  }
}

async function reloadWhenFileChanged(): Promise<void> {
  if (document.hidden) return;
  try {
    const response = await fetch(`${urlFromRelativePath(pathInput.value)}?t=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
    });
    const modified = response.headers.get('last-modified');
    if (response.ok && modified !== null && modified !== lastModified) await loadFromPath();
  } catch {
    return;
  }
}

function canvasWith(data: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  canvas.getContext('2d')!.putImageData(data, 0, 0);
  return canvas;
}

function saveCanvas(canvas: HTMLCanvasElement | undefined, fileName: string): void {
  canvas?.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function generateFromTextures(): void {
  updateControlVisibility();
  if (textures.length === 0) return;
  const options = readGeneratorOptions();
  showLimits(effectiveLimits(options), options);
  const sheetData = generateAutotileSheet(textures, options);
  generatedSheet = canvasWith(sheetData);
  generatedGuide = canvasWith(guideFromSheet(sheetData));
  downloadButton.disabled = false;
  guideButton.disabled = false;
  const label = `generated from ${textures.length} texture${textures.length === 1 ? '' : 's'}`;
  showSheet(generatedSheet, generatedSheet.width, generatedSheet.height, label);
}

function imageDataOf(bitmap: ImageBitmap): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE_PX;
  canvas.height = TEXTURE_SIZE_PX;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, TEXTURE_SIZE_PX, TEXTURE_SIZE_PX);
}

async function openFiles(files: File[]): Promise<void> {
  const opened = await Promise.all(
    files.map(async (file) => ({ file, bitmap: await createImageBitmap(file) })),
  );
  opened.sort((first, second) => first.file.name.localeCompare(second.file.name));
  const textureFiles = opened.filter(
    ({ bitmap }) => bitmap.width === TEXTURE_SIZE_PX && bitmap.height === TEXTURE_SIZE_PX,
  );
  if (textureFiles.length > 0) {
    textures = textureFiles.map(({ bitmap }) => imageDataOf(bitmap));
    generateFromTextures();
  } else if (opened.length > 0) {
    const { file, bitmap } = opened[0];
    showSheet(bitmap, bitmap.width, bitmap.height, `${file.name} (dropped, no auto reload)`);
  }
}

textureInput.addEventListener('change', () => void openFiles([...(textureInput.files ?? [])]));
onGeneratorControlsChange(generateFromTextures);
downloadButton.addEventListener('click', () => saveCanvas(generatedSheet, 'autotile.png'));
guideButton.addEventListener('click', () => saveCanvas(generatedGuide, 'autotile-guide.png'));
frameSelect.addEventListener('change', () => {
  currentFrame = Number(frameSelect.value);
  redraw();
});
setInterval(() => {
  if (!animateInput.checked || frameCount < 2) return;
  currentFrame = (currentFrame + 1) % frameCount;
  frameSelect.value = String(currentFrame);
  redraw();
}, ANIMATION_FRAME_DURATION_MS);

pathInput.value = localStorage.getItem(PATH_STORAGE_KEY) ?? pathInput.value;
pathInput.addEventListener('change', () => {
  localStorage.setItem(PATH_STORAGE_KEY, pathInput.value);
  void loadFromPath();
});
backgroundSelect.addEventListener('change', redraw);
scaleSelect.addEventListener('change', redraw);

window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', async (event) => {
  event.preventDefault();
  await openFiles([...(event.dataTransfer?.files ?? [])]);
});

updateControlVisibility();
void loadFromPath();
setInterval(() => void reloadWhenFileChanged(), POLL_INTERVAL_MS);
