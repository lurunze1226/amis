/**
 * @file BaseCRUD
 * @desc CRUD2 配置面板的基类
 */

import React from 'react';
import isFunction from 'lodash/isFunction';
import flattenDeep from 'lodash/flattenDeep';
import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty';
import uniqBy from 'lodash/uniqBy';
import get from 'lodash/get';
import omit from 'lodash/omit';
import intersection from 'lodash/intersection';
import {toast} from 'amis';
import {
  BasePlugin,
  ScaffoldForm,
  EditorManager,
  defaultValue,
  getSchemaTpl,
  tipedLabel,
  EditorNodeType,
  BuildPanelEventContext,
  RendererPluginEvent,
  RendererPluginAction
} from 'amis-editor-core';
import {
  DSBuilder,
  DSBuilderManager,
  DSFeatureEnum,
  DSFeature,
  DSFeatureType
} from '../../builder';
import {
  getEventControlConfig,
  getArgsWrapper
} from '../../renderer/event-control/helper';
import {CRUD2Schema} from 'amis/lib/renderers/CRUD2';
import {deepRemove, findObj, findSchema} from './utils';
import {ToolsConfig, FiltersConfig, OperatorsConfig} from './constants';
import {FieldSetting} from '../../renderer/FieldSetting';

import type {IFormItemStore, IFormStore, BaseApiObject} from 'amis-core';
import type {ScaffoldConfig} from '../../builder/type';

export type FeatOption = {
  label: string;
  value: DSFeatureType;
  makeSetting?: (builder: DSBuilder) => any;
  resolveSchema: (setting: any, builder: DSBuilder) => any;
  align?: 'left' | 'right';
  order?: number;
};

/** 需要动态控制的属性 */
export type DynamicControls = Partial<
  Record<
    'columns' | 'toolbar' | 'filters',
    | Record<string, any>
    | ((context: BuildPanelEventContext) => Record<string, any>)
  >
>;

/** CURD脚手架配置 */
interface CRUDPluginScaffold extends ScaffoldConfig {}

export class BaseCRUDPlugin extends BasePlugin {
  static id = 'CRUD2Plugin';

  rendererName = 'crud2';

  name = '增删改查';

  panelTitle = '增删改查';

  subPanelTitle = '增删改查';

  icon = 'fa fa-table';

  panelIcon = 'fa fa-table';

  subPanelIcon = 'fa fa-table';

  pluginIcon = 'table-plugin';

  panelJustify = true;

  multifactor = true;

  order = -1000;

  $schema = '/schemas/CRUD2Schema.json';

  docLink = '/amis/zh-CN/components/crud2';

  tags = ['数据容器'];

  events: RendererPluginEvent[];

  actions: RendererPluginAction[];

  scaffold: CRUD2Schema;

  scaffoldFormCache?: ScaffoldForm;

  dsManager: DSBuilderManager;

  constructor(
    manager: EditorManager,
    events?: RendererPluginEvent[],
    actions?: RendererPluginAction[]
  ) {
    super(manager);

    this.dsManager = new DSBuilderManager(manager);
    this.events = uniqBy([...(events || [])], 'eventName');
    this.actions = uniqBy(
      [
        {
          actionType: 'search',
          actionLabel: '数据查询',
          description: '使用指定条件完成列表数据查询',
          descDetail: (info: any) => {
            return (
              <div>
                <span className="variable-right">{info?.__rendererLabel}</span>
                触发数据查询
              </div>
            );
          },
          schema: getArgsWrapper({
            name: 'query',
            label: '查询条件',
            type: 'ae-formulaControl',
            variables: '${variables}',
            size: 'md',
            mode: 'horizontal'
          })
        },
        {
          actionType: 'loadMore',
          actionLabel: '加载更多',
          description: '加载更多条数据到列表容器',
          descDetail: (info: any) => {
            return (
              <div>
                <span className="variable-right">{info?.__rendererLabel}</span>
                加载更多数据
              </div>
            );
          }
        },
        {
          actionType: 'startAutoRefresh',
          actionLabel: '启动自动刷新',
          description: '启动自动刷新'
        },
        {
          actionType: 'stopAutoRefresh',
          actionLabel: '停止自动刷新',
          description: '停止自动刷新'
        },
        ...(actions || [])
      ],
      'actionType'
    );
  }

