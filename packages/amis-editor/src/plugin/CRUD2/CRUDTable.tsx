/**
 * @file CRUDTable.tsx
 * @desc 表格模式的 CRUD2
 */

import React from 'react';
import {autobind} from 'amis';
import {
  EditorManager,
  JSONPipeIn,
  BuildPanelEventContext,
  EditorNodeType,
  registerEditorPlugin
} from 'amis-editor-core';
import {DSBuilder, DSBuilderManager, DSFeatureEnum} from '../../builder';
import {Table2RenderereEvent, Table2RendererAction} from '../Table2';
import {BaseCRUDPlugin} from './BaseCRUD';

export class CRUDTablePlugin extends BaseCRUDPlugin {
  static id = 'TableCRUDPlugin';

  panelJustify = true;

  multifactor = true;

  isBaseComponent = true;

  description =
    '用来实现对数据的增删改查，用来展示表格数据，可以配置列信息，然后关联数据便能完成展示。支持嵌套、超级表头、列固定、表头固顶、合并单元格等等。';

  order = -950;

  $schema = '/schemas/CRUD2TableSchema.json';

  docLink = '/amis/zh-CN/components/crud2';

  previewSchema: Record<string, any> = this.generatePreviewSchema('table2');

  scaffold: any = this.generateScaffold('table2');

  constructor(manager: EditorManager) {
    super(manager, Table2RenderereEvent, Table2RendererAction);
    this.dsManager = new DSBuilderManager(manager);
  }

  /** 非实体数据源走默认构建 */
  panelBodyCreator = (context: BuildPanelEventContext) => {
    const baseCRUDEditorPanel = this.baseCRUDPanelBody(context, {
      /** 列配置 */
      columns: this.renderColumnsControl,
      /** 工具栏配置 */
      toolbar: this.renderToolbarCollapse,
      /** 搜索栏 */
      filters: this.renderFiltersCollapse
    });

    return baseCRUDEditorPanel;
  };

  @autobind
  renderColumnsControl(context: BuildPanelEventContext) {
    const builder = this.dsManager.getBuilderBySchema(context.node.schema);

    return {
      title: '列设置',
      order: 5,
      body: [
        {
          type: 'ae-crud-column-control',
          name: 'columns',
          nodeId: context.id,
          builder
        }
      ]
    };
  }

  @autobind
  renderToolbarCollapse(context: BuildPanelEventContext) {
    const builder = this.dsManager.getBuilderBySchema(context.node.schema);

    return {
      order: 20,
      title: '工具栏',
      body: [
        {
          type: 'ae-crud-toolbar-control',
          name: 'headerToolbar',
          nodeId: context.id,
          builder
        }
      ]
    };
  }

  @autobind
  renderFiltersCollapse(context: BuildPanelEventContext) {
    const builder = this.dsManager.getBuilderBySchema(context.node.schema);
    const collection: any[] = [];

    builder.features.forEach(feat => {
      if (/Query$/.test(feat)) {
        collection.push({
          type: 'ae-crud-filters-control',
          name:
            feat === DSFeatureEnum.SimpleQuery
              ? 'filters'
              : feat === DSFeatureEnum.FuzzyQuery
              ? 'headerToolbar'
              : undefined,
          label:
            feat === DSFeatureEnum.SimpleQuery
              ? '简单查询'
              : feat === DSFeatureEnum.AdvancedQuery
              ? '高级查询'
              : '模糊查询',
          nodeId: context.id,
          feat: feat,
          builder
        });
      }
    });

    return collection.length > 0
      ? {
          order: 10,
          title: '搜索设置',
          body: collection
        }
      : undefined;
  }
}

registerEditorPlugin(CRUDTablePlugin);
