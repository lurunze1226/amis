/**
 * @file CRUDToolbarControl
 * @desc 顶部工具栏控件
 */

import React from 'react';
import {findDOMNode} from 'react-dom';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import uniq from 'lodash/uniq';
import {FormItem, Button, Icon, toast, Spinner, autobind} from 'amis';
import {findTreeAll} from 'amis-core';
import {JSONPipeIn} from 'amis-editor-core';

import {DSFeature, DSFeatureType, DSFeatureEnum} from '../../builder';
import {deepRemove} from '../../plugin/CRUD2/utils';

import type {FormControlProps} from 'amis';
import type {EditorNodeType} from 'amis-editor-core';
import type {ColumnSchema} from 'amis/lib/renderers/Table2';
import type {DSBuilderInterface} from '../../builder';

type ActionValue = Extract<DSFeatureType, 'Insert' | 'BulkEdit' | 'BulkDelete'>;

interface Option {
  label: string;
  value: ActionValue;
  nodeId: string;
  /** 原始结构 */
  pristine: Record<string, any>;
  node?: EditorNodeType;
}

export interface CRUDToolbarControlProps extends FormControlProps {
  /** CRUD 节点的 ID */
  nodeId: string;
  builder: DSBuilderInterface;
}

export interface CRUDToolbarControlState {
  options: Option[];
  loading: boolean;
}

export class CRUDToolbarControl extends React.Component<
  CRUDToolbarControlProps,
  CRUDToolbarControlState
