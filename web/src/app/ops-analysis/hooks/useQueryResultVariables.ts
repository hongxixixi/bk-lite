import { useEffect, useMemo, useState } from 'react';
import { useDataSourceApi } from '@/app/ops-analysis/api/dataSource';
import type { DatasourceItem } from '@/app/ops-analysis/types/dataSource';
import type { FilterValue, UnifiedFilterDefinition } from '@/app/ops-analysis/types/dashBoard';
import {
  readQueryResultVariables,
  resolveQueryResultVariables,
  type QueryResultResolveStatus,
  type QueryResultVariable,
} from '@/app/ops-analysis/utils/queryResultVariable';
import { buildWidgetRequestParams } from '@/app/ops-analysis/utils/widgetDataTransform';

const EMPTY_STATUS: Record<string, QueryResultResolveStatus> = {};

export const useQueryResultVariables = ({
  variables,
  filterValues,
  filterDefinitions,
  findDataSource,
  reloadToken = 0,
}: {
  variables?: QueryResultVariable[] | unknown;
  filterValues?: Record<string, FilterValue>;
  filterDefinitions?: UnifiedFilterDefinition[];
  findDataSource: (dataSource?: string | number) => DatasourceItem | undefined;
  reloadToken?: string | number;
}) => {
  const { getSourceDataByApiId } = useDataSourceApi();
  const parsed = useMemo(
    () => readQueryResultVariables(variables),
    [variables],
  );
  const [values, setValues] = useState<Record<string, unknown[]>>({});
  const [status, setStatus] = useState(EMPTY_STATUS);
  const signature = useMemo(
    () => JSON.stringify({
      variables: parsed,
      filterValues: filterValues || {},
      filters: (filterDefinitions || []).map((item) => [item.id, item.key, item.enabled]),
      reloadToken,
    }),
    [filterDefinitions, filterValues, parsed, reloadToken],
  );

  useEffect(() => {
    if (!parsed.length) {
      setValues({});
      setStatus(EMPTY_STATUS);
      return undefined;
    }
    let cancelled = false;
    void resolveQueryResultVariables({
      variables: parsed,
      resolveRequest: (variable, queryResultValues) => {
        const dataSource = findDataSource(variable.dataSource);
        return buildWidgetRequestParams({
          config: { dataSource: variable.dataSource, dataSourceParams: variable.params },
          dataSource,
          unifiedFilterValues: filterValues,
          filterDefinitions,
          queryResultValues,
        });
      },
      fetchPage: async (variable, params) => {
        const dataSource = findDataSource(variable.dataSource);
        const id = typeof dataSource?.id === 'number'
          ? dataSource.id
          : (typeof variable.dataSource === 'number' ? variable.dataSource : Number(variable.dataSource));
        if (!Number.isFinite(id)) throw new Error('missing datasource');
        const result = await getSourceDataByApiId(id, params, { suppressErrorNotification: true });
        return result.data;
      },
    }).then((resolved) => {
      if (cancelled) return;
      setValues(resolved.values);
      setStatus(resolved.status);
    }).catch(() => {
      if (cancelled) return;
      setValues({});
      setStatus(EMPTY_STATUS);
    });
    return () => {
      cancelled = true;
    };
  }, [filterDefinitions, filterValues, findDataSource, getSourceDataByApiId, parsed, signature]);

  return { variables: parsed, values, status };
};
