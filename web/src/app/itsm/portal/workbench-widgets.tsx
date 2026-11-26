'use client';

import { AppstoreOutlined, ArrowRightOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { Button, Empty, Pagination, TreeSelect } from 'antd';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useItsmApi } from '../api/useItsmApi';
import { useTranslation } from '@/utils/i18n';
import type { PortalData, PortalService } from '../types';
import type { PortalDashboard, PortalTicket } from './workbench-types';

export function matchesServiceSearch(item: PortalService, search: string) {
  return `${item.name} ${item.description || ''} ${item.workflow_name || ''}`.toLowerCase().includes(search.trim().toLowerCase());
}

export function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  const at = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<mark className="bg-[var(--color-primary-bg-active)] text-inherit">{text.slice(at, at + needle.length)}</mark>{text.slice(at + needle.length)}</>;
}

function QuietEmpty({ children }: { children: ReactNode }) {
  return <p className="m-0 text-xs leading-5 text-[var(--color-text-3)]">{children}</p>;
}

export const SERVICE_GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3';

interface ServiceActions {
  portal: PortalData;
  onFavorite: (id: number) => void;
  pending?: number;
  fromTicketCenter?: boolean;
  onNavigate?: () => void;
}

export function ServiceCards({ items, portal, onFavorite, pending, fromTicketCenter, onNavigate, paginate = false }: ServiceActions & { paginate?: boolean; items: PortalService[] }) {
  const { t } = useTranslation();
  const favorites = new Set(portal.favorites.map(item => item.id));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const current = Math.min(page, Math.max(1, Math.ceil(items.length / pageSize)));
  if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('itsm.serviceBrowser.emptyCards')} />;
  return <><div className={SERVICE_GRID_CLASS}>
    {(paginate ? items.slice((current - 1) * pageSize, current * pageSize) : items).map((item, index) => <div key={item.id} className="group flex gap-3 rounded-xl border border-[var(--color-border)] p-4 transition-shadow hover:shadow-md">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${['bg-blue-50 text-blue-600', 'bg-indigo-50 text-indigo-600', 'bg-cyan-50 text-cyan-600'][index % 3]}`}><AppstoreOutlined /></span>
      <div className="min-w-0 flex-1">
        {portal.can_apply ? <Link href={`/itsm/tickets/new?service_id=${item.id}${fromTicketCenter ? '&from=tickets' : ''}`} onNavigate={onNavigate} className="font-medium text-[var(--color-text-1)] hover:text-[var(--color-primary)]">{item.name}<ArrowRightOutlined aria-hidden className="ml-2 text-xs opacity-0 group-hover:opacity-100" /></Link> : <span className="font-medium">{item.name}</span>}
        <p className="mb-0 mt-2 line-clamp-2 text-xs leading-5 text-[var(--color-text-3)]">{item.description || item.workflow_name || t('itsm.serviceBrowser.description')}</p>
      </div>
      <Button type="text" size="small" aria-label={t(favorites.has(item.id) ? 'itsm.serviceBrowser.unfavoriteService' : 'itsm.serviceBrowser.favoriteService', undefined, { name: item.name })} title={t(favorites.has(item.id) ? 'itsm.serviceBrowser.unfavorite' : 'itsm.portal.favorite')} loading={pending === item.id} disabled={pending !== undefined} icon={favorites.has(item.id) ? <StarFilled className="text-amber-400" /> : <StarOutlined className="text-[var(--color-text-3)]" />} onClick={() => onFavorite(item.id)} />
    </div>)}
  </div>{paginate && items.length > 10 && <Pagination className="mt-4 flex justify-end" current={current} pageSize={pageSize} total={items.length} showSizeChanger pageSizeOptions={[10, 20, 50, 100]} onChange={(next, size) => { setPage(size === pageSize ? next : 1); setPageSize(size); }} />}</>;
}

export function CatalogFilter({ portal, value, onChange, className = 'w-48', size = 'middle' }: { portal: PortalData; value?: number; onChange: (value: number | undefined) => void; className?: string; size?: 'small' | 'middle' }) {
  const { t } = useTranslation();
  return <TreeSelect aria-label={t('itsm.serviceBrowser.filter')} className={className} size={size} allowClear showSearch treeNodeFilterProp="title" treeDataSimpleMode placeholder={t('itsm.serviceBrowser.allCatalogs')} value={value} onChange={next => onChange(next ?? undefined)} treeData={[{ id: 0, pId: null, value: 0, title: t('itsm.serviceBrowser.uncategorized') }, ...portal.catalogs.map(item => ({ id: item.id, pId: item.parent_id, value: item.id, title: item.name }))]} />;
}

export function ServiceBrowser({ portal, search, onFavorite, pending, fromTicketCenter, onNavigate, variant = 'picker', catalog: controlledCatalog, onCatalogChange }: ServiceActions & { search: string; variant?: 'picker' | 'portal'; catalog?: number; onCatalogChange?: (value: number | undefined) => void }) {
  const { t } = useTranslation();
  const [ownedCatalog, setOwnedCatalog] = useState<number | undefined>();
  const catalog = onCatalogChange ? controlledCatalog : ownedCatalog;
  const setCatalog = (value: number | undefined) => (onCatalogChange ? onCatalogChange(value) : setOwnedCatalog(value));
  useEffect(() => { setPage(1); }, [catalog]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { directoryPage } = useItsmApi();
  const [remote, setRemote] = useState<{items: PortalService[]; total: number; page: number; query: string}>();
  const [failure, setFailure] = useState('');
  const [attempt, setAttempt] = useState(0);
  const query = JSON.stringify({ keyword: search.trim(), page: String(page), page_size: String(pageSize), ...(catalog === undefined ? {} : { catalog: String(catalog) }) });
  const needsQuery = portal.service_total !== undefined && (page !== 1 || pageSize !== 10 || !!search.trim() || catalog !== undefined);
  useEffect(() => {
    setFailure('');
    if (!needsQuery) return;
    let active = true;
    const timer = setTimeout(() => {
      void directoryPage(JSON.parse(query)).then(value => {
        if (active) setRemote({...value, query});
      }).catch(() => { if (active) setFailure('目录加载失败'); });
    }, 150);
    return () => { active = false; clearTimeout(timer); };
  }, [needsQuery, query, directoryPage, attempt]);
  const selected = new Set<number>(catalog === undefined ? [] : [catalog]);
  // 包含子目录；循环目录数据也不会使页面卡死。
  for (let i = 0; i < portal.catalogs.length; i++) {
    let added = false;
    portal.catalogs.forEach(item => { if (item.parent_id !== null && selected.has(item.parent_id) && !selected.has(item.id)) { selected.add(item.id); added = true; } });
    if (!added) break;
  }
  const filtered = portal.services.filter(item => (catalog === undefined || (catalog === 0 ? !item.catalog_id : selected.has(item.catalog_id || 0))) && matchesServiceSearch(item, search));
  const result = remote?.query === query ? remote : undefined;
  const total = needsQuery ? result?.total ?? 0 : portal.service_total ?? filtered.length;
  const current = needsQuery ? result?.page ?? page : Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
  const shown = needsQuery ? result?.items ?? [] : filtered.slice((current - 1) * pageSize, current * pageSize);
  const groups = [...new Set(shown.map(item => item.catalog_id))];
  const portalRows = variant === 'portal';
  return <div>
    {!portalRows && <div className="mb-4 flex items-center justify-between gap-3">
      <span className="text-xs text-[var(--color-text-3)]">{t('itsm.serviceBrowser.prompt')}</span>
      <CatalogFilter portal={portal} value={catalog} onChange={value => { setCatalog(value); setPage(1); }} />
    </div>}
    {failure ? <Button onClick={() => setAttempt(value => value + 1)}>{failure}，重试</Button> : needsQuery && !result ? <div role="status">加载中…</div> : !shown.length ? (portalRows ? <QuietEmpty>{search ? t('itsm.serviceBrowser.noMatch') : t('itsm.serviceBrowser.empty')}</QuietEmpty> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={search ? t('itsm.serviceBrowser.noMatch') : t('itsm.serviceBrowser.empty')} />) : groups.map(id => <section key={id || 0} className="mb-4 last:mb-0">
      <h3 className="mb-2 text-xs font-medium text-[var(--color-text-3)]">{portal.catalogs.find(item => item.id === id)?.name || t('itsm.serviceBrowser.fallbackCatalog')}</h3>
      {portalRows
        ? <CatalogRows items={shown.filter(item => item.catalog_id === id)} portal={portal} search={search} onFavorite={onFavorite} pending={pending} fromTicketCenter={fromTicketCenter} onNavigate={onNavigate} />
        : <ServiceCards items={shown.filter(item => item.catalog_id === id)} portal={portal} onFavorite={onFavorite} pending={pending} fromTicketCenter={fromTicketCenter} onNavigate={onNavigate} />}
    </section>)}
    {total > 10 && <Pagination className="mt-4 flex justify-end" current={current} pageSize={pageSize} total={total} showSizeChanger pageSizeOptions={[10, 20, 50, 100]} onChange={(next, size) => { setPage(size === pageSize ? next : 1); setPageSize(size); }} />}
  </div>;
}

const STATUS_TONE: Record<string, string> = {
  success: 'bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-bg))] text-[var(--color-success)]',
  warning: 'bg-[color-mix(in_srgb,var(--color-warning)_18%,var(--color-bg))] text-[var(--color-warning)]',
  primary: 'bg-[var(--color-primary-bg-active)] text-[var(--color-primary)]',
  danger: 'bg-[color-mix(in_srgb,var(--color-fail)_12%,var(--color-bg))] text-[var(--color-fail)]',
  neutral: 'bg-[var(--color-fill-2)] text-[var(--color-text-2)]',
};

export function ticketStatusTone(status: string) {
  if (status.includes('完成')) return 'success';
  if (status.includes('处理') || status.includes('进行')) return 'primary';
  if (status.includes('新')) return 'danger';
  if (status.includes('挂起') || status.includes('待')) return 'warning';
  return 'neutral';
}

export function TicketRows({ items, allowed }: { items: PortalTicket[]; allowed?: boolean }) {
  if (!items.length) return <QuietEmpty>{allowed === false ? '暂无工单查看权限' : '暂无工单'}</QuietEmpty>;
  return <div>{items.map(item => <Link key={item.id} href={`/itsm/tickets/${item.id}`} className="flex items-center gap-3 rounded-md px-1 py-2 hover:bg-[var(--color-fill-1)]">
    <div className="min-w-0 flex-1"><div className="truncate text-sm text-[var(--color-text-1)]">{item.title}</div><div className="mt-0.5 text-xs text-[var(--color-text-3)]">{item.sn}</div></div>
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-normal ${STATUS_TONE[ticketStatusTone(item.status)]}`}>{item.status}</span>
  </Link>)}</div>;
}

