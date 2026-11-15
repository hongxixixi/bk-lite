import { describe, expect, it, vi } from 'vitest';
import {
  planQueryVariables,
  QueryResultBlockedError,
  resolveQueryResultVariables,
  substituteParamRefs,
  type QueryResultVariable,
} from '@/app/ops-analysis/utils/queryResultVariable';

const variable = (
  id: string,
  deps: string[] = [],
): QueryResultVariable => ({
  id,
  name: id,
  dataSource: 1,
  valueField: 'id',
  params: deps.map((dep) => ({
    name: dep,
    type: 'string',
    filterType: 'fixed',
    value: { queryRef: dep },
  })),
});

describe('query result variables', () => {
  it('substitutes a query result and a filter value', () => {
    const resolved = substituteParamRefs(
      {
        logic: 'AND',
        items: [{ field: 'inst_uuid', op: 'in', value: { queryRef: 'hosts' } }],
        region: { ref: 'cloud_region__string' },
      },
      {
        queryResultValues: { hosts: ['h1', 'h2'] },
        readFilter: () => '12',
      },
    );
    expect(resolved).toEqual({
      logic: 'AND',
      items: [{ field: 'inst_uuid', op: 'in', value: ['h1', 'h2'] }],
      region: '12',
    });
  });

  it('blocks an empty query result instead of omitting the parameter', () => {
    expect(() => substituteParamRefs(
      { queryRef: 'hosts' },
      { queryResultValues: { hosts: [] }, readFilter: () => '12' },
    )).toThrow(QueryResultBlockedError);
  });

  it('blocks a cycle and a chain longer than three', () => {
    const cycle = planQueryVariables([variable('a', ['b']), variable('b', ['a'])]);
    expect(cycle.blocked.a).toBe('cycle');
    expect(cycle.blocked.b).toBe('cycle');

    const deep = planQueryVariables([
      variable('a'),
      variable('b', ['a']),
      variable('c', ['b']),
      variable('d', ['c']),
    ]);
    expect(deep.blocked.d).toBe('depth');
    expect(deep.order.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('pages detail rows and does not page a count query', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const resolved = await resolveQueryResultVariables({
      variables: [
        variable('hosts'),
        { ...variable('assets', ['hosts']), valueField: 'end' },
      ],
      resolveRequest: (item) => (
        item.id === 'hosts'
          ? { analysis_mode: 'detail' }
          : { analysis_mode: 'count', ids: { queryRef: 'hosts' } }
      ),
      fetchPage: async (item, params) => {
        calls.push({ id: item.id, ...params });
        if (item.id === 'hosts') {
          const page = Number(params.page);
          return {
            count: 2,
            page_size: 1,
            items: [{ id: page === 1 ? 'h1' : 'h2' }],
          };
        }
        return { end: 1 };
      },
    });

    expect(resolved.values.hosts).toEqual(['h1', 'h2']);
    expect(resolved.values.assets).toEqual([1]);
    expect(calls.filter((item) => item.id === 'hosts')).toHaveLength(2);
    expect(calls.find((item) => item.id === 'assets')).not.toHaveProperty('page');
  });

  it('does not fetch a variable whose upstream result is empty', async () => {
    const fetchPage = vi.fn(async () => ({ items: [], count: 0, page_size: 100 }));
    const resolved = await resolveQueryResultVariables({
      variables: [variable('hosts'), variable('assets', ['hosts'])],
      resolveRequest: () => ({ analysis_mode: 'detail' }),
      fetchPage,
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(resolved.status.assets).toEqual({ state: 'blocked', reason: 'empty' });
    expect(resolved.values.assets).toEqual([]);
  });
});
