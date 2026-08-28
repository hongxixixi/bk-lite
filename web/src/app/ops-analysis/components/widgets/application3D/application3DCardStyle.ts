import type { Application3DCardTone, Application3DCardVisual } from './application3DLayout';

/**
 * Dark frosted glass for wall cards (图一). Canvas cannot use CSS backdrop-filter,
 * so frost, rim light and translucency are painted. Faces use MeshBasicMaterial
 * so the painted glass is the on-screen truth. Status is a hairline + pill, not a fill.
 */
export const CARD_THICKNESS = 0.2;

export type Application3DCardFace = 'front' | 'back';

/** Designer-locked 图一 paint. Do not invent replacements. */
export const CARD_PAINT = {
  glass: '#061C2D',
  glassAlpha: 0.72,
  normalBorder: '#2F6E7F',
  normalPill: '#51897F',
  warning: '#C77742',
  /** Existing wall-card red; error uses the same hue at weaker alpha. */
  critical: '#E05650',
} as const;

const hexRgb = (hex: string): string => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

export const rgbaFromHex = (hex: string, alpha: number): string =>
  `rgba(${hexRgb(hex)}, ${alpha})`;

/**
 * 1px hairline on a typical ~160px projected 512-wide card → 3.2 texture px.
 * ~4px on-screen corners → radius 13 (13 / 512 * 160 ≈ 4.1).
 */
const HAIRLINE = 3.2;

const glassFill = (alpha: number) => rgbaFromHex(CARD_PAINT.glass, alpha);

export const CARD_GLASS = {
  radius: 13,
  inset: 10,
  bodyCenter: glassFill(CARD_PAINT.glassAlpha),
  body: glassFill(CARD_PAINT.glassAlpha),
  bodyRim: glassFill(0.58),
  unknownBodyCenter: glassFill(CARD_PAINT.glassAlpha),
  unknownBody: glassFill(CARD_PAINT.glassAlpha),
  unknownBodyRim: glassFill(0.58),
  innerShadow: 'rgba(0, 0, 0, 0)',
  title: 'rgba(248, 250, 252, 0.98)',
  titleUnknown: 'rgba(232, 236, 242, 0.96)',
  frostAlpha: 0.018,
  frostGain: 0.016,
  frostStep: 4,
  fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  titleSize: 54,
  statusSize: 27,
} as const;

export const CARD_BADGE = {
  height: 46,
  radius: 6,
  fontSize: 26,
  inset: 20,
} as const;

export const HEALTHY_WALL_PILL = '运行正常';

export const CARD_CHROME = {
  iconInset: 32,
  iconSize: 72,
  iconStroke: 'rgba(255, 255, 255, 0.96)',
  iconLineWidth: 3.2,
  titleGap: 18,
  pillHeight: 42,
  pillPadX: 20,
  pillBottom: 28,
  pillFill: glassFill(0.32),
} as const;

/** Wall chrome owns 图一 copy; layout DTO labels stay unchanged. */
export const wallCardStatusLabel = (visual: Application3DCardVisual): string =>
  visual.cardTone === 'normal' ? HEALTHY_WALL_PILL : visual.statusLabel;