export function TrendChart({ data }: { data: PortalDashboard['trend'] }) {
  const max = Math.max(1, ...data.flatMap(item => [item.created, item.finished]));
  const point = (value: number, index: number) => `${36 + index * 424 / Math.max(data.length - 1, 1)},${150 - value / max * 120}`;
  return <div>
    <div className="mb-2 flex gap-4 text-xs text-[var(--color-text-3)]"><span className="text-[var(--theme-color-chart-primary)]">● 新建</span><span className="text-[var(--theme-color-chart-success)]">● 完成</span><span className="ml-auto">近 14 天</span></div>
    <svg viewBox="0 0 480 184" className="h-40 w-full" role="img" aria-label="近十四天新建与完成工单趋势">
      {[0, 0.5, 1].map(ratio => <g key={ratio}><line x1="36" y1={150 - ratio * 120} x2="460" y2={150 - ratio * 120} stroke="var(--color-border)" strokeDasharray="4 4" /><text x="24" y={154 - ratio * 120} textAnchor="end" fontSize="10" fill="var(--color-text-3)">{Math.round(max * ratio)}</text></g>)}
      {(['created', 'finished'] as const).map((key, i) => <g key={key}><polyline fill="none" stroke={i ? 'var(--theme-color-chart-success)' : 'var(--theme-color-chart-primary)'} strokeWidth="2" strokeLinejoin="round" points={data.map((item, index) => point(item[key], index)).join(' ')} />{data.map((item, index) => { const [cx, cy] = point(item[key], index).split(','); return <circle key={item.date} cx={cx} cy={cy} r="3.5" fill={i ? 'var(--theme-color-chart-success)' : 'var(--theme-color-chart-primary)'} tabIndex={0}><title>{item.date}：新建 {item.created}，完成 {item.finished}</title></circle>; })}</g>)}
      {data.filter((_, i) => i % 3 === 0 || i === data.length - 1).map(item => <text key={item.date} x={point(0, data.indexOf(item)).split(',')[0]} y="176" textAnchor="middle" fontSize="10" fill="var(--color-text-3)">{item.date.slice(5)}</text>)}
    </svg>
    <p className="mb-0 text-xs text-[var(--color-text-3)]">完成量按记录的完成时间统计；历史工单未记录完成时间的不计入趋势。</p>
  </div>;
}

