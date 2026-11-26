'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import './portal-canvas.css';
import { PORTAL_COLUMNS, PORTAL_GAP_PX, PORTAL_ROW_PX, heightForContent } from './portal-layout';
import type { PortalWidget } from './workbench-types';

interface GridNode {
  id?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

function readGeometry(grid: GridStack, widgets: PortalWidget[]) {
  const nodes = new Map<string, GridNode>();
  grid.getGridItems().forEach(element => {
    const node = (element as HTMLElement & { gridstackNode?: GridNode }).gridstackNode;
    if (node?.id) nodes.set(String(node.id), node);
  });
  return widgets.map(item => {
    const node = nodes.get(item.type);
    if (!node || node.x == null || node.y == null || node.w == null || node.h == null) return item;
    return { ...item, x: node.x, y: node.y, w: node.w, h: node.h };
  });
}

function sameGeometry(left: PortalWidget[], right: PortalWidget[]) {
  return left.length === right.length && left.every((item, index) => {
    const other = right[index];
    return other && item.type === other.type && item.x === other.x && item.y === other.y && item.w === other.w && item.h === other.h;
  });
}

function applyCssGrid(element: HTMLElement) {
  element.style.display = 'grid';
  element.style.gridTemplateColumns = `repeat(${PORTAL_COLUMNS}, minmax(0, 1fr))`;
  element.style.gridAutoRows = `${PORTAL_ROW_PX}px`;
  element.style.gap = `${PORTAL_GAP_PX}px`;
  element.querySelectorAll<HTMLElement>(':scope > .grid-stack-item').forEach(item => {
    const x = Number(item.getAttribute('gs-x'));
    const y = Number(item.getAttribute('gs-y'));
    const w = Number(item.getAttribute('gs-w'));
    const h = Number(item.getAttribute('gs-h'));
    item.style.gridColumn = `${x + 1} / span ${w}`;
    item.style.gridRow = `${y + 1} / span ${h}`;
    item.style.minHeight = '0';
  });
}

export function measureWidgetHeight(root: HTMLElement, type: string) {
  const body = root.querySelector<HTMLElement>(`[data-widget="${type}"] .portal-widget-body`);
  const frame = root.querySelector<HTMLElement>(`[data-widget="${type}"] section`);
  if (!body || !frame) return undefined;
  const content = body.firstElementChild instanceof HTMLElement ? body.firstElementChild : body;
  return heightForContent(content.scrollHeight, frame.offsetHeight - body.clientHeight);
}

export function PortalCanvas({ widgets, editing, onGeometry, children }: {
  widgets: PortalWidget[];
  editing: boolean;
  onGeometry: (widgets: PortalWidget[]) => void;
  children: (widget: PortalWidget) => ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const onGeometryRef = useRef(onGeometry);
  const widgetsRef = useRef(widgets);
  onGeometryRef.current = onGeometry;
  widgetsRef.current = widgets;
  const signature = `${editing ? 'edit' : 'view'}:${widgets.map(item => `${item.type}@${item.x},${item.y},${item.w},${item.h}`).join('|')}`;

  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    let grid: GridStack | undefined;
    try {
      grid = GridStack.init({
        column: PORTAL_COLUMNS,
        cellHeight: PORTAL_ROW_PX,
        margin: PORTAL_GAP_PX,
        float: true,
        animate: false,
        staticGrid: !editing,
        disableDrag: !editing,
        disableResize: !editing,
        handle: '.portal-drag',
        resizable: { handles: 'e, se, s', autoHide: false },
        draggable: { handle: '.portal-drag', scroll: false, cancel: '.portal-no-drag, input, textarea, a, .ant-select' },
      }, element);
      const commit = () => {
        if (!grid) return;
        const next = readGeometry(grid, widgetsRef.current);
        if (!sameGeometry(widgetsRef.current, next)) onGeometryRef.current(next);
      };
      grid.on('dragstop', commit);
      grid.on('resizestop', commit);
    } catch {
      applyCssGrid(element);
    }
    return () => {
      grid?.destroy(false);
    };
  }, [signature, editing]);

  return <div ref={host} className={`portal-canvas grid-stack ${editing ? 'is-editing' : ''}`}>
    {widgets.map(widget => <div key={widget.type} className="grid-stack-item" data-widget={widget.type} data-h={widget.h} gs-id={widget.type} gs-x={widget.x} gs-y={widget.y} gs-w={widget.w} gs-h={widget.h}>
      <div className="grid-stack-item-content h-full">{children(widget)}</div>
    </div>)}
  </div>;
}
