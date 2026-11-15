import type { ParamItem } from '@/app/ops-analysis/types/dataSource';
import type { FilterValue, UnifiedFilterDefinition } from '@/app/ops-analysis/types/dashBoard';

/** 查询结果变量链最多 3 级（A→B→C）。再往后的一级不执行。 */
export const MAX_QUERY_RESULT_CHAIN = 3;

/** 明细按页收齐。和通用查询每页上限一致。 */
export const QUERY_RESULT_PAGE_SIZE = 100;

/** 单次解析最多翻这么多页，避免一次把全库拉进浏览器。 */
export const QUERY_RESULT_MAX_PAGES = 20;

export interface QueryResultVariable {
  id: string;
  name: string;
  dataSource: string | number;
  params: ParamItem[];
  valueField: string;
}

export type QueryResultBlockReason = 'empty' | 'cycle' | 'depth' | 'missing' | 'failed';

export class QueryResultBlockedError extends Error {
  readonly reason: QueryResultBlockReason;

  constructor(reason: QueryResultBlockReason) {
    super(reason);
    this.name = 'QueryResultBlockedError';
    this.reason = reason;
  }
}

export interface QueryResultPlan {
  order: QueryResultVariable[];
  blocked: Record<string, QueryResultBlockReason>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const isQueryResultRef = (value: unknown): value is { queryRef: string } => (
  isRecord(value)
  && typeof value.queryRef === 'string'
  && value.queryRef.trim() !== ''
  && Object.keys(value).length === 1
);

export const isFilterValueRef = (value: unknown): value is { ref: string } => (
  isRecord(value)
  && typeof value.ref === 'string'
  && value.ref.trim() !== ''
  && Object.keys(value).length === 1
);

const walk = (value: unknown, visit: (value: unknown) => void) => {
  visit(value);
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visit));
    return;
  }
  if (!isRecord(value) || isQueryResultRef(value) || isFilterValueRef(value)) return;
  Object.values(value).forEach((item) => walk(item, visit));
};

export const queryResultRefsIn = (value: unknown): string[] => {
  const refs: string[] = [];
  walk(value, (item) => {
    if (isQueryResultRef(item)) refs.push(item.queryRef);
  });
  return refs;
};

const variableDeps = (variable: QueryResultVariable): string[] => {
  const refs = new Set<string>();
  variable.params.forEach((param) => {
    queryResultRefsIn(param.value).forEach((ref) => refs.add(ref));
  });
  return [...refs];
};

export const planQueryVariables = (
  variables: QueryResultVariable[],
): QueryResultPlan => {
  const byId = new Map(variables.map((item) => [item.id, item]));
  const blocked: Record<string, QueryResultBlockReason> = {};
  const depthOf = new Map<string, number>();

  const depth = (id: string, stack: string[]): number => {
    const cached = depthOf.get(id);
    if (cached !== undefined) return cached;
    if (stack.includes(id)) {
      stack.slice(stack.indexOf(id)).concat(id).forEach((item) => {
        blocked[item] = 'cycle';
      });
      return MAX_QUERY_RESULT_CHAIN + 1;
    }
    const variable = byId.get(id);
    if (!variable) return 1;
    const deps = variableDeps(variable);
    if (deps.some((dep) => !byId.has(dep))) {
      blocked[id] = blocked[id] || 'missing';
    }
    const next = deps.reduce(
      (max, dep) => Math.max(max, depth(dep, stack.concat(id))),
      0,
    ) + 1;
    if (next > MAX_QUERY_RESULT_CHAIN) blocked[id] = blocked[id] || 'depth';
    depthOf.set(id, next);
    return next;
  };

  variables.forEach((item) => depth(item.id, []));

  const pending = variables.filter((item) => !blocked[item.id]);
  const order: QueryResultVariable[] = [];
  const placed = new Set<string>();
  while (order.length < pending.length) {
    const next = pending.find((item) => (
      !placed.has(item.id)
      && variableDeps(item).every((dep) => !byId.has(dep) || placed.has(dep) || blocked[dep])
    ));
    if (!next) break;
    order.push(next);
    placed.add(next.id);
  }
  return { order, blocked };
};

const isEmptyFilterValue = (value: unknown): boolean => (
  value === null
  || value === undefined
  || value === ''
  || (Array.isArray(value) && value.length === 0)
);

export const readAppliedFilterValue = (
  ref: string,
  definitions: UnifiedFilterDefinition[] | undefined,
  values: Record<string, FilterValue> | undefined,
): unknown => {
  const enabled = (definitions || []).filter((item) => item.enabled !== false);
  const byId = enabled.find((item) => item.id === ref);
  if (byId) return values?.[byId.id];
  const byKey = enabled.filter((item) => item.key === ref);
  if (byKey.length === 1) return values?.[byKey[0].id];
  return undefined;
};