  get scaffoldForm(): ScaffoldForm {
    return {
      title: `${this.name}创建向导`,
      mode: {
        mode: 'horizontal',
        horizontal: {
          leftFixed: 'sm'
        }
      },
      className: 'ae-Scaffold-Modal ae-Scaffold-Modal-content', //  ae-formItemControl
      stepsBody: true,
      canSkip: true,
      canRebuild: true,
      body: [
        {
          title: '数据配置',
          body: [
            /** 数据源选择 */
            this.dsManager.getDSSelectorSchema({
              onChange: (value: any, oldValue: any, model: any, form: any) => {
                if (value !== oldValue) {
                  const data = form.data;
                  Object.keys(data).forEach(key => {
                    if (key.endsWith('Fields') || key.endsWith('api')) {
                      form.deleteValueByName(key);
                    }
                  });
                  form.deleteValueByName('__fields');
                  form.deleteValueByName('listApi');
                }
                return value;
              }
            }),
            /** 数据源配置 */
            ...this.dsManager.buildCollectionFromBuilders(
              (builder, builderKey) => {
                return {
                  type: 'container',
                  visibleOn: `dsType == null || dsType === '${builderKey}'`,
                  body: flattenDeep([
                    builder.makeSourceSettingForm({
                      feat: 'List',
                      renderer: 'crud',
                      inScaffold: true
                    }),
                    builder.makeFieldsSettingForm({
                      feat: 'List',
                      renderer: 'crud',
                      inScaffold: true
                    })
                  ])
                };
              }
            ),
            {
              type: 'input-text',
              name: 'primaryField',
              label: tipedLabel(
                '主键',
                '每行记录的唯一标识符，通常用于行选择、批量操作等场景。'
              ),
              pipeIn: defaultValue('id')
            }
          ]
        },
        {
          title: '功能配置',
          body: [
            /** 功能场景选择 */
            ...this.dsManager.buildCollectionFromBuilders(
              (builder, builderKey) => {
                return {
                  type: 'container',
                  visibleOn: `dsType == null || dsType === '${builderKey}'`,
                  body: [
                    {
                      type: 'checkboxes',
                      label: '工具栏',
                      name: ToolsConfig.groupName,
                      joinValues: false,
                      extractValue: true,
                      multiple: true,
                      options: ToolsConfig.options.filter(item =>
                        builder.filterByFeat(item.value)
                      )
                    },
                    {
                      type: 'checkboxes',
                      label: '条件查询',
                      name: FiltersConfig.groupName,
                      multiple: true,
                      joinValues: false,
                      extractValue: true,
                      options: FiltersConfig.options.filter(item =>
                        builder.filterByFeat(item.value)
                      )
                    },
                    {
                      type: 'checkboxes',
                      label: '数据操作',
                      name: OperatorsConfig.groupName,
                      multiple: true,
                      joinValues: false,
                      extractValue: true,
                      options: OperatorsConfig.options.filter(item =>
                        builder.filterByFeat(item.value)
                      )
                    },
                    // 占位，最后一个form item没有间距
                    {
                      type: 'container'
                    }
                  ]
                };
              }
            ),
            /** 各场景字段设置 */
            {
              type: 'tabs',
              tabsMode: 'vertical',
              className: 'ae-Scaffold-Modal-tabs',
              tabs: this.getScaffoldFeatureTab()
            }
          ]
        }
      ],
      /** 用于重新构建的数据回填 */
      pipeIn: async (schema: any) => {
        const CRUDSchema = omit(schema, [
          ...Object.values(DSFeature).map(item => `${item.value}Fields`),
          '$$id',
          '__fields',
          '__relations',
          '__filterableFields'
        ]);
        /** 数据源类型 */
        const dsType = schema?.dsType ?? this.dsManager.getDefaultBuilderKey();
        const builder = this.dsManager.getBuilderByKey(dsType);
        const scaffoldConfig = builder?.guessScaffoldConfigFromSchema(schema);

        return {
          ...omit(scaffoldConfig, ['feats', 'orders', 'filters']),
          tools: intersection(scaffoldConfig?.feats, [
            DSFeatureEnum.Insert,
            DSFeatureEnum.BulkDelete,
            DSFeatureEnum.BulkEdit
          ]),
          /** 数据操作 */
          operators: intersection(scaffoldConfig?.feats, [
            DSFeatureEnum.View,
            DSFeatureEnum.Edit,
            DSFeatureEnum.Delete
          ]),
          /** 条件查询 */
          filters: intersection(scaffoldConfig?.feats, [
            DSFeatureEnum.FuzzyQuery,
            DSFeatureEnum.SimpleQuery,
            DSFeatureEnum.AdvancedQuery
          ]),
          /** 标识是否为重新构建 */
          __rebuild: !!CRUDSchema,
          __pristineSchema: CRUDSchema
        };
      },
      pipeOut: async (config: CRUDPluginScaffold) => {
        const schema: any = cloneDeep(this.scaffold);
        const builder = this.dsManager.getBuilderByScaffoldSetting(config);

        if (!builder) {
          return schema;
        }

        const options = {
          feats: [
            ...(config.tools ?? []),
            ...(config.filters ?? []),
            ...(config.operators ?? [])
          ].filter(Boolean),
          ...omit(config, ['tools', 'filters', 'operators'])
        };

        return builder.buildCRUDSchema({
          feats: options.feats,
          renderer: 'crud',
          inScaffold: true,
          scaffoldConfig: options
        });
      },
      validate: (data: CRUDPluginScaffold, form: IFormStore) => {
        const feat = data?.feat ?? 'List';
        const builder = this.dsManager.getBuilderByScaffoldSetting(data);
        const featValue = builder?.getFeatValueByKey(feat);
        const fieldsKey = `${featValue}Fields`;
        const errors: Record<string, string> = {};

        const fieldErrors = FieldSetting.validator(form.data[fieldsKey]);

        if (fieldErrors) {
          errors[fieldsKey] = fieldErrors;
        }

        return errors;
      }
    };
  }