function serviceHref(item: PortalService, fromTicketCenter?: boolean) {
  return `/itsm/tickets/new?service_id=${item.id}${fromTicketCenter ? '&from=tickets' : ''}`;
}

function FavoriteStar({ item, portal, pending, onFavorite }: ServiceActions & { item: PortalService }) {
  const { t } = useTranslation();
  const active = portal.favorites.some(favorite => favorite.id === item.id);
  return <Button type="text" size="small" className="portal-no-drag" aria-label={t(active ? 'itsm.serviceBrowser.unfavoriteService' : 'itsm.serviceBrowser.favoriteService', undefined, { name: item.name })} title={t(active ? 'itsm.serviceBrowser.unfavorite' : 'itsm.portal.favorite')} loading={pending === item.id} disabled={pending !== undefined} icon={active ? <StarFilled className="text-[var(--color-warning)]" /> : <StarOutlined className="text-[var(--color-text-3)]" />} onClick={() => onFavorite(item.id)} />;
}

function CatalogRows({ items, portal, search, onFavorite, pending, fromTicketCenter, onNavigate }: ServiceActions & { items: PortalService[]; search: string }) {
  const { t } = useTranslation();
  return <div>{items.map(item => <div key={item.id} className="flex items-start gap-2 py-2">
    <div className="min-w-0 flex-1">
      {portal.can_apply
        ? <Link href={serviceHref(item, fromTicketCenter)} onNavigate={onNavigate} className="text-sm text-[var(--color-text-1)] hover:text-[var(--color-primary)]"><Highlight text={item.name} query={search} /></Link>
        : <span className="text-sm text-[var(--color-text-1)]"><Highlight text={item.name} query={search} /></span>}
      <p className="mb-0 mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-3)]">{item.description || item.workflow_name || t('itsm.serviceBrowser.description')}</p>
    </div>
    <FavoriteStar item={item} portal={portal} pending={pending} onFavorite={onFavorite} />
  </div>)}</div>;
}

