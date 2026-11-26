import type { PortalLayout, PortalWidget, WidgetType } from './workbench-types';

export const PORTAL_COLUMNS = 12;
export const PORTAL_ROW_PX = 8;
export const PORTAL_GAP_PX = 4;
export const MIN_WIDGET_H = 8;
export const MAX_WIDGET_H = 240;
export const LEGACY_WIDGET_H = 24;

export const WIDGET_TYPES: WidgetType[] = [
  'quick', 'services', 'announcements', 'stats', 'todo', 'tickets', 'trend', 'recents', 'favorites',
];

const ADD_PRESET: Record<WidgetType, Pick<PortalWidget, 'w' | 'h'>> = {
  quick: { w: 8, h: 15 },
  services: { w: 8, h: 52 },
  announcements: { w: 8, h: 20 },
  stats: { w: 4, h: 16 },
  todo: { w: 4, h: 23 },
  tickets: { w: 4, h: 23 },
  trend: { w: 8, h: 28 },
  recents: { w: 4, h: 18 },
  favorites: { w: 4, h: 18 },
};

export const DEFAULT_PORTAL_LAYOUT: PortalLayout = {
  title: '服务工作台',
  subtitle: '发现所需服务，让每一次协作更高效',
  background: '',
  widgets: [
    { type: 'quick', x: 0, y: 0, w: 8, h: 15 },
    { type: 'stats', x: 8, y: 0, w: 4, h: 16 },
    { type: 'services', x: 0, y: 15, w: 8, h: 52 },
    { type: 'todo', x: 8, y: 16, w: 4, h: 23 },
    { type: 'announcements', x: 0, y: 67, w: 8, h: 20 },
    { type: 'tickets', x: 8, y: 39, w: 4, h: 23 },
  ],
};

const LIMITS: Record<'title' | 'subtitle' | 'background', number> = {
  title: 60,
  subtitle: 160,
  background: 1_500_000,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isWidgetType(value: unknown): value is WidgetType {
  return typeof value === 'string' && WIDGET_TYPES.includes(value as WidgetType);
}

function integer(value: unknown, low: number, high: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high;
}

function geometry(item: Record<string, unknown>): PortalWidget | null {
  if (!isWidgetType(item.type)) return null;
  if (!integer(item.x, 0, PORTAL_COLUMNS - 1) || !integer(item.y, 0, 5000)) return null;
  if (!integer(item.w, 1, PORTAL_COLUMNS) || !integer(item.h, MIN_WIDGET_H, MAX_WIDGET_H)) return null;
  if ((item.x as number) + (item.w as number) > PORTAL_COLUMNS) return null;
  return { type: item.type, x: item.x as number, y: item.y as number, w: item.w as number, h: item.h as number };
}

function overlaps(widgets: PortalWidget[]) {
  return widgets.some((item, index) => widgets.slice(index + 1).some(other =>
    item.x < other.x + other.w && other.x < item.x + item.w && item.y < other.y + other.h && other.y < item.y + item.h));
}

function packLegacy(items: { type: WidgetType; width: 6 | 12 }[]): PortalWidget[] {
  const placed: PortalWidget[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  items.forEach(item => {
    if (x + item.width > PORTAL_COLUMNS) {
      y += rowH;
      x = 0;
      rowH = 0;
    }
    placed.push({ type: item.type, x, y, w: item.width, h: LEGACY_WIDGET_H });
    x += item.width;
    rowH = Math.max(rowH, LEGACY_WIDGET_H);
    if (x >= PORTAL_COLUMNS) {
      y += rowH;
      x = 0;
      rowH = 0;
    }
  });
  return placed;
}

export function normalizeWidgets(value: unknown): PortalWidget[] | null {
  if (!Array.isArray(value) || value.length > WIDGET_TYPES.length) return null;
  const seen = new Set<WidgetType>();
  const legacy: { type: WidgetType; width: 6 | 12 }[] = [];
  const modern: PortalWidget[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isWidgetType(item.type) || seen.has(item.type)) return null;
    seen.add(item.type);
    const keys = Object.keys(item).sort().join(',');
    if (keys === 'type,width' && (item.width === 6 || item.width === 12)) {
      legacy.push({ type: item.type, width: item.width });
      continue;
    }
    if (keys !== 'h,type,w,x,y') return null;
    const next = geometry(item);
    if (!next) return null;
    modern.push(next);
  }
  if (legacy.length && modern.length) return null;
  const widgets = legacy.length ? packLegacy(legacy) : modern;
  return overlaps(widgets) ? null : widgets;
}

export function normalizeLayout(value: unknown): PortalLayout | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).sort().join(',') !== 'background,subtitle,title,widgets') return null;
  if (typeof value.title !== 'string' || typeof value.subtitle !== 'string' || typeof value.background !== 'string') return null;
  if (!value.title.trim()) return null;
  if (value.title.length > LIMITS.title || value.subtitle.length > LIMITS.subtitle || value.background.length > LIMITS.background) return null;
  const widgets = normalizeWidgets(value.widgets);
  if (!widgets) return null;
  return { title: value.title, subtitle: value.subtitle, background: value.background, widgets };
}

export function placeWidget(widgets: PortalWidget[], type: WidgetType): PortalWidget {
  const preset = ADD_PRESET[type];
  const y = widgets.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  return { type, x: 0, y, w: preset.w, h: preset.h };
}

export function heightForContent(contentPx: number, chromePx: number) {
  const needed = Math.max(0, contentPx) + Math.max(0, chromePx);
  const rows = Math.ceil((needed + PORTAL_GAP_PX * 2) / PORTAL_ROW_PX);
  return Math.min(MAX_WIDGET_H, Math.max(MIN_WIDGET_H, rows));
}