  getScaffoldFeatureTab() {
    const tabs: {title: string; icon: string; body: any; visibleOn: string}[] =
      [];
    [
      {
        groupName: '',
        options: [
          {
            label: '列表展示',
            value: 'List',
            icon: 'fa fa-list'
          }
        ]
      },
      ToolsConfig,
      FiltersConfig,
      OperatorsConfig
    ].forEach(group => {
      group.options.forEach((item, index) => {
        this.dsManager.buildCollectionFromBuilders((builder, builderKey) => {
          if (!builder.features.includes(item.value as DSFeatureType)) {
            return null;
          }

          const tabContent = [
            ...(!['List', 'SimpleQuery'].includes(item.value)
              ? builder.makeSourceSettingForm({
                  feat: item.value,
                  renderer: 'crud',
                  inScaffold: true
                })
              : []),
            ...builder.makeFieldsSettingForm({
              feat: item.value,
              renderer: 'crud',
              inScaffold: true
            })
          ];

          if (!tabContent || tabContent.length === 0) {
            return null;
          }

          const groupName = group.groupName;
          const extraVisibleOn = groupName
            ? `data["${groupName}"] && ~data['${groupName}'].indexOf('${item.value}')`
            : true;

          tabs.push({
            title: item.label,
            icon: item.icon,
            visibleOn: `(!data.dsType || data.dsType === '${builderKey}') && ${extraVisibleOn}`,
            body: tabContent
              .filter(Boolean)
              .map(formItem => ({...formItem, mode: 'normal'}))
          });

          return;
        });
      });
    });

    return tabs;
  }

  /** CRUD公共配置面板 */
  baseCRUDPanelBody = (
    context: BuildPanelEventContext,
    dynamicControls: DynamicControls = {}
  ) => {
    return getSchemaTpl('tabs', [
      this.renderPropsTab(context, dynamicControls),
      this.renderStylesTab(context),
      this.renderEventTab(context)
    ]);
  };