export function QuickChips({ items, portal, search, fromTicketCenter, onNavigate }: ServiceActions & { items: PortalService[]; search: string }) {
  const shown = items.filter(item => matchesServiceSearch(item, search));
  if (!shown.length) return <QuietEmpty>{search.trim() ? '未找到匹配的服务' : '暂无服务'}</QuietEmpty>;
  const className = 'inline-flex max-w-full items-center gap-1 rounded-md bg-[var(--color-fill-1)] px-3 py-1.5 text-sm text-[var(--color-text-1)] transition-colors hover:bg-[var(--color-fill-2)]';
  return <div className="flex flex-wrap content-start gap-2">{shown.map(item => {
    const label = <><Highlight text={item.name} query={search} /><ArrowRightOutlined aria-hidden className="text-[10px] text-[var(--color-text-3)]" /></>;
    return portal.can_apply
      ? <Link key={item.id} href={serviceHref(item, fromTicketCenter)} onNavigate={onNavigate} className={className}>{label}</Link>
      : <span key={item.id} className={className}>{label}</span>;
  })}</div>;
}

export function ServiceNameList({ items, portal, search, fromTicketCenter, onNavigate, onFavorite, pending, starred = false }: ServiceActions & { items: PortalService[]; search: string; starred?: boolean }) {
  const shown = items.filter(item => matchesServiceSearch(item, search));
  if (!shown.length) return <QuietEmpty>{search.trim() ? '未找到匹配的服务' : '暂无服务'}</QuietEmpty>;
  return <div>{shown.map(item => <div key={item.id} className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-[var(--color-fill-1)]">
    {portal.can_apply
      ? <Link href={serviceHref(item, fromTicketCenter)} onNavigate={onNavigate} className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-1)] hover:text-[var(--color-primary)]"><Highlight text={item.name} query={search} /></Link>
      : <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-1)]"><Highlight text={item.name} query={search} /></span>}
    {starred && <FavoriteStar item={item} portal={portal} pending={pending} onFavorite={onFavorite} />}
  </div>)}</div>;
}

const STAT_ITEMS = [
  { key: 'total', label: '可见工单', href: '/itsm/tickets', tone: 'text-[var(--color-text-1)]' },
  { key: 'todo', label: '我的待办', href: '/itsm/tickets?tab=mine', tone: 'text-[var(--color-warning)]' },
  { key: 'active', label: '进行中', href: '/itsm/tickets', tone: 'text-[var(--color-primary)]' },
  { key: 'finished', label: '已完成', href: '/itsm/tickets', tone: 'text-[var(--color-success)]' },
] as const;

export function StatsRow({ stats, linked }: { stats: PortalDashboard['stats']; linked?: boolean }) {
  return <div className="@container h-full">
    <div className="grid grid-cols-2 gap-2 @[22rem]:grid-cols-4">
      {STAT_ITEMS.map(item => {
        const body = <><div className="text-xs text-[var(--color-text-3)]">{item.label}</div><div className={`mt-1 text-xl font-semibold tabular-nums leading-none ${item.tone}`}>{stats[item.key]}</div></>;
        return linked
          ? <Link key={item.key} href={item.href} className="rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--color-fill-1)]">{body}</Link>
          : <div key={item.key} className="px-2 py-1.5">{body}</div>;
      })}
    </div>
  </div>;
}

export function AnnouncementList({ items }: { items: PortalDashboard['announcements'] }) {
  if (!items.length) return <QuietEmpty>暂无公告</QuietEmpty>;
  return <div>{items.map(item => <details key={item.id} className="border-b border-[var(--color-border-1)] py-2 last:border-b-0">
    <summary className="cursor-pointer text-sm text-[var(--color-text-1)]"><span className="font-medium">{item.title}</span><time className="ml-3 text-xs font-normal text-[var(--color-text-3)]">{String(item.created_at).slice(0, 10)}</time></summary>
    <p className="mb-0 mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--color-text-2)]">{item.content}</p>
  </details>)}</div>;
}
