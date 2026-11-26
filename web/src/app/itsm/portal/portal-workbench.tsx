'use client';

import { DeleteOutlined, EditOutlined, HolderOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input, Select } from 'antd';
import Link from 'next/link';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { PortalData } from '../types';
import { measureWidgetHeight, PortalCanvas } from './portal-canvas';
import { placeWidget } from './portal-layout';
import { LEGACY_BACKGROUNDS, widgetNames } from './workbench-types';
import type { PortalDashboard, PortalLayout, PortalWidget, WidgetType } from './workbench-types';
import { AnnouncementList, CatalogFilter, QuickChips, ServiceBrowser, ServiceNameList, StatsRow, TicketRows, TrendChart } from './workbench-widgets';

const CARD = 'group flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-[0_1px_3px_var(--color-portal-card-shadow)]';
const IMAGE_BACKGROUND = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export function portalSurface(background: string): { className: string; style?: CSSProperties } {
  if (IMAGE_BACKGROUND.test(background)) {
    return {
      className: '',
      style: {
        backgroundImage: `linear-gradient(var(--color-bg), color-mix(in srgb, var(--color-bg) 92%, transparent)), url("${background}")`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      },
    };
  }
  if (background === 'subtle' || LEGACY_BACKGROUNDS.includes(background as typeof LEGACY_BACKGROUNDS[number])) {
    return { className: 'bg-[var(--color-fill-1)]' };
  }
  return { className: '' };
}

function WidgetFrame({ type, editing, extra, onRemove, onFit, children }: {
  type: WidgetType;
  editing: boolean;
  extra?: ReactNode;
  onRemove: () => void;
  onFit: () => void;
  children: ReactNode;
}) {
  const name = widgetNames[type];
  return <section aria-label={name} className={CARD}>
    <div className="mb-3 flex min-h-7 items-center gap-2">
      {editing && <button type="button" aria-label={`移动${name}`} className="portal-drag inline-flex cursor-grab border-0 bg-transparent p-0 text-[var(--color-text-3)]"><HolderOutlined /></button>}
      <h2 className="m-0 truncate text-sm font-semibold text-[var(--color-text-1)]">{name}</h2>
      <div className="ml-auto flex min-w-0 items-center gap-1">
        {extra}
        {editing && <>
          <Button type="text" size="small" className="portal-no-drag opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`按内容调整${name}高度`} onClick={onFit}>适应高度</Button>
          <Button type="text" size="small" className="portal-no-drag opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`移除${name}`} icon={<DeleteOutlined />} onClick={onRemove} />
        </>}
      </div>
    </div>
    <div className="portal-widget-body min-h-0 flex-1 overflow-auto">{children}</div>
  </section>;
}