  /** 拆解一下 CURD 的基础面板配置，方便不同 mode 下模块化组合 */
  /** 属性面板 */
  renderPropsTab(
    context: BuildPanelEventContext,
    dynamicControls: DynamicControls = {}
  ) {
    const builder = this.dsManager.getBuilderBySchema(context.node.schema);
    /** 动态加载的配置集合 */
    const dc = dynamicControls || {};

    return {
      title: '属性',
      className: 'p-none',
      body: [
        getSchemaTpl(
          'collapseGroup',
          [
            /** 基本配置类别 */
            this.renderBasicPropsCollapse(context),
            /** 列设置类别 */
            isFunction(dc.columns) ? dc.columns(context) : dc.columns,
            /** 搜索类别 */
            isFunction(dc.filters) ? dc.filters(context) : dc.filters,
            /** 工具栏类别 */
            isFunction(dc.toolbar) ? dc.toolbar(context) : dc.toolbar,
            /** 分页类别 */
            this.renderPaginationCollapse(context),
            /** 其他类别 */
            this.renderOthersCollapse(context),
            /** 状态类别 */
            getSchemaTpl('status', {readonly: false})
          ].filter(Boolean)
        )
      ]
    };
  }

  /** 基础配置 */
  renderBasicPropsCollapse(context: BuildPanelEventContext) {
    return {
      title: '基本',
      order: 1,
      body: [
        /** 数据源类型 */
        this.dsManager.getDSSelectorSchema({
          type: 'select',
          label: '数据源',
          onChange: (
            value: any,
            oldValue: any,
            model: IFormItemStore,
            form: IFormStore
          ) => {
            if (value !== oldValue) {
              const data = form.data;
              Object.keys(data).forEach(key => {
                if (key.endsWith('Fields') || key.endsWith('api')) {
                  form.deleteValueByName(key);
                }
              });
              form.deleteValueByName('__fields');
              form.deleteValueByName('__relations');
              form.setValueByName('$$m', {});

              form.setValueByName(
                'api',
                value === 'model-entity'
                  ? {
                      action: 'list',
                      scene: 'list'
                    }
                  : ''
              );
            }
            return value;
          }
        }),
        /** 数据源配置 */
        ...this.dsManager.buildCollectionFromBuilders((builder, builderKey) => {
          return {
            type: 'container',
            visibleOn: `dsType == null || dsType === '${builderKey}'`,
            body: builder.makeSourceSettingForm({
              feat: 'List',
              renderer: 'crud',
              inScaffold: false
            }),
            /** 因为会使用 container 包裹，所以加一个 margin-bottom */
            className: 'mb-3'
          };
        }),
        /** 主键配置，TODO：支持联合主键 */
        {
          type: 'input-text',
          name: 'primaryField',
          label: tipedLabel(
            '主键',
            '每行记录的唯一标识符，通常用于行选择、批量操作等场景。'
          ),
          pipeIn: defaultValue('id')
        },
        {
          name: 'placeholder',
          pipeIn: defaultValue('暂无数据'),
          type: 'input-text',
          label: '占位内容'
        },
        getSchemaTpl('switch', {
          name: 'syncLocation',
          label: tipedLabel(
            '同步地址栏',
            '开启后会把查询条件数据和分页信息同步到地址栏中，页面中出现多个时，建议只保留一个同步地址栏，否则会相互影响。'
          ),
          pipeIn: defaultValue(true)
        })
      ]
    };
  }

