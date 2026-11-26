'use client';

import { Alert, App, Button, Skeleton } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useItsmApi } from '../api/useItsmApi';
import type { PortalData } from '../types';
import { normalizeLayout } from './portal-layout';
import { PortalWorkbench } from './portal-workbench';
import type { PortalDashboard, PortalLayout } from './workbench-types';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function PortalPage() {
  const api = useItsmApi();
  const { message } = App.useApp();
  const fail = (error: unknown) => message.error(error instanceof Error ? error.message : '操作失败，请重试');
  const [portal, setPortal] = useState<PortalData>();
  const [layout, setLayout] = useState<PortalLayout>();
  const [dashboard, setDashboard] = useState<PortalDashboard>();
  const [draft, setDraft] = useState<PortalLayout>();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState<number>();
  const load = useCallback(async () => {
    setError('');
    try {
      const [loadedPortal, loadedLayout, loadedDashboard] = await Promise.all([api.portal(), api.portalLayout(), api.portalDashboard()]);
      const parsed = normalizeLayout(loadedLayout);
      if (!parsed) throw new Error('门户布局无效');
      setPortal(loadedPortal as PortalData);
      setLayout(parsed);
      setDashboard(loadedDashboard as PortalDashboard);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '门户加载失败');
    }
  }, [api.portal, api.portalLayout, api.portalDashboard]);
  useEffect(() => { if (api.ready) void load(); }, [api.ready, load]);
  const favorite = async (id: number) => {
    if (favoriteBusy !== undefined) return;
    setFavoriteBusy(id);
    try {
      await api.toggleFavorite(id);
      setPortal(await api.portal() as PortalData);
    } catch (reason) {
      fail(reason);
    } finally {
      setFavoriteBusy(undefined);
    }
  };
  const publish = async () => {
    if (!draft?.title.trim()) { message.warning('请填写门户标题'); return; }
    setBusy(true);
    try {
      const saved = normalizeLayout(await api.savePortalLayout(draft));
      if (!saved) throw new Error('门户布局无效');
      setLayout(saved);
      setDraft(undefined);
      message.success('门户布局已发布');
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  };
  const upload = (file: File) => {
    if (!draft) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > 1024 * 1024) {
      message.warning('请选择 1 MB 以内的 PNG、JPEG 或 WebP 图片');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraft(value => value ? { ...value, background: String(reader.result) } : value);
    reader.onerror = () => message.error('图片读取失败');
    reader.readAsDataURL(file);
  };
  if (error) return <Alert type="error" message={error} action={<Button onClick={() => void load()}>重试</Button>} />;
  if (!portal || !layout || !dashboard) return <Skeleton active paragraph={{ rows: 10 }} />;
  return <PortalWorkbench
    portal={portal}
    layout={layout}
    dashboard={dashboard}
    draft={draft}
    search={search}
    busy={busy}
    favoriteBusy={favoriteBusy}
    onSearch={setSearch}
    onFavorite={id => void favorite(id)}
    onEdit={() => { setSearch(''); setDraft(structuredClone(layout)); }}
    onCancel={() => setDraft(undefined)}
    onPublish={() => void publish()}
    onDraft={setDraft}
    onUpload={upload}
    onRefresh={() => void load()}
  />;
}