export function PortalWorkbench({ portal, layout, dashboard, draft, search, busy, favoriteBusy, onSearch, onFavorite, onEdit, onCancel, onPublish, onDraft, onUpload, onRefresh }: {
  portal: PortalData;
  layout: PortalLayout;
  dashboard: PortalDashboard;
  draft?: PortalLayout;
  search: string;
  busy?: boolean;
  favoriteBusy?: number;
  onSearch: (value: string) => void;
  onFavorite: (id: number) => void;
  onEdit: () => void;
  onCancel: () => void;
  onPublish: () => void;
  onDraft: (layout: PortalLayout) => void;
  onUpload: (file: File) => void;
  onRefresh: () => void;
}) {
  const current = draft ?? layout;
  const editing = Boolean(draft);
  const canvas = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [catalog, setCatalog] = useState<number | undefined>();
  const surface = portalSurface(current.background);
  const missing = (Object.keys(widgetNames) as WidgetType[]).filter(type => !current.widgets.some(item => item.type === type));
  const backgroundOptions = [
    { value: '', label: '无' },
    { value: 'subtle', label: '极浅底纹' },
    ...(LEGACY_BACKGROUNDS.includes(current.background as typeof LEGACY_BACKGROUNDS[number]) ? [{ value: current.background, label: '极浅底纹' }] : []),
  ];
  const update = (patch: Partial<PortalLayout>) => { if (draft) onDraft({ ...draft, ...patch }); };
  const updateWidgets = (widgets: PortalWidget[]) => update({ widgets });
  const fit = (type: WidgetType) => {
    const host = canvas.current?.querySelector<HTMLElement>('.portal-canvas');
    const nextH = host ? measureWidgetHeight(host, type) : undefined;
    if (!draft || nextH == null) return;
    updateWidgets(draft.widgets.map(item => item.type === type ? { ...item, h: nextH } : item));
  };
  const quickItems = (portal.hots.length ? portal.hots : portal.services).slice(0, 6);
  const viewAll = (type: WidgetType) => (type === 'todo' || type === 'tickets') && dashboard.can_view_tickets && !editing
    ? <Link className="portal-no-drag shrink-0 text-xs text-[var(--color-primary)]" href={type === 'todo' ? '/itsm/tickets?tab=mine' : '/itsm/tickets'}>查看全部</Link>
    : null;
  const body = (type: WidgetType) => {
    const actions = { portal, onFavorite, pending: favoriteBusy };
    switch (type) {
      case 'quick': return <QuickChips {...actions} items={quickItems} search={search} />;
      case 'recents': return <ServiceNameList {...actions} items={portal.recents} search={search} />;
      case 'favorites': return <ServiceNameList {...actions} items={portal.favorites} search={search} starred />;
      case 'services': return <ServiceBrowser {...actions} variant="portal" search={search} catalog={catalog} onCatalogChange={value => { setCatalog(value); }} />;
      case 'todo': return <TicketRows items={dashboard.todo} allowed={dashboard.can_view_tickets} />;
      case 'tickets': return <TicketRows items={dashboard.tickets} allowed={dashboard.can_view_tickets} />;
      case 'trend': return <TrendChart data={dashboard.trend} />;
      case 'announcements': return <AnnouncementList items={dashboard.announcements} />;
      case 'stats': return <StatsRow stats={dashboard.stats} linked={dashboard.can_view_tickets} />;
    }
  };
  return <div className={`flex w-full min-w-0 flex-col gap-4 pb-6 ${surface.className}`} style={surface.style}>
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="min-w-0">
        {editing
          ? <Input aria-label="门户标题" maxLength={60} value={draft?.title} onChange={event => update({ title: event.target.value })} className="w-64" />
          : <h1 className="m-0 text-base font-semibold leading-normal text-[var(--color-text-1)]">{current.title}</h1>}
        {editing
          ? <Input aria-label="欢迎文案" maxLength={160} value={draft?.subtitle} onChange={event => update({ subtitle: event.target.value })} className="mt-2 w-80" placeholder="欢迎文案，可留空" />
          : current.subtitle.trim() ? <p className="mb-0 mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-[var(--color-text-3)]">{current.subtitle}</p> : null}
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Input aria-label="搜索服务" allowClear prefix={<SearchOutlined className="text-[var(--color-text-3)]" />} placeholder="搜索服务名称、描述或流程" className="w-60" value={search} onChange={event => onSearch(event.target.value)} />
        {!editing && <Button aria-label="刷新门户" icon={<ReloadOutlined />} onClick={onRefresh} />}
        {portal.can_manage && !editing && <Link href="/itsm/portal/services"><Button icon={<SettingOutlined />}>管理服务</Button></Link>}
        {portal.can_manage && !editing && <Button icon={<EditOutlined />} onClick={() => { setSettingsOpen(false); onEdit(); }}>编排门户</Button>}
        {editing && <>
          <Button className="portal-no-drag" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(open => !open)}>门户设置</Button>
          <Dropdown disabled={!missing.length} trigger={['click']} menu={{ items: missing.map(type => ({ key: type, label: widgetNames[type] })), onClick: ({ key }) => draft && updateWidgets([...draft.widgets, placeWidget(draft.widgets, key as WidgetType)]) }}>
            <Button icon={<PlusOutlined />} disabled={!missing.length}>添加组件</Button>
          </Dropdown>
          <Button disabled={busy} onClick={() => { setSettingsOpen(false); onCancel(); }}>取消编辑</Button>
          <Button type="primary" loading={busy} onClick={onPublish}>发布布局</Button>
        </>}
      </div>
    </header>
    {editing && settingsOpen && <section aria-label="门户设置" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-[var(--color-text-2)]">背景
          <Select aria-label="背景样式" className="mt-2 block w-40" value={LEGACY_BACKGROUNDS.includes(current.background as typeof LEGACY_BACKGROUNDS[number]) ? current.background : (current.background.startsWith('data:image/') ? 'custom' : current.background || '')} options={[...backgroundOptions, ...(current.background.startsWith('data:image/') ? [{ value: 'custom', label: '自定义图片' }] : [])]} onChange={value => update({ background: value === 'custom' ? current.background : value })} />
        </label>
        <label className="flex h-8 cursor-pointer items-center rounded-md border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-1)]">上传图片
          <input aria-label="上传背景图" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onUpload(file); }} />
        </label>
        <span className="pb-1 text-xs text-[var(--color-text-3)]">PNG / JPEG / WebP，最大 1 MB。背景铺在内容区后面。</span>
      </div>
    </section>}
    <div ref={canvas} className="w-full min-w-0">
      {current.widgets.length ? <PortalCanvas widgets={current.widgets} editing={editing} onGeometry={updateWidgets}>
        {widget => <WidgetFrame type={widget.type} editing={editing} onRemove={() => draft && updateWidgets(draft.widgets.filter(item => item.type !== widget.type))} onFit={() => fit(widget.type)} extra={<>
          {widget.type === 'services' && <CatalogFilter portal={portal} value={catalog} className="w-40" size="small" onChange={value => setCatalog(value)} />}
          {viewAll(widget.type)}
        </>}>{body(widget.type)}</WidgetFrame>}
      </PortalCanvas> : <p className="m-0 text-xs text-[var(--color-text-3)]">暂无工作台组件</p>}
    </div>
  </div>;
}