  /** 分页类别 */
  renderPaginationCollapse(context: BuildPanelEventContext) {
    return {
      order: 30,
      title: '分页设置',
      body: [
        {
          label: '更多模式',
          type: 'select',
          name: 'loadType',
          options: [
            {
              label: '无',
              value: ''
            },
            {
              label: '分页',
              value: 'pagination'
            },
            {
              label: '加载更多',
              value: 'more'
            }
          ],
          pipeIn: (data: any) => data || '',
          pipeOut: (data: string) => {
            return data;
          },
          onChange: (value: string, oldValue: any, model: any, form: any) => {
            const schema = form.data;
            if (oldValue) {
              deepRemove(schema, item => {
                return oldValue === 'more'
                  ? item.behavior === 'loadMore'
                  : item.type === 'pagination';
              });
            }

            if (value) {
              // 新插入的默认放在 footerToolbar 中分栏 的第二栏的最后，没有位置的话向上缺省
              // oldValue && deepRemove(schema);
              const newCompSchema =
                value === 'pagination'
                  ? {
                      type: 'pagination',
                      behavior: 'Pagination',
                      layout: ['total', 'perPage', 'pager'],
                      perPageAvailable: [10, 20, 50, 100]
                    }
                  : {
                      type: 'button',
                      behavior: 'loadMore',
                      label: '加载更多',
                      onEvent: {
                        click: {
                          actions: [
                            {
                              componentId: schema.id,
                              groupType: 'component',
                              actionType: 'loadMore'
                            }
                          ],
                          weight: 0
                        }
                      }
                    };

              this.addFeatToToolbar(schema, newCompSchema, 'footer', 'right');
            }
          }
        },
        getSchemaTpl('switch', {
          name: 'loadDataOnce',
          label: '前端分页',
          visibleOn: 'data.loadType === "pagination"'
        }),
        {
          type: 'button',
          label: '点击编辑分页组件',
          block: true,
          className: 'm-b',
          level: 'enhance',
          // icon: 'fa fa-plus',
          visibleOn: 'data.loadType === "pagination"',
          onClick: () => {
            const findPage: any = findSchema(
              context?.schema ?? context?.node?.schema ?? {},
              item => item.type === 'pagination',
              'headerToolbar',
              'footerToolbar'
            );

            if (!findPage || !findPage.$$id) {
              toast.error('未找到分页组件');
              return;
            }
            this.manager.setActiveId(findPage.$$id);
          }
        },
        {
          name: 'perPage',
          type: 'input-number',
          label: '每页数量',
          visibleOn: 'data.loadType === "more"'
        },
        getSchemaTpl('switch', {
          name: 'keepItemSelectionOnPageChange',
          label: tipedLabel(
            '保留选择项',
            '默认切换页面、搜索后，用户选择项会被清空，开启此功能后会保留用户选择，可以实现跨页面批量操作。'
          ),
          visibleOn: 'data.loadType === "pagination"'
        }),
        getSchemaTpl('switch', {
          name: 'autoJumpToTopOnPagerChange',
          label: tipedLabel('翻页后回到顶部', '当切分页的时候，是否自动跳顶部'),
          visibleOn: 'data.loadType === "pagination"'
        })
      ]
    };
  }

  /** 其他类别 */
  renderOthersCollapse(context: BuildPanelEventContext) {
    return {
      order: 25,
      title: '其他',
      body: [
        getSchemaTpl('interval', {
          formItems: [
            getSchemaTpl('switch', {
              name: 'silentPolling',
              label: '静默拉取',
              pipeIn: defaultValue(false)
            })
          ],
          intervalConfig: {
            control: {
              type: 'input-number',
              name: 'interval'
            }
          },
          switchMoreConfig: {
            isChecked: (e: any) => {
              return !!get(e.data, 'interval');
            },
            autoFocus: false,
            trueValue: 10000
          }
        })
      ]
    };
  }

  /** 外观面板 */
  renderStylesTab(
    context: BuildPanelEventContext,
    dynamicControls: DynamicControls = {}
  ) {
    return {
      title: '外观',
      className: 'p-none',
      body: getSchemaTpl('collapseGroup', [
        getSchemaTpl('style:classNames', {
          isFormItem: false,
          schema: [
            getSchemaTpl('className', {
              name: 'bodyClassName',
              label: '表格区域'
            }),

            getSchemaTpl('className', {
              name: 'headerToolbarClassName',
              label: '顶部外层'
            }),

            getSchemaTpl('className', {
              name: 'footerToolbarClassName',
              label: '底部外层'
            })
          ]
        })
      ])
    };
  }

