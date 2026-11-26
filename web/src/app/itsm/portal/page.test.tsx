import { renderItsm as render } from '../test-utils';
import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from 'antd';
import PortalPage from './page';
import { DEFAULT_PORTAL_LAYOUT } from './portal-layout';
import type { WidgetType } from './workbench-types';

const api = vi.hoisted(() => ({ ready: true, portal: vi.fn(), portalLayout: vi.fn(), portalDashboard: vi.fn(), savePortalLayout: vi.fn(), toggleFavorite: vi.fn() }));
vi.mock('../api/useItsmApi', () => ({ useItsmApi: () => api }));
vi.mock('gridstack', () => ({
  GridStack: {
    init: (_options: unknown, element: HTMLElement) => {
      element.style.display = 'grid';
      element.style.gridTemplateColumns = 'repeat(12, minmax(0, 1fr))';
      element.style.gridAutoRows = '8px';
      element.style.gap = '8px';
      element.querySelectorAll<HTMLElement>(':scope > .grid-stack-item').forEach(item => {
        item.style.gridColumn = `${Number(item.getAttribute('gs-x')) + 1} / span ${item.getAttribute('gs-w')}`;
        item.style.gridRow = `${Number(item.getAttribute('gs-y')) + 1} / span ${item.getAttribute('gs-h')}`;
      });
      return { on: () => undefined, destroy: () => undefined, getGridItems: () => [] };
    },
  },
}));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.portal.mockResolvedValue({ can_manage: true, can_apply: true, catalogs: [{ id: 1, name: '办公服务', parent_id: null }, { id: 2, name: '设备', parent_id: 1 }], services: [{ id: 1, name: '电脑申请', description: '办公电脑', catalog_id: 2 }, { id: 2, name: '网络申请', catalog_id: null }], favorites: [], recents: [], hots: [] });
  api.portalLayout.mockResolvedValue({ title: '团队服务台', subtitle: '欢迎使用', background: '', widgets: [{ type: 'services', width: 12 }] });
  api.portalDashboard.mockResolvedValue({ stats: { total: 0, todo: 0, finished: 0, active: 0 }, tickets: [], todo: [], trend: [], announcements: [] });
});

const widget = (type: WidgetType, x: number, y: number, w: number, h: number) => ({ type, x, y, w, h });

it('服务支持搜索、收藏与申请入口', async () => {
  render(<App><PortalPage /></App>);
  expect((await screen.findByRole('link', { name: /电脑申请/ })).getAttribute('href')).toBe('/itsm/tickets/new?service_id=1');
  fireEvent.change(screen.getByRole('textbox', { name: '搜索服务' }), { target: { value: '电脑' } });
  expect(screen.queryByRole('link', { name: /网络申请/ })).toBeNull();
  expect(screen.getByRole('link', { name: /电脑申请/ }).innerHTML).toContain('<mark');
  fireEvent.click(screen.getByRole('button', { name: '收藏电脑申请' }));
  await waitFor(() => expect(api.toggleFavorite).toHaveBeenCalledWith(1));
});

it('普通用户没有配置入口', async () => {
  api.portal.mockResolvedValue({ can_manage: false, can_apply: false, catalogs: [], services: [], favorites: [], recents: [], hots: [] });
  render(<App><PortalPage /></App>);
  await screen.findByText('团队服务台');
  expect(screen.queryByRole('button', { name: /编排门户/ })).toBeNull();
  expect(screen.queryByRole('link', { name: /管理服务/ })).toBeNull();
});

it('编辑布局取消不会保存，发布提交新标题', async () => {
  api.savePortalLayout.mockImplementation(async value => value);
  render(<App><PortalPage /></App>);
  fireEvent.click(await screen.findByRole('button', { name: /编排门户/ }));
  fireEvent.click(screen.getByRole('button', { name: '移除服务目录' }));
  fireEvent.change(screen.getByRole('textbox', { name: '门户标题' }), { target: { value: '新的服务台' } });
  fireEvent.click(screen.getByRole('button', { name: /取消编辑/ }));
  expect(api.savePortalLayout).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: '团队服务台' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '服务目录' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /编排门户/ }));
  fireEvent.change(screen.getByRole('textbox', { name: '门户标题' }), { target: { value: '新的服务台' } });
  fireEvent.click(screen.getByRole('button', { name: /发布布局/ }));
  await waitFor(() => expect(api.savePortalLayout).toHaveBeenCalledWith(expect.objectContaining({ title: '新的服务台', widgets: [expect.objectContaining({ type: 'services', x: 0, y: 0, w: 12, h: 24 })] })));
});

it('加载失败显示重试，不保存空配置', async () => {
  api.portalLayout.mockRejectedValueOnce(new Error('配置读取失败'));
  render(<App><PortalPage /></App>);
  await screen.findByText('配置读取失败');
  fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
  await screen.findByText('团队服务台');
  expect(api.savePortalLayout).not.toHaveBeenCalled();
});