export const CARD_TONE = {
  normal: {
    edge: rgbaFromHex(CARD_PAINT.normalBorder, 0.92),
    edgeWidth: HAIRLINE,
    glow: { color: rgbaFromHex(CARD_PAINT.normalBorder, 0.28), width: 8 },
    innerGlow: 'rgba(0, 0, 0, 0)',
    dot: '#3cbcb0',
    statusText: rgbaFromHex(CARD_PAINT.normalPill, 0.96),
    badgeFill: rgbaFromHex(CARD_PAINT.critical, 0.96),
  },
  critical: {
    edge: rgbaFromHex(CARD_PAINT.critical, 0.92),
    edgeWidth: HAIRLINE,
    glow: { color: rgbaFromHex(CARD_PAINT.critical, 0.58), width: 10 },
    innerGlow: 'rgba(0, 0, 0, 0)',
    dot: '#e05650',
    statusText: rgbaFromHex(CARD_PAINT.critical, 0.96),
    badgeFill: rgbaFromHex(CARD_PAINT.critical, 0.96),
  },
  warning: {
    edge: rgbaFromHex(CARD_PAINT.warning, 0.92),
    edgeWidth: HAIRLINE,
    glow: { color: rgbaFromHex(CARD_PAINT.warning, 0.38), width: 8 },
    innerGlow: 'rgba(0, 0, 0, 0)',
    dot: '#d9a05c',
    statusText: rgbaFromHex(CARD_PAINT.warning, 0.96),
    badgeFill: rgbaFromHex(CARD_PAINT.warning, 0.96),
  },
  error: {
    edge: rgbaFromHex(CARD_PAINT.critical, 0.64),
    edgeWidth: HAIRLINE,
    glow: { color: rgbaFromHex(CARD_PAINT.critical, 0.36), width: 9 },
    innerGlow: 'rgba(0, 0, 0, 0)',
    dot: '#d97007',
    statusText: rgbaFromHex(CARD_PAINT.critical, 0.78),
    badgeFill: rgbaFromHex(CARD_PAINT.critical, 0.72),
  },
  info: {
    edge: 'rgba(96, 165, 250, 0.62)',
    edgeWidth: HAIRLINE,
    glow: { color: 'rgba(96, 165, 250, 0.16)', width: 7 },
    innerGlow: 'rgba(0, 0, 0, 0)',
    dot: '#60a5fa',
    statusText: 'rgba(186, 214, 242, 0.94)',
    badgeFill: 'rgba(59, 112, 168, 0.96)',
  },
  unknown: {
    edge: rgbaFromHex(CARD_PAINT.normalBorder, 0.48),
    edgeWidth: HAIRLINE,
    glow: { color: rgbaFromHex(CARD_PAINT.normalBorder, 0.12), width: 6 },
    innerGlow: 'rgba(0, 0, 0, 0)',
    dot: '#8b97a8',
    statusText: 'rgba(188, 196, 206, 0.92)',
    badgeFill: 'rgba(86, 98, 114, 0.96)',
  },
} as const;

export const CARD_HOVER = {
  liftZ: 0.2,
  scale: 1.02,
  emissiveBoost: 0.028,
  lerp: 0.16,
} as const;

export const ellipsizeText = (
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string => {
  if (maxWidth <= 0) return '';
  if (measure(text) <= maxWidth) return text;
  const ellipsis = '…';
  if (measure(ellipsis) > maxWidth) return ellipsis;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(`${text.slice(0, mid)}${ellipsis}`) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo <= 0 ? ellipsis : `${text.slice(0, lo)}${ellipsis}`;
};

export const badgeRect = (
  badgeText: string,
  canvasWidth: number,
  canvasHeight: number,
) => {
  const width =
    badgeText === '--' ? 58 : badgeText.length >= 3 ? 70 : 48;
  const x = canvasWidth - CARD_BADGE.inset - width;
  const y = CARD_BADGE.inset;
  return {
    x,
    y,
    width,
    height: CARD_BADGE.height,
    radius: CARD_BADGE.radius,
    centerX: x + width / 2,
    centerY: y + CARD_BADGE.height / 2,
    canvasHeight,
  };
};

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const hash01 = (x: number, y: number, salt: number) => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + salt * 45.164) * 43758.5453;
  return n - Math.floor(n);
};

const seedFromId = (id: string) => {
  let seed = 0;
  for (let i = 0; i < id.length; i += 1) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  return seed / 4294967295;
};

const paintFrost = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  inset: number,
) => {
  const frostAlpha = CARD_GLASS.frostAlpha;
  const frostGain = CARD_GLASS.frostGain;
  const frostStep = CARD_GLASS.frostStep;
  for (let y = inset; y < h - inset; y += frostStep) {
    for (let x = inset; x < w - inset; x += frostStep) {
      const n = hash01(x, y, seed);
      if (n > 0.46) {
        ctx.fillStyle = `rgba(210, 224, 240, ${frostAlpha + n * frostGain})`;
        const size = n > 0.88 ? 3 : n > 0.68 ? 2 : 1;
        ctx.fillRect(x, y, size, size);
      }
    }
  }
};

const rgbaAlpha = (value: string) => {
  const match = /,\s*([0-9.]+)\)$/.exec(value);
  return match ? Number(match[1]) : 0;
};

