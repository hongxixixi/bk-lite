import { expect, it } from 'vitest';
import { DEFAULT_PORTAL_LAYOUT, heightForContent, normalizeLayout, placeWidget } from './portal-layout';

it('默认模板是主区 8 列、辅区 4 列，且不放个人组件和趋势', () => {
  expect(DEFAULT_PORTAL_LAYOUT.background).toBe('');
  expect(DEFAULT_PORTAL_LAYOUT.widgets.map(item => item.type)).toEqual(['quick', 'stats', 'services', 'todo', 'announcements', 'tickets']);
  const [quick, stats, services, todo, announcements, tickets] = DEFAULT_PORTAL_LAYOUT.widgets;
  expect(quick).toMatchObject({ x: 0, w: 8 });
  expect(stats).toMatchObject({ x: 8, w: 4, y: quick.y });
  expect(services).toMatchObject({ x: 0, w: 8 });
  expect(todo).toMatchObject({ x: 8 });
  expect(quick.h).toBeLessThan(18);
  expect(announcements.h).toBeLessThanOrEqual(20);
  expect(services.h).toBeGreaterThan(quick.h + announcements.h);
  expect(announcements.y).toBe(services.y + services.h);
  expect(todo.y).toBe(stats.y + stats.h);
  expect(tickets.y).toBe(todo.y + todo.h);
  expect(tickets.y + tickets.h).not.toBe(announcements.y + announcements.h);
});

it('旧的半宽整行布局会折成网格，重叠和重复布局无效', () => {
  const legacy = normalizeLayout({ title: '门户', subtitle: '', background: '', widgets: [{ type: 'services', width: 12 }, { type: 'todo', width: 6 }, { type: 'favorites', width: 6 }] });
  expect(legacy?.widgets[0]).toEqual({ type: 'services', x: 0, y: 0, w: 12, h: 24 });
  expect(legacy?.widgets[1]).toMatchObject({ x: 0, w: 6 });
  expect(legacy?.widgets[2]).toMatchObject({ x: 6, y: legacy?.widgets[1].y, w: 6 });
  expect(normalizeLayout({ title: '门户', subtitle: '', background: '', widgets: [{ type: 'services', x: 0, y: 0, w: 8, h: 10 }, { type: 'todo', x: 6, y: 2, w: 4, h: 8 }] })).toBeNull();
  expect(normalizeLayout({ title: '门户', subtitle: '', background: '', widgets: [{ type: 'services', x: 0, y: 0, w: 6, h: 8 }, { type: 'services', x: 6, y: 0, w: 6, h: 8 }] })).toBeNull();
});

it('新组件落在画布底部，按内容算出的高度会写回固定行数', () => {
  const placed = placeWidget(DEFAULT_PORTAL_LAYOUT.widgets, 'trend');
  const bottom = Math.max(...DEFAULT_PORTAL_LAYOUT.widgets.map(item => item.y + item.h));
  expect(placed).toMatchObject({ type: 'trend', x: 0, y: bottom });
  expect(DEFAULT_PORTAL_LAYOUT.widgets.some(item => item.type === 'trend')).toBe(false);
  expect(heightForContent(0, 0)).toBe(8);
  expect(heightForContent(200, 40)).toBeGreaterThan(8);
  expect(heightForContent(8000, 0)).toBe(240);
});
