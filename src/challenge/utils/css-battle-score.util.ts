import { chromium, type Browser } from 'playwright';

type CssBattleScoreRequest = {
  targetHtml: string;
  targetCss: string;
  submissionMarkup: string;
  viewportWidth: number;
  viewportHeight: number;
  background: string;
};

const DEFAULT_VIEWPORT = { width: 400, height: 300 };
const GRID = { columns: 40, rows: 30 };

let browserPromise: Promise<Browser> | null = null;

function buildCssBattleDocument(html: string, css: string, background: string) {
  return `<!doctype html>
<html>
  <head>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: ${background}; }
      ${css}
    </style>
  </head>
  <body>${html}</body>
</html>`;
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  return browserPromise;
}

async function sampleColors(
  html: string,
  css: string,
  background: string,
  viewportWidth: number,
  viewportHeight: number,
) {
  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width: viewportWidth, height: viewportHeight },
  });

  try {
    await page.setContent(buildCssBattleDocument(html, css, background), {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForTimeout(16);

    return await page.evaluate(
      ({ width, height, columns, rows }) => {
        const parseCssColor = (value: string) => {
          const match = value.match(/rgba?\(([^)]+)\)/i);
          if (!match) return { r: 0, g: 0, b: 0, a: 1 };
          const parts = match[1].split(',').map((part) => part.trim());
          const r = Number(parts[0]);
          const g = Number(parts[1]);
          const b = Number(parts[2]);
          const a = parts[3] !== undefined ? Number(parts[3]) : 1;

          return {
            r: Number.isFinite(r) ? r : 0,
            g: Number.isFinite(g) ? g : 0,
            b: Number.isFinite(b) ? b : 0,
            a: Number.isFinite(a) ? a : 1,
          };
        };

        const resolvePointColor = (x: number, y: number) => {
          let node = document.elementFromPoint(x, y) as HTMLElement | null;
          while (node) {
            const color = getComputedStyle(node).backgroundColor;
            const parsed = parseCssColor(color);
            if (parsed.a > 0) {
              return parsed;
            }
            node = node.parentElement;
          }

          return parseCssColor(getComputedStyle(document.body).backgroundColor);
        };

        const colors: Array<{ r: number; g: number; b: number }> = [];
        const stepX = width / columns;
        const stepY = height / rows;

        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < columns; col += 1) {
            const x = Math.min(width - 1, Math.floor((col + 0.5) * stepX));
            const y = Math.min(height - 1, Math.floor((row + 0.5) * stepY));
            const { r, g, b } = resolvePointColor(x, y);
            colors.push({ r, g, b });
          }
        }

        return colors;
      },
      {
        width: viewportWidth,
        height: viewportHeight,
        columns: GRID.columns,
        rows: GRID.rows,
      },
    );
  } finally {
    await page.close();
  }
}

export async function scoreCssBattleCase(request: CssBattleScoreRequest) {
  const viewportWidth = Number.isFinite(request.viewportWidth)
    ? request.viewportWidth
    : DEFAULT_VIEWPORT.width;
  const viewportHeight = Number.isFinite(request.viewportHeight)
    ? request.viewportHeight
    : DEFAULT_VIEWPORT.height;
  const background = request.background || '#ffffff';

  const [targetColors, submissionColors] = await Promise.all([
    sampleColors(
      request.targetHtml,
      request.targetCss,
      background,
      viewportWidth,
      viewportHeight,
    ),
    sampleColors(
      request.submissionMarkup,
      '',
      background,
      viewportWidth,
      viewportHeight,
    ),
  ]);

  if (targetColors.length === 0 || submissionColors.length === 0) {
    return 0;
  }

  const maxDistance = Math.sqrt(255 * 255 * 3);
  const totalDistance = targetColors.reduce((sum, color, index) => {
    const sample = submissionColors[index];
    if (!sample) return sum;
    const dr = color.r - sample.r;
    const dg = color.g - sample.g;
    const db = color.b - sample.b;
    return sum + Math.sqrt(dr * dr + dg * dg + db * db);
  }, 0);

  const avgDistance = totalDistance / targetColors.length;
  const similarity = Math.max(0, 1 - avgDistance / maxDistance);

  return Math.round(similarity * 10000) / 100;
}
