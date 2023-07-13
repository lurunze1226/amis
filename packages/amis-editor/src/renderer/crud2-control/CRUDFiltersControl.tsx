/**
 * @file CRUDFiltersControl
 * @desc 搜索控件
 */

import React from 'react';
import {findDOMNode} from 'react-dom';
import cloneDeep from 'lodash/cloneDeep';
import {FormItem, Button, Icon, toast, Switch, Spinner, autobind} from 'amis';

import type {
  DSFeatureType,
  DSBuilderInterface,
  CRUDScaffoldConfig
} from '../../builder';
import type {EditorNodeType} from 'amis-editor-core';
import type {FormControlProps} from 'amis';
import type {ColumnSchema} from 'amis/lib/renderers/Table2';

interface Option {
  label: string;
  value: string;
  nodeId: string;
  node?: EditorNodeType;
  /** 原始结构 */
  pristine: Record<string, any>;
}

interface CRUDFiltersControlProps extends FormControlProps {
  /** CRUD配置面板的数据 */
  data: Record<string, any>;
  /** CRUD 节点的 ID */
  nodeId: string;
  // TODO：暂时支持简单查询先不扩展了
  feat: Extract<DSFeatureType, 'SimpleQuery'>;
  /** 数据源构造器 */
  builder: DSBuilderInterface;
}

interface CRUDFiltersControlState {
  options: Option[];
  loading: boolean;
  checked: boolean;
  /** 目标组件的 Node.id */
  targetNodeId?: string;
}

export class CRUDFiltersControl extends React.Component<
  CRUDFiltersControlProps,
  CRUDFiltersControlState
