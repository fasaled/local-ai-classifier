const BAR_WIDTH = 20;
const FILENAME_WIDTH = 28;

let isActive = false;
let currentLength = 0;

function render(filename: string, current: number, total: number, message: string): string {
  const percent = total > 0 ? Math.floor((current / total) * 100) : 0;
  const filled = total > 0 ? Math.floor((current / total) * BAR_WIDTH) : 0;
  const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);

  const truncatedName = filename.length > FILENAME_WIDTH
    ? filename.slice(0, FILENAME_WIDTH - 3) + "..."
    : filename.padEnd(FILENAME_WIDTH);

  const msg = message ? ` ${message}` : "";
  return `${truncatedName} [${bar}] ${String(percent).padStart(3)}%${msg}`;
}

export function startProgress(filename: string, total: number, message: string = ""): void {
  if (isActive) {
    process.stdout.write(`\r${" ".repeat(currentLength)}\r`);
  }
  const text = render(filename, 0, total, message);
  process.stdout.write(text);
  currentLength = text.length;
  isActive = true;
}

export function updateProgress(filename: string, current: number, total: number, message: string = ""): void {
  if (!isActive) return;
  process.stdout.write("\r");
  const text = render(filename, current, total, message);
  if (text.length < currentLength) {
    process.stdout.write(text + " ".repeat(currentLength - text.length));
  } else {
    process.stdout.write(text);
    currentLength = text.length;
  }
}

export function finishProgress(resultLine: string): void {
  if (!isActive) {
    process.stdout.write(resultLine + "\n");
    return;
  }
  const padded = resultLine.length < currentLength
    ? resultLine + " ".repeat(currentLength - resultLine.length)
    : resultLine;
  process.stdout.write("\r" + padded + "\n");
  isActive = false;
  currentLength = 0;
}

export function clearProgress(): void {
  if (!isActive) return;
  process.stdout.write(`\r${" ".repeat(currentLength)}\r`);
  isActive = false;
  currentLength = 0;
}