> {
  drag?: HTMLElement | null;

  dom?: HTMLElement;

  collection: ActionValue[] = ['Insert', 'BulkEdit', 'BulkDelete'];

  constructor(props: CRUDToolbarControlProps) {
    super(props);

    this.state = {
      options: [],
      loading: false
    };
  }

  componentDidMount(): void {
    this.dom = findDOMNode(this) as HTMLElement;
    const actions = this.getActions(this.props);
    this.initOptions(actions);
  }

  componentDidUpdate(prevProps: Readonly<CRUDToolbarControlProps>): void {
    if (prevProps.data.headerToolbar !== this.props.data.headerToolbar) {
      const actions = this.getActions(this.props);
      this.initOptions(actions);
    }
  }

  getActions(props: CRUDToolbarControlProps) {
    const {manager, nodeId} = props;
    const store = manager.store;
    const node: EditorNodeType = store.getNodeById(nodeId);
    const actions = findTreeAll(node.children, item =>
      ['Insert', 'BulkEdit', 'BulkDelete'].includes(item.schema.behavior)
    ) as unknown as EditorNodeType[];

    return actions;
  }

  initOptions(actions: EditorNodeType[]) {
    if (!actions || !actions.length) {
      return;
    }

    const options = actions.map(node => {
      const schema = node.schema;
      const behavior = schema.behavior as ActionValue;

      return {
        label: DSFeature[behavior].label,
        value: behavior,
        nodeId: schema.$$id,
        node: node,
        pristine: node.schema
      };
    });

    this.setState({options});
  }

  @autobind
  handleEdit(item: Option) {
    const {manager} = this.props;

    if (!item.nodeId) {
      toast.warning(`未找到工具栏中对应操作「${item.label}」`);
      return;
    }

    manager.setActiveId(item.nodeId);
  }

  /** 添加列 */
  @autobind
  async handleAddAction(type: ActionValue) {
    this.setState({loading: true});
    const {onBulkChange, data: ctx, nodeId, manager, builder} = this.props;
    const options = this.state.options.concat();
    const node = manager.store.getNodeById(nodeId);
    const CRUDSchemaID = node?.schema?.id;
    let scaffold: any;

    switch (type) {
      case 'Insert':
        scaffold = builder.buildInsertSchema({
          feat: DSFeatureEnum.Insert,
          renderer: 'crud',
          inScaffold: false,
          schema: ctx,
          scaffoldConfig: {
            insertFields: (ctx?.columns ?? [])
              .filter((item: ColumnSchema) => item.type !== 'operation')
              .map((item: ColumnSchema) => ({
                inputType: item.type ?? 'input-text',
                name: item.name,
                label: item.title
              })),
            insertApi: ''
          }
        });
        break;
      case 'BulkEdit':
        scaffold = builder.buildBulkEditSchema({
          feat: DSFeatureEnum.BulkEdit,
          renderer: 'crud',
          inScaffold: false,
          schema: ctx,
          scaffoldConfig: {
            bulkEditFields: (ctx?.columns ?? [])
              .filter((item: ColumnSchema) => item.type !== 'operation')
              .map((item: ColumnSchema) => ({
                inputType: item.type ?? 'input-text',
                name: item.name,
                label: item.title
              })),
            bulkEdit: ''
          }
        });
        break;
      case 'BulkDelete':
        scaffold = builder.buildCRUDBulkDeleteSchema(
          {
            feat: DSFeatureEnum.BulkDelete,
            renderer: 'crud',
            inScaffold: false,
            schema: ctx,
            scaffoldConfig: {
              bulkDeleteApi: ''
            }
          },
          CRUDSchemaID
        );
        break;
    }

    if (!scaffold) {
      this.setState({loading: false});
      return;
    }

    const headerToolbarSchema = cloneDeep(ctx.headerToolbar);
    const actionSchema = JSONPipeIn({...scaffold});

    options.push({
      label: DSFeature[type].label,
      value: type,
      nodeId: actionSchema.$$id,
      pristine: actionSchema
    });

    this.setState({options, loading: false}, () => {
      const target = headerToolbarSchema?.[0]?.items?.[0]?.body;

      if (target && Array.isArray(target)) {
        target.push(actionSchema);
      } else {
        headerToolbarSchema.unshift(actionSchema);
      }
      onBulkChange?.({headerToolbar: headerToolbarSchema});
    });
  }

  @autobind
  async handleDelete(option: Option, index: number) {
    const {env, data: ctx, onBulkChange} = this.props;
    const options = this.state.options;
    const confirmed = await env.confirm(
      `确定要删除工具栏中「${option.label}」吗？`
    );

    const headerToolbarSchema = cloneDeep(ctx.headerToolbar);

    if (confirmed) {
      const marked = deepRemove(
        headerToolbarSchema,
        item => item.behavior === option.value
      );

      if (marked) {
        options.splice(index, 1);

        this.setState({options}, () => {
          onBulkChange?.({headerToolbar: headerToolbarSchema});
        });
      }
    }
  }

  @autobind
  renderOption(item: Option, index: number) {
    const {classnames: cx} = this.props;

    return (
      <li key={index} className={cx('ae-CRUDConfigControl-list-item')}>
        <div className={cx('ae-CRUDConfigControl-list-item-info')}>
          <span>{item.label}</span>
        </div>

        <div className={cx('ae-CRUDConfigControl-list-item-actions')}>
          <Button
            level="link"
            size="sm"
            tooltip={{
              content: '去编辑',
              tooltipTheme: 'dark',
              style: {fontSize: '12px'}
            }}
            onClick={() => this.handleEdit(item)}
          >
            <Icon icon="column-setting" className="icon" />
          </Button>
          <Button
            level="link"
            size="sm"
            onClick={() => this.handleDelete(item, index)}
          >
            <Icon icon="column-delete" className="icon" />
          </Button>
        </div>
      </li>
    );
  }

  renderHeader() {
    const {classnames: cx, render, env} = this.props;
    const options = this.state.options;
    const actions = this.collection.concat();

    options.forEach(item => {
      if (actions.includes(item.value)) {
        const idx = actions.indexOf(item.value);
        if (~idx) {
          actions.splice(idx, 1);
        }
      }
    });

    return (
      <header className={cx('ae-CRUDConfigControl-header')}>
        <span className={cx('Form-label')}>工具栏</span>
        {render(
          'crud-toolbar-control-dropdown',
          {
            type: 'dropdown-button',
            closeOnClick: true,
            hideCaret: true,
            level: 'link',
            align: 'right',
            trigger: ['click'],
            popOverContainer:
              env.getModalContainer ?? this.dom ?? document.body,
            icon: 'column-add',
            label: '添加操作',
            className: cx('ae-CRUDConfigControl-dropdown'),
            disabledTip: {
              content: '暂无可添加操作',
              tooltipTheme: 'dark'
            },
            buttons: actions.map(item => ({
              type: 'button',
              label: DSFeature[item].label,
              onClick: () => this.handleAddAction(item)
            }))
          },
          {disabled: actions.length === 0}
        )}
      </header>
    );
  }

  render() {
    const {classnames: cx, data: ctx} = this.props;
    const {options, loading} = this.state;

    return (
      <div className={cx('ae-CRUDConfigControl')}>
        {loading ? (
          <Spinner
            show
            tip="操作生成中"
            tipPlacement="bottom"
            size="sm"
            className={cx('flex')}
          />
        ) : Array.isArray(options) && options.length > 0 ? (
          <>
            {this.renderHeader()}
            <ul className={cx('ae-CRUDConfigControl-list')}>
              {options.map((item, index) => {
                return this.renderOption(item, index);
              })}
            </ul>
          </>
        ) : (
          <ul className={cx('ae-CRUDConfigControl-list')}>
            <p className={cx(`ae-CRUDConfigControl-placeholder`)}>暂无数据</p>
          </ul>
        )}
      </div>
    );
  }
}

@FormItem({
  type: 'ae-crud-toolbar-control',
  renderLabel: false,
  wrap: false
})
export class CRUDToolbarControlRenderer extends CRUDToolbarControl {}
