'use client';

import React from 'react';
import { Select } from 'antd';
import { useTranslation } from '@/utils/i18n';
import { isQueryResultRef, isFilterValueRef } from '@/app/ops-analysis/utils/queryResultVariable';

export interface QueryResultChoice {
  id: string;
  name: string;
}

interface QueryResultValueControlProps {
  value?: unknown;
  onChange?: (value: unknown) => void;
  disabled?: boolean;
  queryResults?: QueryResultChoice[];
  filters?: QueryResultChoice[];
  children: React.ReactElement<{ value?: unknown; onChange?: (value: unknown) => void; disabled?: boolean }>;
}

const QueryResultValueControl: React.FC<QueryResultValueControlProps> = ({
  value,
  onChange,
  disabled = false,
  queryResults = [],
  filters = [],
  children,
}) => {
  const { t } = useTranslation();
  if (!queryResults.length && !filters.length) {
    return React.cloneElement(children, { value, onChange, disabled });
  }

  const selected = isQueryResultRef(value)
    ? `query:${value.queryRef}`
    : (isFilterValueRef(value) ? `filter:${value.ref}` : undefined);

  return (
    <div className="flex w-full flex-col gap-1">
      <Select
        allowClear
        disabled={disabled}
        placeholder={t('dashboard.queryResultRef', '引用查询结果或筛选')}
        value={selected}
        options={[
          ...queryResults.map((item) => ({
            label: t('dashboard.queryResultChoice', '查询结果 · {name}', { name: item.name }),
            value: `query:${item.id}`,
          })),
          ...filters.map((item) => ({
            label: t('dashboard.filterValueChoice', '筛选 · {name}', { name: item.name }),
            value: `filter:${item.id}`,
          })),
        ]}
        onChange={(next) => {
          if (!next) {
            onChange?.(undefined);
            return;
          }
          if (next.startsWith('query:')) onChange?.({ queryRef: next.slice('query:'.length) });
          else onChange?.({ ref: next.slice('filter:'.length) });
        }}
      />
      {selected ? null : React.cloneElement(children, { value, onChange, disabled })}
    </div>
  );
};

export default QueryResultValueControl;
