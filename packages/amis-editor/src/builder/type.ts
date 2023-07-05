/**
 * @file type.ts
 * @desc builder 相关声明
 */

import {DSFeature} from './constants';
import type {BaseApiObject} from 'amis-core';

export interface DSField {
  value: string;
  label: string;
  [propKey: string]: any;
}

/** 数据源字段集合 */
export interface DSFieldGroup {
  value: string;
  label: string;
  children: DSField[];
  [propKey: string]: any;
}

export type DSFeatureType = keyof typeof DSFeature;

export type GenericSchema = Record<string, any>;

export interface ScaffoldField {
  /** 标题 */
  label: string;
  /** 字段名 */
  name: string;
  /** 展示控件类型 */
  displayType: string;
  /** 输入控件类型 */
  inputType: string;
  typeKey?: string;
  /** 是否启用 */
  checked?: boolean;
}

/** 表单操作 */
export type FormOperatorValue = 'cancel' | 'reset' | 'submit';

/** 表单操作按钮 */
export interface FormOperator {
  label: string;
  value: FormOperatorValue;
  order: number;
  schema: Record<string, any>;
}

export interface ScaffoldConfig {
  /** 数据源类型 */
  dsType: string;
  /** Form功能场景 */
  feat?: DSFeatureType;
  /** CRUD应用场景 */
  feats?: DSFeatureType[];
  /** 表单初始化接口 */
  initApi?: string | BaseApiObject;
  /** 表格 list 接口 */
  listApi?: string | BaseApiObject;
  viewApi?: string | BaseApiObject;
  editApi?: string | BaseApiObject;
  bulkEditApi?: string | BaseApiObject;
  deleteApi?: string | BaseApiObject;
  bulkDeleteApi?: string | BaseApiObject;
  insertApi?: string | BaseApiObject;
  listFields?: ScaffoldField[];
  insertFields?: ScaffoldField[];
  viewFields?: ScaffoldField[];
  editFields?: ScaffoldField[];
  bulkEditFields?: ScaffoldField[];
  fuzzyQueryFields?: ScaffoldField[];
  simpleQueryFields?: ScaffoldField[];
  advancedQueryFields?: ScaffoldField[];
  importFields?: ScaffoldField[];
  exportFields?: ScaffoldField[];
  operators?: FormOperator[];
  /** 表格脚手架时的主键 */
  primaryField?: string;
  /** 是否为重新构建 */
  __rebuild?: boolean;
  /** 重新构建时用户的原始 Schema */
  __pristineSchema?: Record<string, any>;
  [propName: string]: any;
}