  /** 事件面板 */
  renderEventTab(
    context: BuildPanelEventContext,
    dynamicControls: DynamicControls = {}
  ) {
    return {
      title: '事件',
      className: 'p-none',
      body: [
        getSchemaTpl('eventControl', {
          name: 'onEvent',
          ...getEventControlConfig(this.manager, context)
        })
      ]
    };
  }

  emptyContainer = (align?: 'left' | 'right', body: any[] = []) => ({
    type: 'container',
    body,
    wrapperBody: false,
    style: {
      flexGrow: 1,
      flex: '1 1 auto',
      position: 'static',
      display: 'flex',
      flexBasis: 'auto',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      alignItems: 'stretch',
      ...(align
        ? {
            justifyContent: align === 'left' ? 'flex-start' : 'flex-end'
          }
        : {})
    }
  });

  emptyFlex = (items: any[] = []) => ({
    type: 'flex',
    items,
    style: {
      position: 'static'
    },
    direction: 'row',
    justify: 'flex-start',
    alignItems: 'stretch'
  });

  // headerToolbar 和 footerToolbar 布局换成 flex 包裹 container
  addFeatToToolbar(
    schema: any,
    content: any,
    position: 'header' | 'footer',
    align: 'left' | 'right'
  ) {
    const region = `${position}Toolbar`;
    if (
      !schema[region] ||
      isEmpty(schema[region]) ||
      !Array.isArray(schema[region])
    ) {
      const isArr = Array.isArray(schema[region]);
      const newSchema = this.emptyFlex([
        this.emptyContainer(
          'left',
          isArr || !schema[region] ? [] : [schema[region]]
        ),
        this.emptyContainer('right')
      ]);

      (isArr && schema[region].push(newSchema)) ||
        (schema[region] = [newSchema]);
    }

    // 尝试放到左面第一个，否则只能放外头了
    try {
      // 优先判断没有右边列的情况，避免都走到catch里造成嵌套层数过多的问题
      if (align === 'right' && schema[region][0].items.length < 2) {
        schema[region][0].items.push(this.emptyContainer('right'));
      }

      schema[region][0].items[
        align === 'left' ? 0 : schema[region][0].items.length - 1
      ].body.push(content);
    } catch (e) {
      const olds = [...schema[region]];
      schema[region].length = 0;
      schema[region].push(
        this.emptyFlex([
          this.emptyContainer('left', olds),
          this.emptyContainer('right', content)
        ])
      );
    }
  }

  async buildDataSchemas(node: EditorNodeType, region?: EditorNodeType) {
    const child: EditorNodeType = node.children.find(
      item => !!~['table2', 'cards', 'list'].indexOf(item.type)
    );

    if (!child?.info?.plugin?.buildDataSchemas) {
      return;
    }

    const childDataSchema = await child.info.plugin.buildDataSchemas(
      child,
      region
    );
    const items =
      childDataSchema?.properties?.rows ?? childDataSchema?.properties?.items;
    const schema: any = {
      $id: 'crud2',
      type: 'object',
      properties: {
        ...items?.properties,
        items: {
          ...items,
          title: '全部数据'
        },
        selectedItems: {
          ...items,
          title: '选中数据'
        },
        unSelectedItems: {
          ...items,
          title: '未选中数据'
        },
        page: {
          type: 'number',
          title: '当前页码'
        },
        total: {
          type: 'number',
          title: '总数据条数'
        }
      }
    };

    return schema;
  }

  async getAvailableContextFields(
    scopeNode: EditorNodeType,
    node: EditorNodeType,
    region?: EditorNodeType
  ) {
    // 先从数据源获取可用字段
    const builder = this.dsManager.getBuilderBySchema(scopeNode.schema);

    if (builder && scopeNode.schema.api) {
      return builder.getAvailableContextFields(
        {
          schema: scopeNode.schema,
          sourceKey: 'api',
          feat: scopeNode.schema?.feat ?? 'List'
        },
        node
      );
    }
  }

