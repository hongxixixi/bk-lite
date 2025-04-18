import type { TableDataItem } from '@/app/node-manager/types/index';

//配置页面的table的列定义
interface ConfigHookParams {
  configurationClick: (key: string) => void;
  openSub: (key: string, item?: any) => void;
}
interface VariableProps {
  openUerModal: (type: string, form: TableDataItem) => void;
  getFormDataById: (key: string) => TableDataItem;
  delconfirm: (key: string, text: any) => void;
}

//api返回的配置文件列表的类型
interface IConfiglistprops {
  id: string;
  name: string;
  collector_name: string;
  operating_system: string;
  node_count: string;
  config_template?: string;
  collector?: string;
  nodes?: string[];
}

//后端返回的采集器列表
interface CollectorItem {
  id?: string;
  collector_id?: string;
  collector_name?: string;
  configuration_id?: string;
  configuration_name?: string;
  message?: string;
  status?: number;
}

//node展开的数据类型
interface NodeExpanddata {
  key: string;
  name: string;
  filename: string;
  status: number;
  nodeid: string;
}

//更新配置文件的请求
interface updateConfigReq {
  node_ids: string[];
  collector_configuration_id: string;
}

//节点模块返回的数据
interface nodeItemtRes {
  id: string;
  ip: string;
  operating_system: string;
  status: {
    status: string | number;
  };
  [key: string]: any;
}

//节点处理后的数据格式
interface mappedNodeItem {
  key: string;
  ip: string;
  operatingsystem: string;
  sidecar: string;
}

interface ConfigDate {
  key: string;
  name: string;
  collector: string;
  operatingsystem: string;
  nodecount: number;
  configinfo: string;
  nodes: string[]
}

interface SubRef {
  getChildConfig: () => void;
}

interface SubProps { 
  cancel: any, 
  edit: any, 
  nodeData: ConfigDate 
}

interface cloudRegionItem {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface VarSourceItem {
  key: string;
  name: string;
  description: string;
}

interface VarResItem {
  id: string;
  key: string;
  value: string;
  description: string;
}

interface CloudregioncardProps {
  id: number;
  name: string;
  introduction: string;
  [key: string]: any;
}

interface NodeItem {
  id?: string;
  os: string;
  ip: string;
  organizations?: string[];
  username?: string;
  password?: string;
  port?: number;
}

interface ControllerInstallFields {
  id?: number;
  cloud_region_id: number;
  nodes: NodeItem[];
  work_node?: string;
  sidecar_package?: string;
  executor_package?: string;
}

interface ControllerInstallProps {
  cancel: () => void;
  config?: any;
}

export type {
  ConfigHookParams,
  VariableProps,
  IConfiglistprops,
  CollectorItem,
  NodeExpanddata,
  updateConfigReq,
  nodeItemtRes,
  mappedNodeItem,
  ConfigDate,
  SubRef,
  SubProps,
  cloudRegionItem,
  VarSourceItem,
  VarResItem,
  CloudregioncardProps,
  ControllerInstallFields,
  ControllerInstallProps,
  NodeItem,
};