const paintGlassEdge = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tone: Application3DCardTone,
) => {
  const tokens = CARD_TONE[tone];
  const inset = CARD_GLASS.inset;
  const radius = CARD_GLASS.radius;

  roundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius);
  if (tokens.glow.width > 0 && rgbaAlpha(tokens.glow.color) > 0) {
    ctx.save();
    ctx.shadowColor = tokens.glow.color;
    ctx.shadowBlur = tokens.glow.width;
    ctx.strokeStyle = tokens.edge;
    ctx.lineWidth = tokens.edgeWidth;
    ctx.stroke();
    ctx.restore();
  }

  roundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius);
  ctx.strokeStyle = tokens.edge;
  ctx.lineWidth = tokens.edgeWidth;
  ctx.stroke();
};

const paintGlassBody = (
  ctx: CanvasRenderingContext2D,
  visual: Application3DCardVisual,
  seedId: string,
) => {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const tone = visual.cardTone;
  const inset = CARD_GLASS.inset;
  const radius = CARD_GLASS.radius;
  const seed = seedFromId(seedId);

  ctx.clearRect(0, 0, w, h);

  const body = ctx.createRadialGradient(
    w / 2,
    h * 0.42,
    Math.min(w, h) * 0.06,
    w / 2,
    h * 0.5,
    Math.max(w, h) * 0.78,
  );
  if (tone === 'unknown') {
    body.addColorStop(0, CARD_GLASS.unknownBodyCenter);
    body.addColorStop(0.7, CARD_GLASS.unknownBody);
    body.addColorStop(1, CARD_GLASS.unknownBodyRim);
  } else {
    body.addColorStop(0, CARD_GLASS.bodyCenter);
    body.addColorStop(0.7, CARD_GLASS.body);
    body.addColorStop(1, CARD_GLASS.bodyRim);
  }

  // Only the inset rounded pane is filled. Filling the full texture made the
  // mesh silhouette a matte slab and hid the cyan hairline at the card edge.
  roundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  roundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius);
  ctx.clip();
  paintFrost(ctx, w, h, seed, inset);
  const sheen = ctx.createLinearGradient(0, inset, 0, h * 0.38);
  const sheenHex =
    tone === 'warning'
      ? CARD_PAINT.warning
      : tone === 'critical' || tone === 'error'
        ? CARD_PAINT.critical
        : CARD_PAINT.normalBorder;
  sheen.addColorStop(0, rgbaFromHex(sheenHex, 0.16));
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(inset, inset, w - inset * 2, h * 0.38);
  ctx.restore();

  paintGlassEdge(ctx, w, h, tone);
};

const paintWireframeCube = (
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  size: number,
) => {
  const ox = size * 0.48;
  const oy = size * 0.27;
  const depth = size * 0.62;
  const top = originY;
  const midY = originY + oy;
  const frontTop = originY + oy * 2;
  const frontBot = originY + oy * 2 + depth;
  const leftX = originX;
  const midX = originX + ox;
  const rightX = originX + ox * 2;

  const edges: Array<[[number, number], [number, number]]> = [
    [[midX, top], [rightX, midY]],
    [[rightX, midY], [midX, frontTop]],
    [[midX, frontTop], [leftX, midY]],
    [[leftX, midY], [midX, top]],
    [[leftX, midY], [leftX, midY + depth]],
    [[midX, frontTop], [midX, frontBot]],
    [[rightX, midY], [rightX, midY + depth]],
    [[leftX, midY + depth], [midX, frontBot]],
    [[midX, frontBot], [rightX, midY + depth]],
  ];

  ctx.save();
  ctx.strokeStyle = CARD_CHROME.iconStroke;
  ctx.lineWidth = CARD_CHROME.iconLineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  edges.forEach(([from, to]) => {
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
  });
  ctx.restore();
};

const paintStatusPill = (
  ctx: CanvasRenderingContext2D,
  visual: Application3DCardVisual,
  tokens: (typeof CARD_TONE)[Application3DCardTone],
) => {
  const h = ctx.canvas.height;
  const label = wallCardStatusLabel(visual);
  ctx.font = `500 ${CARD_GLASS.statusSize}px ${CARD_GLASS.fontFamily}`;
  const textW = ctx.measureText(label).width;
  const height = CARD_CHROME.pillHeight;
  const width = Math.max(textW + CARD_CHROME.pillPadX * 2, height * 2);
  const x = CARD_CHROME.iconInset;
  const y = h - CARD_GLASS.inset - CARD_CHROME.pillBottom - height;
  roundRectPath(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = CARD_CHROME.pillFill;
  ctx.fill();
  ctx.strokeStyle = tokens.edge;
  ctx.lineWidth = Math.max(tokens.edgeWidth * 0.7, 1.6);
  ctx.stroke();
  ctx.fillStyle = tokens.statusText;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + CARD_CHROME.pillPadX, y + height / 2 + 1);
};