it('每种组件只能添加一个，移除后可再添加并随发布提交', async () => {
  api.savePortalLayout.mockImplementation(async value => value);
  const widgets = (['services', 'quick', 'stats', 'todo', 'tickets', 'announcements', 'recents', 'favorites'] as WidgetType[]).map((type, index) => widget(type, 0, index * 8, 4, 8));
  api.portalLayout.mockResolvedValue({ title: '团队服务台', subtitle: '欢迎使用', background: '', widgets });
  render(<App><PortalPage /></App>);
  fireEvent.click(await screen.findByRole('button', { name: /编排门户/ }));
  fireEvent.click(screen.getByRole('button', { name: /添加组件/ }));
  expect(await screen.findByRole('menuitem', { name: '完成情况趋势' })).toBeTruthy();
  expect(screen.queryByRole('menuitem', { name: '服务目录' })).toBeNull();
  fireEvent.click(screen.getByRole('menuitem', { name: '完成情况趋势' }));
  expect(screen.getByRole('heading', { name: '完成情况趋势' })).toBeTruthy();
  expect((screen.getByRole('button', { name: /添加组件/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /发布布局/ }));
  await waitFor(() => expect(api.savePortalLayout).toHaveBeenCalledWith(expect.objectContaining({
    widgets: expect.arrayContaining([expect.objectContaining({ type: 'trend', x: 0 })]),
  })));
  const saved = api.savePortalLayout.mock.calls.at(-1)?.[0].widgets as { type: string }[];
  expect(new Set(saved.map(item => item.type)).size).toBe(saved.length);
});

it('已发布的空组件保持槽位，不因为没有数据而消失', async () => {
  api.portalLayout.mockResolvedValue({ title: '团队服务台', subtitle: '', background: '', widgets: [widget('announcements', 0, 0, 8, 20), widget('todo', 8, 0, 4, 20)] });
  render(<App><PortalPage /></App>);
  const announcement = await screen.findByRole('region', { name: '公告' });
  expect(announcement.textContent).toContain('暂无公告');
  expect(announcement.closest('[data-widget="announcements"]')?.getAttribute('data-h')).toBe('20');
  expect(screen.getByRole('region', { name: '我的待办' }).textContent).toContain('暂无工单');
  expect(screen.getByRole('region', { name: '我的待办' }).closest('[data-widget]')?.getAttribute('data-h')).toBe('20');
});

it('默认模板渲染主区与辅区，不渲染未放置的组件', async () => {
  api.portalLayout.mockResolvedValue(DEFAULT_PORTAL_LAYOUT);
  render(<App><PortalPage /></App>);
  for (const name of ['快速提单', '服务目录', '公告', '工单统计', '我的待办', '工单列表']) {
    expect(await screen.findByRole('heading', { name })).toBeTruthy();
  }
  expect(screen.queryByRole('heading', { name: '最近使用' })).toBeNull();
  expect(screen.queryByRole('heading', { name: '我的收藏' })).toBeNull();
  expect(screen.queryByRole('heading', { name: '完成情况趋势' })).toBeNull();
  const quick = screen.getByRole('region', { name: '快速提单' }).closest('[data-widget]');
  const stats = screen.getByRole('region', { name: '工单统计' }).closest('[data-widget]');
  expect(quick?.getAttribute('gs-w')).toBe('8');
  expect(stats?.getAttribute('gs-w')).toBe('4');
  expect(stats?.getAttribute('gs-x')).toBe('8');
});

it('没有申请权限不展示申请链接，仍可搜索服务', async () => {
  const value = await api.portal();
  api.portal.mockResolvedValue({ ...value, can_apply: false });
  render(<App><PortalPage /></App>);
  await screen.findByText('电脑申请');
  expect(screen.queryByRole('link', { name: /电脑申请/ })).toBeNull();
});

it('不支持的背景图片不会保存', async () => {
  render(<App><PortalPage /></App>);
  fireEvent.click(await screen.findByRole('button', { name: /编排门户/ }));
  fireEvent.click(screen.getByRole('button', { name: '门户设置' }));
  fireEvent.change(screen.getByLabelText('上传背景图'), { target: { files: [new File(['svg'], 'image.svg', { type: 'image/svg+xml' })] } });
  await screen.findByText('请选择 1 MB 以内的 PNG、JPEG 或 WebP 图片');
  expect(api.savePortalLayout).not.toHaveBeenCalled();
});

it('工作台展示真实工单、公告与趋势，搜索只过滤服务不换掉整页', async () => {
  api.portalLayout.mockResolvedValue({
    title: '团队服务台',
    subtitle: '',
    background: '',
    widgets: (['stats', 'todo', 'tickets', 'trend', 'announcements', 'quick', 'recents', 'favorites', 'services'] as WidgetType[]).map((type, index) => widget(type, index % 2 ? 6 : 0, index * 12, 6, 12)),
  });
  api.portalDashboard.mockResolvedValue({ stats: { total: 12, todo: 1, active: 3, finished: 9 }, can_view_tickets: true, todo: [{ id: 3, title: '我的审批', sn: 'REQ3', status: '处理中' }], tickets: [{ id: 4, title: '完成的申请', sn: 'REQ4', status: '已完成' }], trend: [{ date: '2026-11-13', created: 2, finished: 1 }], announcements: [{ id: 1, title: '维护公告', content: '请提前保存工作', created_at: '2026-11-13' }] });
  render(<App><PortalPage /></App>);
  expect((await screen.findByRole('link', { name: /我的审批/ })).getAttribute('href')).toBe('/itsm/tickets/3');
  expect(screen.getByRole('link', { name: /完成的申请/ }).getAttribute('href')).toBe('/itsm/tickets/4');
  const finished = screen.getByText('已完成', { selector: 'span' });
  expect(finished.className).toContain('--color-success');
  expect(finished.className).not.toContain('--color-primary');
  expect(screen.getByRole('img', { name: '近十四天新建与完成工单趋势' })).toBeTruthy();
  fireEvent.click(screen.getByText('维护公告'));
  expect(screen.getByText('请提前保存工作')).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: '搜索服务' }), { target: { value: '电脑' } });
  expect(screen.getAllByRole('link', { name: /电脑申请/ }).length).toBeGreaterThan(0);
  expect(screen.queryByText('网络申请')).toBeNull();
  expect(screen.getByRole('link', { name: /我的审批/ })).toBeTruthy();
});