> {
  dom?: HTMLElement;

  constructor(props: CRUDFiltersControlProps) {
    super(props);
    this.state = {
      options: [],
      loading: false,
      checked: false
    };
  }

  componentDidMount(): void {
    this.dom = findDOMNode(this) as HTMLElement;
    this.initOptions();
  }

  componentDidUpdate(
    prevProps: Readonly<CRUDFiltersControlProps>,
    prevState: Readonly<CRUDFiltersControlState>,
    snapshot?: any
  ): void {
    if (
      prevProps.data.headerToolbar !== this.props.data.headerToolbar ||
      prevProps.data.filter !== this.props.data.filter
    ) {
      this.initOptions();
    }
  }

  @autobind
  async initOptions() {
    const {manager, nodeId} = this.props;
    const store = manager.store;
    const node = store.getNodeById(nodeId);
    const CRUDSchema = node.schema;
    /** TODO: 考虑 filter 数组的场景 */
    const filterSchema = CRUDSchema.filter?.[0] ?? CRUDSchema.filter;
    let options: Option[] = [];
    let targetNodeId: string = filterSchema ? filterSchema.$$id : '';

    this.setState({loading: true});
    (filterSchema?.body ?? []).forEach((formItem: any) => {
      if (
        formItem.type === 'condition-builder' ||
        formItem.behavior === 'AdvancedQuery'
      ) {
        return;
      }

      options.push({
        label:
          typeof formItem.label === 'string'
            ? formItem.label
            : formItem.label?.type === 'tpl' &&
              typeof (formItem.label as any).tpl === 'string'
            ? (formItem.label as any).tpl /** 处理 SchemaObject 的场景 */
            : formItem.name,
        value: formItem.name ?? (formItem as any).key,
        /** 使用$$id用于定位 */
        nodeId: formItem.$$id,
        pristine: formItem
      });
    });

    this.setState({
      options,
      checked: options.length > 0,
      targetNodeId: targetNodeId,
      loading: false
    });
  }

  async updateSimpleQuery(
    enable: boolean,
    feat: Exclude<CRUDFiltersControlProps['feat'], 'FuzzyQuery'>
  ) {
    const {manager, nodeId, builder} = this.props;
    const store = manager.store;
    const CRUDNode = store.getNodeById(nodeId);
    const CRUDSchema = CRUDNode?.schema;
    const CRUDSchemaID = CRUDSchema?.schema?.id;
    const config = await builder.guessCRUDScaffoldConfig({schema: CRUDSchema});
    const filterSchema = cloneDeep(
      Array.isArray(CRUDNode?.schema.filter)
        ? CRUDNode?.schema.filter.find(
            (item: any) => item.behavior && Array.isArray(item.behavior)
          )
        : CRUDNode?.schema.filter
    );

    if (filterSchema) {
      if (enable) {
        const newFilterSchema = builder.buildCRUDFilterSchema(
          {
            renderer: 'crud',
            scaffoldConfig: {
              dsType: CRUDSchema.dsType,
              simpleQueryFields: (CRUDSchema.columns ?? [])
                .filter((item: ColumnSchema) => item.type !== 'operation')
                .map((item: ColumnSchema) => ({
                  type: item.type ?? 'input-text',
                  name: item.name,
                  label: item.title,
                  size: 'full',
                  required: false,
                  behavior: 'SimpleQuery'
                }))
            }
          },
          CRUDSchemaID
        );

        const targetNode = manager.store.getNodeById(filterSchema.$$id);

        if (targetNode) {
          targetNode.updateSchema({...targetNode.schema, ...newFilterSchema});
        }
      } else {
        const targetNode = manager.store.getNodeById(filterSchema.$$id);

        if (targetNode) {
          targetNode.updateSchema({...filterSchema, body: []});
        }
      }
    } else {
      if (enable) {
        /** 没有查询表头新建一个 */
        const filter = builder.buildCRUDFilterSchema({
          renderer: 'crud',
          scaffoldConfig: {
            dsType: CRUDSchema.dsType,
            simpleQueryFields: config.simpleQueryFields ?? []
          }
        });
        const newFilterSchema = cloneDeep(CRUDNode?.schema.filter);
        const isArrayFilter = Array.isArray(newFilterSchema);

        if (isArrayFilter) {
          newFilterSchema.push(filter);
        }

        CRUDNode.updateSchema({
          ...CRUDSchema,
          filter: isArrayFilter ? newFilterSchema : filter
        });
      }
    }
  }

  @autobind
  async handleToggle(checked: boolean) {
    this.setState({loading: true, checked});
    const {feat} = this.props;

    if (feat === 'SimpleQuery') {
      await this.updateSimpleQuery(checked, feat);
    }

    this.setState({loading: false, checked});
  }

  @autobind
  handleEdit(item?: Option) {
    const {manager} = this.props;
    const targetNodeId = item ? item?.nodeId : this.state.targetNodeId;

    if (!targetNodeId) {
      toast.warning(`未找到目标组件`);
      return;
    }

    manager.setActiveId(targetNodeId);
  }

  @autobind
  renderOption(item: Option, index: number) {
    const {classnames: cx, feat} = this.props;

    return (
      <li key={index} className={cx('ae-CRUDConfigControl-list-item')}>
        <div className={cx('ae-CRUDConfigControl-list-item-info')}>
          <span>{item.label}</span>
        </div>

        <div className={cx('ae-CRUDConfigControl-list-item-actions')}>
          {feat === 'SimpleQuery' ? (
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
              <Icon icon="column-setting" className={cx('icon')} />
            </Button>
          ) : null}
        </div>
      </li>
    );
  }

  renderHeader() {
    const {
      classPrefix: ns,
      classnames: cx,
      render,
      env,
      label,
      feat
    } = this.props;
    const {options, checked} = this.state;

    return (
      <header className={cx('ae-CRUDConfigControl-header', 'mb-2')}>
        <span className={cx('Form-label')}>{label}</span>

        <div className={cx('ae-CRUDConfigControl-header-actions')}>
          <Switch
            className={cx('ae-CRUDConfigControl-header-actions-switch')}
            key="switch"
            size="sm"
            classPrefix={ns}
            value={checked}
            disabled={options.length === 0}
            onChange={this.handleToggle}
          />
          <div className={cx('ae-CRUDConfigControl-header-actions-divider')} />
          <Button
            level="link"
            size="sm"
            tooltip={{
              content: '去编辑目标组件',
              tooltipTheme: 'dark',
              style: {fontSize: '12px'}
            }}
            onClick={() => this.handleEdit()}
          >
            <Icon
              icon="share-link"
              className={cx('icon')}
              style={{width: '16px', height: '16px'}}
            />
          </Button>
        </div>
      </header>
    );
  }

  render(): React.ReactNode {
    const {classnames: cx} = this.props;
    const {options, loading} = this.state;

    return (
      <div className={cx('ae-CRUDConfigControl')}>
        {this.renderHeader()}
        <ul className={cx('ae-CRUDConfigControl-list')}>
          {loading ? (
            <Spinner
              show
              tip="字段加载中"
              tipPlacement="bottom"
              size="sm"
              className={cx('flex')}
            />
          ) : Array.isArray(options) && options.length > 0 ? (
            options.map((item, index) => {
              return this.renderOption(item, index);
            })
          ) : (
            <p className={cx(`ae-CRUDConfigControl-placeholder`)}>暂无字段</p>
          )}
        </ul>
      </div>
    );
  }
}

@FormItem({
  type: 'ae-crud-filters-control',
  renderLabel: false,
  wrap: false
})
export class CRUDFiltersControlRenderer extends CRUDFiltersControl {}