  generateScaffold(mode: 'table2' | 'cards' | 'list') {
    let schema: any;

    if (mode === 'table2') {
      schema = {
        type: 'crud2',
        mode: 'table2',
        columns: [
          {
            name: 'id',
            title: 'ID',
            type: 'container',
            body: [
              {
                type: 'text'
              }
            ]
          },
          {
            name: 'engine',
            title: '示例',
            type: 'container',
            body: [
              {
                type: 'text'
              }
            ]
          }
        ]
      };
    } else if (mode === 'cards') {
      schema = {
        type: 'crud2',
        mode: 'cards',
        card: {
          type: 'card2',
          body: [
            {
              type: 'container',
              body: [
                {
                  type: 'tpl',
                  tpl: '标题',
                  inline: false,
                  style: {
                    marginTop: '0',
                    marginBottom: '0',
                    paddingTop: '',
                    paddingBottom: ''
                  },
                  wrapperComponent: 'h2'
                },
                {
                  type: 'form',
                  body: [
                    {
                      type: 'static-tpl',
                      label: '字段',
                      tpl: '内容'
                    }
                  ]
                },
                {
                  type: 'divider'
                },
                {
                  type: 'button-group'
                }
                // {
                //   type: 'tpl',
                //   tpl: '副标题内容',
                //   inline: false,
                //   wrapperComponent: '',
                //   style: {
                //     color: '#9b9b9b',
                //     marginTop: '0',
                //     marginBottom: '0'
                //   }
                // }
              ]
              // style: {
              //   borderStyle: 'solid',
              //   borderColor: '#ebebeb',
              //   borderWidth: '1px',
              //   'borderRadius': '5px',
              //   'paddingTop': '10px',
              //   'paddingRight': '10px',
              //   'paddingBottom': '0',
              //   'paddingLeft': '10px'
              // }
            }
          ]
        }
      };
    } else if (mode === 'list') {
      schema = {
        type: 'crud2',
        mode: 'list',
        listItem: {
          body: [
            {
              type: 'container',
              body: [
                {
                  type: 'tpl',
                  tpl: '标题',
                  inline: false,
                  style: {
                    marginTop: '0',
                    marginBottom: '0',
                    paddingTop: '',
                    paddingBottom: ''
                  },
                  wrapperComponent: 'h2'
                },
                {
                  type: 'tpl',
                  tpl: '副标题内容',
                  inline: false,
                  wrapperComponent: '',
                  style: {
                    color: '#9b9b9b',
                    marginTop: '0',
                    marginBottom: '0'
                  }
                }
              ]
            }
          ]
        }
      };
    }

    return schema;
  }

  /** 生成预览 Schema */
  generatePreviewSchema = (mode: 'table2' | 'cards' | 'list') => {
    const columnSchema: any = [
      {
        label: 'Engine',
        name: 'engine'
      },
      {
        label: 'Browser',
        name: 'browser'
      },
      {
        name: 'version',
        label: 'Version'
      }
    ];

    const actionSchema = {
      type: 'button',
      level: 'link',
      icon: 'fa fa-eye',
      actionType: 'dialog',
      dialog: {
        title: '查看详情',
        body: {
          type: 'form',
          body: [
            {
              label: 'Engine',
              name: 'engine',
              type: 'static'
            },
            {
              name: 'browser',
              label: 'Browser',
              type: 'static'
            },
            {
              name: 'version',
              label: 'Version',
              type: 'static'
            }
          ]
        }
      }
    };

    const itemSchema =
      mode === 'cards'
        ? {card: {body: columnSchema, actions: actionSchema}}
        : mode === 'list'
        ? {
            listItem: {
              body: {
                type: 'hbox',
                columns: columnSchema
              }
            },
            actions: actionSchema
          }
        : {
            columns: columnSchema.concat([
              {
                name: 'operation',
                title: '操作',
                buttons: [actionSchema]
              }
            ])
          };

    return {
      type: 'crud2',
      mode,
      source: '$items',
      data: {
        items: [
          {
            engine: 'Trident',
            browser: 'Internet Explorer 4.0',
            platform: 'Win 95+',
            version: '4',
            grade: 'X'
          }
        ]
      },
      ...itemSchema
    };
  };
}
