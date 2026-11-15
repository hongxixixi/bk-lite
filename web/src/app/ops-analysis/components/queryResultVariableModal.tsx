'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select } from 'antd';
import { useTranslation } from '@/utils/i18n';
import type { DatasourceItem, ParamItem } from '@/app/ops-analysis/types/dataSource';
import type { UnifiedFilterDefinition } from '@/app/ops-analysis/types/dashBoard';
import DataSourceParamsConfig from '@/app/ops-analysis/components/paramsConfig';
import { processDataSourceFormParamsForSubmit } from '@/app/ops-analysis/utils/dataSourceFormParams';
import {
  planQueryVariables,
  type QueryResultResolveStatus,
  type QueryResultVariable,
} from '@/app/ops-analysis/utils/queryResultVariable';

const hiddenPaging = (params: ParamItem[] | undefined) => (
  (params || []).filter((param) => param.name !== 'page' && param.name !== 'page_size')
);

interface QueryResultVariableModalProps {
  open: boolean;
  variables: QueryResultVariable[];
  dataSources: DatasourceItem[];
  filters: UnifiedFilterDefinition[];
  status?: Record<string, QueryResultResolveStatus>;
  onCancel: () => void;
  onConfirm: (variables: QueryResultVariable[]) => void;
}

const QueryResultVariableModal: React.FC<QueryResultVariableModalProps> = ({
  open,
  variables,
  dataSources,
  filters,
  status,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<QueryResultVariable[]>(variables);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const dataSourceId = Form.useWatch('dataSource', form);

  useEffect(() => {
    if (!open) return;
    setDraft(variables);
    setEditingId(null);
  }, [open, variables]);

  const selected = dataSources.find((item) => String(item.id) === String(dataSourceId));
  const editableSource = useMemo(() => {
    if (!selected) return undefined;
    return { ...selected, params: hiddenPaging(selected.params) };
  }, [selected]);
  const editing = draft.find((item) => item.id === editingId);
  const otherVariables = draft.filter((item) => item.id !== editingId);

  const startCreate = () => {
    const id = `qv-${Date.now().toString(36)}`;
    form.resetFields();
    form.setFieldsValue({ id, name: '', dataSource: undefined, valueField: '', params: {} });
    setEditingId(id);
  };

  const startEdit = (variable: QueryResultVariable) => {
    const params: Record<string, unknown> = {};
    variable.params.forEach((param) => {
      params[param.name] = param.value;
    });
    form.setFieldsValue({
      id: variable.id,
      name: variable.name,
      dataSource: variable.dataSource,
      valueField: variable.valueField,
      params,
    });
    setEditingId(variable.id);
  };

  const saveEditing = async () => {
    const values = await form.validateFields();
    const source = dataSources.find((item) => String(item.id) === String(values.dataSource));
    const params = processDataSourceFormParamsForSubmit(
      values.params || {},
      hiddenPaging(source?.params),
    );
    const nextVariable: QueryResultVariable = {
      id: values.id,
      name: String(values.name).trim(),
      dataSource: values.dataSource,
      params,
      valueField: String(values.valueField).trim(),
    };
    const next = draft.some((item) => item.id === nextVariable.id)
      ? draft.map((item) => (item.id === nextVariable.id ? nextVariable : item))
      : draft.concat(nextVariable);
    const plan = planQueryVariables(next);
    if (plan.blocked[nextVariable.id]) {
      const reason = plan.blocked[nextVariable.id];
      form.setFields([{
        name: 'name',
        errors: [reason === 'cycle'
          ? t('dashboard.queryResultCycle', '查询结果互相引用，不能保存')
          : reason === 'depth'
            ? t('dashboard.queryResultDepth', '查询结果最多引用 3 级')
            : t('dashboard.queryResultMissing', '引用的查询结果不存在')],
      }]);
      return;
    }
    setDraft(next);
    setEditingId(null);
  };

  return (
    <Modal
      title={t('dashboard.queryResultVariables', '查询结果变量')}
      open={open}
      width={720}
      onCancel={onCancel}
      onOk={() => onConfirm(draft)}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      destroyOnClose
    >
      <p className="mb-3 text-sm text-(--color-text-2)">
        {t(
          'dashboard.queryResultVariablesHint',
          '先跑一条数据源查询，把结果里的一列收成变量。其他参数可以整值引用这一列，也可以引用筛选里已选的值。',
        )}
      </p>
      <div className="mb-3 flex flex-col gap-2">
        {draft.map((variable, index) => {
          const variableStatus = status?.[variable.id];
          return (
            <div
              key={variable.id}
              className="flex items-center justify-between gap-3 rounded-md border border-(--color-border-1) px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-(--color-text-1)">
                  {index + 1}. {variable.name}
                </div>
                <div className="truncate text-xs text-(--color-text-3)">
                  {variable.valueField}
                  {variableStatus?.state === 'truncated'
                    ? t('dashboard.queryResultTruncated', ' · 只取了前 2000 条')
                    : ''}
                  {variableStatus?.state === 'failed'
                    ? t('dashboard.queryResultFailed', ' · 查询失败')
                    : ''}
                  {variableStatus?.reason === 'empty'
                    ? t('dashboard.queryResultEmpty', ' · 上游为空，未继续查询')
                    : ''}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="link" onClick={() => startEdit(variable)}>{t('common.edit')}</Button>
                <Button
                  type="link"
                  danger
                  onClick={() => setDraft(draft.filter((item) => item.id !== variable.id))}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          );
        })}
        <Button onClick={startCreate}>{t('dashboard.addQueryResult', '添加查询结果')}</Button>
      </div>
      {editingId ? (
        <Form form={form} layout="vertical" preserve>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item
            name="name"
            label={t('common.name')}
            rules={[{ required: true, message: t('common.inputTip') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="dataSource"
            label={t('dashboard.dataSource')}
            rules={[{ required: true, message: t('common.selectTip') }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={dataSources.map((item) => ({
                label: item.name || item.rest_api || String(item.id),
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="valueField"
            label={t('dashboard.queryResultField', '取值列')}
            rules={[{ required: true, message: t('common.inputTip') }]}
          >
            {selected?.field_schema?.length ? (
              <Select
                showSearch
                optionFilterProp="label"
                options={selected.field_schema.map((field) => ({
                  label: field.title || field.key,
                  value: field.key,
                }))}
              />
            ) : (
              <Input placeholder="inst_uuid" />
            )}
          </Form.Item>
          {editableSource ? (
            <DataSourceParamsConfig
              selectedDataSource={editableSource}
              includeFilterTypes={['params', 'fixed']}
              queryResults={otherVariables.map((item) => ({ id: item.id, name: item.name }))}
              filterChoices={filters.filter((item) => item.enabled !== false).map((item) => ({
                id: item.id,
                name: item.name || item.key,
              }))}
              globalFilters={filters}
            />
          ) : null}
          <Button type="primary" onClick={() => { void saveEditing(); }}>
            {editing ? t('dashboard.updateQueryResult', '更新这条查询结果') : t('dashboard.saveQueryResult', '加入列表')}
          </Button>
        </Form>
      ) : null}
    </Modal>
  );
};

export default QueryResultVariableModal;