export const substituteParamRefs = (
  value: unknown,
  context: {
    queryResultValues: Record<string, unknown[]>;
    readFilter: (ref: string) => unknown;
  },
): unknown => {
  if (isQueryResultRef(value)) {
    const list = context.queryResultValues[value.queryRef];
    if (!Array.isArray(list) || list.length === 0) {
      throw new QueryResultBlockedError(list ? 'empty' : 'missing');
    }
    return list;
  }
  if (isFilterValueRef(value)) {
    const resolved = context.readFilter(value.ref);
    if (isEmptyFilterValue(resolved)) throw new QueryResultBlockedError('empty');
    return resolved;
  }
  if (Array.isArray(value)) {
    return value.map((item) => substituteParamRefs(item, context));
  }
  if (!isRecord(value)) return value;
  const next: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, item]) => {
    next[key] = substituteParamRefs(item, context);
  });
  return next;
};

export const readQueryResultVariables = (value: unknown): QueryResultVariable[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const valueField = typeof item.valueField === 'string' ? item.valueField.trim() : '';
    const dataSource = item.dataSource;
    if (!id || !name || !valueField) return [];
    if (typeof dataSource !== 'string' && typeof dataSource !== 'number') return [];
    const params = Array.isArray(item.params) ? item.params as ParamItem[] : [];
    return [{ id, name, dataSource, params, valueField }];
  });
};

const rowsOf = (data: unknown): Record<string, unknown>[] => {
  if (Array.isArray(data)) {
    return data.filter((item): item is Record<string, unknown> => isRecord(item));
  }
  if (!isRecord(data)) return [];
  if (Array.isArray(data.items)) {
    return data.items.filter((item): item is Record<string, unknown> => isRecord(item));
  }
  return [data];
};

const analysisModeOf = (params: Record<string, unknown>): string => (
  typeof params.analysis_mode === 'string' ? params.analysis_mode : ''
);

export interface QueryResultResolveStatus {
  state: 'ready' | 'truncated' | 'blocked' | 'failed';
  reason?: QueryResultBlockReason;
}

export interface ResolvedQueryResults {
  values: Record<string, unknown[]>;
  status: Record<string, QueryResultResolveStatus>;
}

const collectField = (
  rows: Record<string, unknown>[],
  valueField: string,
  seen: Set<string>,
  values: unknown[],
) => {
  rows.forEach((row) => {
    const field = row[valueField];
    if (field === null || field === undefined || field === '') return;
    const key = typeof field === 'object' ? JSON.stringify(field) : String(field);
    if (seen.has(key)) return;
    seen.add(key);
    values.push(field);
  });
};

export const resolveQueryResultVariables = async ({
  variables,
  resolveRequest,
  fetchPage,
}: {
  variables: QueryResultVariable[];
  resolveRequest: (
    variable: QueryResultVariable,
    queryResultValues: Record<string, unknown[]>,
  ) => Record<string, unknown>;
  fetchPage: (
    variable: QueryResultVariable,
    params: Record<string, unknown>,
  ) => Promise<unknown>;
}): Promise<ResolvedQueryResults> => {
  const plan = planQueryVariables(variables);
  const values: Record<string, unknown[]> = {};
  const status: Record<string, QueryResultResolveStatus> = {};
  Object.entries(plan.blocked).forEach(([id, reason]) => {
    values[id] = [];
    status[id] = { state: 'blocked', reason };
  });

  for (const variable of plan.order) {
    const upstreamBlocked = variableDeps(variable).some((dep) => status[dep]?.state === 'blocked' || status[dep]?.state === 'failed');
    if (upstreamBlocked) {
      values[variable.id] = [];
      status[variable.id] = { state: 'blocked', reason: 'empty' };
      continue;
    }
    let params: Record<string, unknown>;
    try {
      params = resolveRequest(variable, values);
    } catch (error) {
      values[variable.id] = [];
      status[variable.id] = {
        state: 'blocked',
        reason: error instanceof QueryResultBlockedError ? error.reason : 'failed',
      };
      continue;
    }

    const seen = new Set<string>();
    const collected: unknown[] = [];
    const mode = analysisModeOf(params);
    const paged = mode !== 'count';
    let truncated = false;
    try {
      const pages = paged ? QUERY_RESULT_MAX_PAGES : 1;
      for (let page = 1; page <= pages; page += 1) {
        const request = paged
          ? { ...params, page, page_size: QUERY_RESULT_PAGE_SIZE }
          : params;
        const data = await fetchPage(variable, request);
        const rows = rowsOf(data);
        collectField(rows, variable.valueField, seen, collected);
        if (!paged || !isRecord(data)) break;
        const total = typeof data.count === 'number' ? data.count : rows.length;
        const pageSize = typeof data.page_size === 'number' ? data.page_size : rows.length;
        if (rows.length === 0 || collected.length >= total || rows.length < pageSize) break;
        if (page === pages) truncated = true;
      }
    } catch {
      values[variable.id] = [];
      status[variable.id] = { state: 'failed', reason: 'failed' };
      continue;
    }
    values[variable.id] = collected;
    status[variable.id] = collected.length === 0
      ? { state: 'blocked', reason: 'empty' }
      : { state: truncated ? 'truncated' : 'ready' };
  }

  return { values, status };
};