const paintFrontChrome = (
  ctx: CanvasRenderingContext2D,
  visual: Application3DCardVisual,
) => {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const tone = visual.cardTone;
  const tokens = CARD_TONE[tone];

  paintWireframeCube(ctx, CARD_CHROME.iconInset, CARD_CHROME.iconInset, CARD_CHROME.iconSize);

  const titleX = CARD_CHROME.iconInset + CARD_CHROME.iconSize + CARD_CHROME.titleGap;
  const titleY = CARD_CHROME.iconInset + CARD_CHROME.iconSize / 2;
  const badgeLeft = visual.showBadge
    ? badgeRect(visual.badgeText, w, h).x
    : w - CARD_BADGE.inset;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = tone === 'unknown' ? CARD_GLASS.titleUnknown : CARD_GLASS.title;
  ctx.font = `600 ${CARD_GLASS.titleSize}px ${CARD_GLASS.fontFamily}`;
  const title = ellipsizeText(
    visual.title,
    Math.max(badgeLeft - titleX - 16, 32),
    (value) => ctx.measureText(value).width,
  );
  ctx.fillText(title, titleX, titleY);

  paintStatusPill(ctx, visual, tokens);

  if (!visual.showBadge) return;
  const rect = badgeRect(visual.badgeText, w, h);
  roundRectPath(ctx, rect.x, rect.y, rect.width, rect.height, rect.radius);
  ctx.fillStyle = tokens.badgeFill;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${CARD_BADGE.fontSize}px ${CARD_GLASS.fontFamily}`;
  ctx.fillText(visual.badgeText, rect.centerX, rect.centerY + 1);
};

export const paintApplication3DCardSide = (
  ctx: CanvasRenderingContext2D,
  tone: Application3DCardTone,
) => {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const tokens = CARD_TONE[tone];
  const bodyCenter =
    tone === 'unknown' ? CARD_GLASS.unknownBodyCenter : CARD_GLASS.bodyCenter;
  const body = tone === 'unknown' ? CARD_GLASS.unknownBody : CARD_GLASS.body;
  const bodyRim = tone === 'unknown' ? CARD_GLASS.unknownBodyRim : CARD_GLASS.bodyRim;

  ctx.clearRect(0, 0, w, h);

  const across = ctx.createLinearGradient(0, 0, w, 0);
  across.addColorStop(0, tokens.edge);
  across.addColorStop(0.16, bodyRim);
  across.addColorStop(0.5, bodyCenter);
  across.addColorStop(0.84, body);
  across.addColorStop(1, tokens.edge);
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, w, h);

  const along = ctx.createLinearGradient(0, 0, 0, h);
  along.addColorStop(0, tokens.glow.color);
  along.addColorStop(0.08, 'rgba(0, 0, 0, 0)');
  along.addColorStop(0.92, 'rgba(0, 0, 0, 0)');
  along.addColorStop(1, tokens.glow.color);
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, w, h);
};

const paintBackChrome = (ctx: CanvasRenderingContext2D) => {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const inset = CARD_GLASS.inset + 18;
  roundRectPath(
    ctx,
    inset,
    inset,
    w - inset * 2,
    h - inset * 2,
    Math.max(CARD_GLASS.radius - 4, 8),
  );
  ctx.fillStyle = 'rgba(22, 30, 42, 0.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(198, 212, 228, 0.18)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
};

export const paintApplication3DCard = (
  ctx: CanvasRenderingContext2D,
  visual: Application3DCardVisual,
  seedId: string,
  face: Application3DCardFace = 'front',
) => {
  paintGlassBody(ctx, visual, seedId);
  if (face === 'back') {
    paintBackChrome(ctx);
    return;
  }
  paintFrontChrome(ctx, visual);
};
