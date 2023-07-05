/**
 * @file ApiDsBuilder
 * @desc 外部 API 接口数据源构造器
 */

import sortBy from 'lodash/sortBy';
import pick from 'lodash/pick';
import get from 'lodash/get';
import uniq from 'lodash/uniq';
import {isObject, normalizeApi, isValidApi} from 'amis-core';
import {toast} from 'amis';
import {
  getSchemaTpl,
  tipedLabel,
  generateNodeId,
  JSONPipeOut
} from 'amis-editor-core';
import {DSBuilder, registerDSBuilder} from './DSBuilder';
import {OperatorMap, DSFeatureEnum} from './constants';
import {traverseSchemaDeep} from './utils';

import type {EditorNodeType} from 'amis-editor-core';
import type {ButtonSchema} from 'amis';
import type {
  DSFeatureType,
  GenericSchema,
  ScaffoldField,
  FormOperatorValue,
  FormOperator,
  ScaffoldConfig
} from './type';
import type {FieldSetting} from '../renderer/FieldSetting';

export interface ApiDSBuilderOptions {
  /** 渲染器类型 */
  renderer: string;
  /** 应用场景 */
  feat: DSFeatureType;
  /** CRUD应用场景 */
  feats?: DSFeatureType[];
  /** 当前组件的 Schema */
  schema?: any;
  /** 数据源字段名 */
  sourceKey?: string;
  /** 是否在脚手架环境中 */
  inScaffold?: boolean;
  /** 脚手架配置 */
  scaffoldConfig?: ScaffoldConfig;
  /** 如果为对多关系容器，则会返回对应的节点 */
  scopeNode?: EditorNodeType;
  /** 配置面板设置 */
  sourceSettings?: {
    /** 数据源字段名 */
    name?: string;
    /** 数据源字段标题 */
    label?: any;
    renderLabel?: boolean;
    labelClassName?: string;
    mode?: 'horizontal' | 'normal';
    horizontalConfig?: {justify: boolean; left?: number; right?: number};
    visibleOn?: string;
  };
}

export class ApiDSBuilder extends DSBuilder<ApiDSBuilderOptions> {
  static key = 'api';

  readonly name: string = 'API接口';

  readonly order: number = 2;

  readonly features = [
    'List',
    'Insert',
    'View',
    'Edit',
    'Delete',
    'BulkEdit',
    'BulkDelete',
    'SimpleQuery'
  ] as DSFeatureType[];

  match(schema: any) {
    const apiSchema = schema.api;

    if (
      schema?.dsType === ApiDSBuilder.key ||
      apiSchema?.sourceType === ApiDSBuilder.key
    ) {
      return true;
    }

    /**
     * 携带 jsonql 一定不是 API 接口
     * 携带 strategy 为实体接口通过混合构建策略生成
     *  */
    if (
      isObject(apiSchema) &&
      (apiSchema.jsonql != null || apiSchema.strategy !== null)
    ) {
      return false;
    }

    if (
      typeof apiSchema === 'string' &&
      /^(get|post|put|delete|option):/.test(apiSchema)
    ) {
      return true;
    }

    return false;
  }

  async getContextFields(options: ApiDSBuilderOptions) {
    return [];
  }

  async getAvailableContextFields(
    options: ApiDSBuilderOptions,
    target: EditorNodeType
  ) {
    return;
  }

  makeSourceSettingForm(options: ApiDSBuilderOptions): any[] {
    const {feat, renderer, inScaffold, sourceSettings} = options || {};
    const {
      label,
      name,
      renderLabel,
      labelClassName,
      mode,
      horizontalConfig,
      visibleOn
    } = sourceSettings || {};
    const isCRUD = renderer === 'crud';
    /** 处理Label */
    const labelText =
      label ??
      (isCRUD && feat !== 'List'
        ? this.getFeatLabelByKey(feat) + '接口'
        : '接口');
    let normalizedLabel: any = labelText;
    if (feat === 'Insert') {
      normalizedLabel = tipedLabel(
        labelText,
        `用来保存数据, 表单提交后将数据传入此接口。<br/>
        接口响应体要求(如果data中有数据，该数据将被合并到表单上下文中)：<br/>
        <pre>${JSON.stringify({status: 0, msg: '', data: {}}, null, 2)}</pre>`
      );
    } else if (feat === 'List') {
      normalizedLabel = tipedLabel(
        labelText,
        `接口响应体要求：<br/>
        <pre>${JSON.stringify(
          {status: 0, msg: '', items: {}, page: 0, total: 0},
          null,
          2
        )}</pre>`
      );
    }

    const layoutMode = mode ?? 'horizontal';
    const baseApiSchemaConfig = {
      renderLabel: renderLabel ?? true,
      label: normalizedLabel,
      name: name ?? (inScaffold ? this.getFeatValueByKey(feat) + 'Api' : 'api'),
      mode: layoutMode,
      labelClassName: labelClassName,
      inputClassName: 'm-b-none',
      ...(layoutMode === 'horizontal' ? horizontalConfig ?? {} : {}),
      ...(visibleOn && typeof visibleOn === 'string' ? {visibleOn} : {}),
      onPickerConfirm: (value: any) => {
        let transformedValue = value;
        const transform = (apiObj: any) =>
          `${apiObj?.api?.method || 'post'}:api://${apiObj?.key || ''}`;

        if (value) {
          transformedValue = Array.isArray(value)
            ? value.map(transform).join(',')
            : transform(value);
        }

        return transformedValue;
      }
    };

    return [
      /** 提交接口 */
      getSchemaTpl('apiControl', baseApiSchemaConfig),
      /** 表单初始化接口 */
      feat === 'Edit' && renderer === 'form'
        ? getSchemaTpl('apiControl', {
            ...baseApiSchemaConfig,
            name: 'initApi',
            label: tipedLabel(
              '初始化接口',
              `接口响应体要求：<br/>
              <pre>${JSON.stringify(
                {status: 0, msg: '', data: {}},
                null,
                2
              )}</pre>`
            )
          })
        : null
    ].filter(Boolean);
  }

  makeFieldsSettingForm(options: ApiDSBuilderOptions) {
    const {feat, inScaffold, renderer} = options || {};
    const isCRUD = renderer === 'crud';
    const isForm = renderer === 'form';
    const name = `${this.getFeatValueByKey(feat)}Fields`;

    if (
      !inScaffold ||
      ['Import', 'Export', 'FuzzyQuery', 'Delete', 'BulkDelete'].includes(feat)
    ) {
      return [];
    }

    const result = [
      {
        type: 'ae-field-setting',
        name: this.getFieldsKey(options),
        label: '字段',
        renderer,
        feat,
        options: {
          showInputType:
            renderer === 'form' ||
            (renderer === 'crud' &&
              [
                'Edit',
                'BulkEdit',
                'Insert',
                'View',
                'SimpleQuery',
                'List'
              ].includes(feat)),
          showDisplayType: renderer === 'crud' && ['List'].includes(feat)
        },
        onAutoGenerateFields: this.autoGenerateFields.bind(this)
      }
    ];

    return result;
  }

  /** 基于接口生成字段 */
  async autoGenerateFields({
    api,
    props,
    setState
  }: {
    api: any;
    props: Record<string, any>;
    setState: (state: any) => void;
  }) {
    const {manager, env, data: ctx, feat} = props;
    const schemaFilter = manager?.store?.schemaFilter;

    if (schemaFilter) {
      api = schemaFilter({
        api
      }).api;
    }

    const result = await env?.fetcher(api, ctx);

    if (!result.ok) {
      toast.warning(
        result.defaultMsg ??
          result.msg ??
          'API返回格式不正确，请查看接口响应格式要求'
      );
      return;
    }

    const fields: any[] = [];
    let sampleRow: Record<string, any>;
    if (feat === 'List') {
      const items = result.data?.rows || result.data?.items || result.data;
      sampleRow = items?.[0];
    } else {
      sampleRow = result.data;
    }

    if (sampleRow) {
      Object.entries(sampleRow).forEach(([key, value]) => {
        fields.push({
          label: key,
          name: key,
          displayType: 'tpl',
          inputType: typeof value === 'number' ? 'input-number' : 'input-text',
          checked: true
        });
      });
    }

    return fields;
  }

  getApiKey(options: ApiDSBuilderOptions) {
    const {feat} = options || {};
    return feat ? `${this.getFeatValueByKey(feat)}Api` : 'api';
  }

  getFieldsKey(options: ApiDSBuilderOptions) {
    const {feat} = options || {};
    return feat ? `${this.getFeatValueByKey(feat)}Fields` : '';
  }

  buildBaseButtonSchema(
    options: ApiDSBuilderOptions,
    schemaPatch?: {
      formSchema: GenericSchema;
      buttonSchema?: {
        label?: string;
        level?: ButtonSchema['level'];
        order?: number;
        [propName: string]: any;
      };
      dialogSchema?: {
        title?: string;
        actions: GenericSchema[];
      };
      componentId?: string;
    }
  ) {
    const {feat} = options || {};
    const {buttonSchema, formSchema, dialogSchema, componentId} =
      schemaPatch || {};

    const labelMap: Partial<Record<DSFeatureType, string>> = {
      Insert: '新增',
      View: '查看',
      Edit: '编辑',
      BulkEdit: '批量编辑',
      Delete: '删除',
      BulkDelete: '批量删除'
    };
    const titleMap: Partial<Record<DSFeatureType, string>> = {
      Insert: '新增数据',
      View: '查看数据',
      Edit: '编辑数据',
      BulkEdit: '批量编辑数据',
      Delete: '删除数据',
      BulkDelete: '批量删除数据'
    };

    let schema: GenericSchema = {
      type: 'button',
      label: labelMap[feat] ?? '按钮',
      ...buttonSchema,
      behavior: feat,
      onEvent: {
        click: {
          actions: [
            {
              actionType: 'dialog',
              dialog: {
                body: {
                  ...formSchema,
                  onEvent: {
                    submitSucc: {
                      actions: [
                        {
                          actionType: 'search',
                          componentId: componentId
                        }
                      ]
                    }
                  }
                },
                title: titleMap[feat] ?? '弹窗',
                size: 'md',
                actions: [
                  {type: 'button', actionType: 'cancel', label: '关闭'}
                ],
                ...dialogSchema
              }
            }
          ]
        }
      }
    };

    return schema;
  }

  /** 构建表单按钮操作区 */
  buildFormOperators(options: ApiDSBuilderOptions, componentId: string) {
    const {feat, scaffoldConfig} = options || {};
    const {operators} = scaffoldConfig || {};

    const schema = sortBy(operators ?? Object.values(OperatorMap), [
      'order'
    ]).map(item => {
      return {
        type: 'button',
        label: item.label,
        onEvent: {
          click: {
            actions: [
              {
                actionType: item.value,
                componentId: componentId
              }
            ]
          }
        },
        ...item.schema
      };
    });

    return schema;
  }

  buildBaseFormSchema(
    options: ApiDSBuilderOptions,
    schemaPatch?: GenericSchema
  ) {
    schemaPatch = schemaPatch || {};
    const {feat, renderer, scaffoldConfig} = options || {};
    const fieldsKey = this.getFieldsKey(options);
    const apiKey = this.getApiKey(options);
    const fields: ScaffoldField[] = scaffoldConfig?.[fieldsKey] ?? [];
    const apiSchema = scaffoldConfig?.[apiKey];
    const id = generateNodeId();
    let schema: GenericSchema = {
      id,
      type: 'form',
      title: '表单',
      mode: 'horizontal',
      dsType: ApiDSBuilder.key,
      feat: feat,
      body: fields.map(f => ({
        ...pick(f, ['name', 'label']),
        type: f.inputType ?? 'input-text'
      })),
      api: apiSchema,
      actions: this.buildFormOperators(options, id)
    };

    if (['Insert', 'Edit', 'BulkEdit'].includes(feat)) {
      schema.resetAfterSubmit = true;
    }

    if (feat === 'View') {
      schema.static = true;
    }

    return {...schema, ...schemaPatch};
  }

  buildInsertSchema(options: ApiDSBuilderOptions, componentId?: string) {
    const {renderer, scaffoldConfig} = options || {};
    const {insertApi} = scaffoldConfig || {};

    if (renderer === 'form') {
      return this.buildBaseFormSchema({...options});
    }

    const formId = generateNodeId();
    const formActions = [
      {
        type: 'button',
        actionType: 'cancel',
        label: '取消'
      },
      {
        type: 'button',
        actionType: 'submit',
        label: '提交',
        level: 'primary'
      }
    ];
    const title = '新增数据';
    const formSchema = this.buildBaseFormSchema(
      {...options, feat: DSFeatureEnum.Insert},
      {
        id: formId,
        title: title,
        api: insertApi,
        actions: formActions
      }
    );

    return {
      ...this.buildBaseButtonSchema(
        {...options, feat: DSFeatureEnum.Insert},
        {
          buttonSchema: {
            className: 'm-r-xs'
          },
          dialogSchema: {
            title,
            actions: formActions
          },
          formSchema,
          componentId
        }
      )
    };
  }

  buildViewSchema(options: ApiDSBuilderOptions, componentId?: string) {
    const {renderer, scaffoldConfig} = options || {};
    const {viewApi} = scaffoldConfig || {};
    const formActions = [
      {
        type: 'button',
        actionType: 'cancel',
        label: '关闭'
      }
    ];
    const title = '查看数据';
    const formSchema = this.buildBaseFormSchema(
      {...options, feat: DSFeatureEnum.View},
      {
        title: title,
        initApi: viewApi,
        actions: formActions
      }
    );

    if (renderer === 'crud') {
      const buttonSchema = {
        ...this.buildBaseButtonSchema(
          {...options, feat: DSFeatureEnum.View},
          {
            buttonSchema: {
              level: 'link'
            },
            dialogSchema: {
              title,
              actions: formActions
            },
            formSchema,
            componentId
          }
        )
      };

      return buttonSchema;
    }

    return formSchema;
  }

  buildEditSchema(options: ApiDSBuilderOptions, componentId?: string) {
    const {renderer, scaffoldConfig} = options || {};
    const isForm = renderer === 'form';
    const {editApi, initApi} = scaffoldConfig || {};

    if (isForm) {
      return this.buildBaseFormSchema(options);
    }

    const formId = generateNodeId();
    const formActions = [
      {
        type: 'button',
        actionType: 'cancel',
        label: '取消'
      },
      {
        type: 'button',
        actionType: 'submit',
        label: '提交',
        level: 'primary'
      }
    ];
    const title = '编辑数据';
    const formSchema = this.buildBaseFormSchema(
      {...options, feat: DSFeatureEnum.Edit},
      {
        id: formId,
        title: title,
        initApi: initApi,
        api: editApi,
        actions: formActions
      }
    );

    return {
      ...this.buildBaseButtonSchema(
        {...options, feat: DSFeatureEnum.Edit},
        {
          buttonSchema: {
            level: 'link'
          },
          dialogSchema: {
            title,
            actions: formActions
          },
          formSchema,
          componentId
        }
      )
    };
  }

  buildBulkEditSchema(options: ApiDSBuilderOptions, componentId?: string) {
    const {feat, renderer, scaffoldConfig} = options;
    const {bulkEditApi} = scaffoldConfig || {};
    const isForm = renderer === 'form';

    if (isForm) {
      return this.buildBaseFormSchema(options);
    }

    const formId = generateNodeId();
    const formActions = [
      {
        type: 'button',
        actionType: 'cancel',
        label: '取消'
      },
      {
        type: 'button',
        actionType: 'submit',
        label: '提交',
        level: 'primary'
      }
    ];
    const title = '批量编辑';
    const formSchema = this.buildBaseFormSchema(
      {...options, feat: DSFeatureEnum.BulkEdit},
      {
        id: formId,
        title: title,
        api: bulkEditApi,
        actions: formActions
      }
    );

    return {
      ...this.buildBaseButtonSchema(
        {...options, feat: DSFeatureEnum.BulkEdit},
        {
          buttonSchema: {
            className: 'm-r-xs',
            disabledOn: '${selectedItems != null && selectedItems.length < 1}'
          },
          dialogSchema: {
            title,
            actions: formActions
          },
          formSchema,
          componentId
        }
      )
    };
  }

  buildCRUDDeleteSchema(options: ApiDSBuilderOptions, componentId?: string) {
    const {scaffoldConfig} = options;
    const {deleteApi} = scaffoldConfig || {};

    return {
      type: 'button',
      label: '删除',
      behavior: 'Delete',
      className: 'm-r-xs text-danger',
      level: 'link',
      confirmText: '确认要删除数据',
      onEvent: {
        click: {
          actions: [
            {
              actionType: 'ajax',
              args: {
                api: deleteApi,
                data: {
                  '&': '$$'
                }
              }
            },
            {
              actionType: 'search',
              componentId: componentId
            }
          ]
        }
      }
    };
  }

  buildCRUDBulkDeleteSchema(
    options: ApiDSBuilderOptions,
    componentId?: string
  ) {
    const {feat, scaffoldConfig} = options;
    const {bulkDeleteApi, primaryField = 'id'} = scaffoldConfig || {};

    return {
      type: 'button',
      label: '批量删除',
      behavior: 'BulkDelete',
      level: 'danger',
      className: 'm-r-xs',
      confirmText:
        '确认要批量删除数据' +
        `「\${JOIN(ARRAYMAP(selectedItems, item => item.${primaryField}), ',')}」`,
      disabledOn: '${selectedItems != null && selectedItems.length < 1}',
      onEvent: {
        click: {
          actions: [
            {
              actionType: 'ajax',
              args: {
                api: bulkDeleteApi
              }
            },
            {
              actionType: 'search',
              componentId: componentId
            }
          ]
        }
      }
    };
  }

  buildCRUDFilterSchema(options: ApiDSBuilderOptions, componentId?: string) {
    const {scaffoldConfig} = options;
    const {simpleQueryFields} = scaffoldConfig || {};
    const fields = simpleQueryFields ?? [];
    const formSchema = {
      type: 'form',
      title: '条件查询',
      mode: 'inline',
      columnCount: 3,
      clearValueOnHidden: true,
      behavior: ['SimpleQuery'],
      body: fields.map(f => ({
        ...pick(f, ['name', 'label']),
        type: f.inputType ?? 'input-text',
        size: 'full',
        required: false,
        behavior: 'SimpleQuery'
      })),
      actions: [
        {type: 'reset', label: '重置'},
        {type: 'submit', label: '查询', level: 'primary'}
      ]
    };

    return formSchema;
  }

  buildCRUDOpColumn(options: ApiDSBuilderOptions, componentId?: string) {
    const {feats} = options?.scaffoldConfig || {};
    const buttons = [];

    if (feats?.includes('View')) {
      buttons.push(this.buildViewSchema(options, componentId));
    }

    if (feats?.includes('Edit')) {
      buttons.push(this.buildEditSchema(options, componentId));
    }

    if (feats?.includes('Delete')) {
      buttons.push(this.buildCRUDDeleteSchema(options, componentId));
    }

    return {
      type: 'operation',
      title: '操作',
      buttons: buttons
    };
  }

  buildCRUDColumnsSchema(options: ApiDSBuilderOptions, componentId?: string) {
    const {scaffoldConfig} = options;
    const {listFields} = scaffoldConfig || {};
    const fields = listFields ?? [];
    const opColumn = this.buildCRUDOpColumn(options, componentId);

    const columns = [
      ...fields.map(f => {
        return {
          type: f.displayType,
          title: f.label,
          name: f.name
          /** 绑定列值, 似乎不需要 */
          // [f.typeKey || 'value']: `\${f.key}`
        };
      }),
      ...(opColumn.buttons.length !== 0 ? [opColumn] : [])
    ];

    return columns;
  }

  buildToolbarContainer(align: 'left' | 'right', body: GenericSchema[] = []) {
    body = Array.isArray(body) ? body : [body];

    return {
      type: 'container',
      align: align,
      behavior: body.map(node => node.behavior),
      body: Array.isArray(body) ? body : [body],
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
    };
  }

  buildToolbarFlex(left: GenericSchema[], right: GenericSchema[]) {
    return [
      {
        type: 'flex',
        direction: 'row',
        justify: 'flex-start',
        alignItems: 'stretch',
        style: {
          position: 'static'
        },
        items: [
          this.buildToolbarContainer('left', left),
          this.buildToolbarContainer('right', right)
        ].filter(Boolean)
      }
    ];
  }

  buildHeaderToolbar(options: ApiDSBuilderOptions, componentId?: string) {
    const {feats} = options?.scaffoldConfig || {};
    const collection: GenericSchema[] = [];

    if (feats?.includes('Insert')) {
      collection.push(this.buildInsertSchema(options, componentId));
    }
    if (feats?.includes('BulkEdit')) {
      collection.push(this.buildBulkEditSchema(options, componentId));
    }
    if (feats?.includes('BulkDelete')) {
      collection.push(this.buildCRUDBulkDeleteSchema(options, componentId));
    }

    return this.buildToolbarFlex(collection, []);
  }

  buildFooterToolbar(options: ApiDSBuilderOptions, componentId: string) {
    return this.buildToolbarFlex(
      [],
      [
        {
          type: 'pagination',
          behavior: 'Pagination',
          layout: ['total', 'perPage', 'pager'],
          perPage: 10,
          perPageAvailable: [10, 20, 50, 100],
          align: 'right'
        }
      ]
    );
  }

  makeDefaultConfig(schema: GenericSchema) {
    return {
      dsType: ApiDSBuilder.key
    };
  }

  guessFormConfig(schema: GenericSchema): ScaffoldConfig {
    if (!schema.dsType || schema.dsType !== ApiDSBuilder.key) {
      return this.makeDefaultConfig(schema);
    }

    const feat = schema?.feat ?? 'Insert';
    /** 表单操作 */
    const operators = (schema.actions ?? [])
      .map((item: any) => {
        const opValue = get(
          item,
          'onEvent.click.actions[0].actionType'
        ) as FormOperatorValue;

        if (
          typeof opValue === 'string' &&
          opValue &&
          ['submit', 'reset', 'cancel'].includes(opValue)
        ) {
          return OperatorMap[opValue];
        }

        return undefined;
      })
      .filter(Boolean);
    const featValue = this.getFeatValueByKey(feat);
    const fieldKey = featValue ? `${featValue}Fields` : '';
    const apiKey = featValue ? `${featValue}Api` : '';
    const fields = (Array.isArray(schema?.body) ? schema.body : [schema.body])
      .map(item => {
        if (!item) {
          return false;
        }

        return {
          name: item.name,
          label: item.label,
          displayType: 'tpl' /** 对于form这个属性没用 */,
          inputType: item.type
        };
      })
      .filter(
        (f): f is Exclude<typeof f, null | false | undefined> => f != null
      );

    const config = {
      feat: feat,
      dsType: ApiDSBuilder.key,
      ...(fieldKey ? {[fieldKey]: fields} : {}),
      ...(apiKey ? {[apiKey]: JSONPipeOut(schema?.api)} : {}),
      ...(feat === 'Edit' || schema.initApi != null
        ? {initApi: JSONPipeOut(schema?.initApi)}
        : {}),
      operators:
        operators.length < 1
          ? [OperatorMap['cancel'], OperatorMap['submit']]
          : operators
    };

    return config;
  }

  guessCRUDConfig(schema: GenericSchema): ScaffoldConfig {
    const feat = schema?.feat;
    const fieldKey = this.getFeatValueByKey(feat)
      ? `${this.getFeatValueByKey(feat)}Fields`
      : '';

    if (!schema.dsType || schema.dsType !== ApiDSBuilder.key) {
      return this.makeDefaultConfig(schema);
    }

    const listFields = (
      Array.isArray(schema?.columns) ? schema.columns : [schema.columns]
    )
      .filter(item => item.type !== 'operation')
      .map(item => {
        if (!item) {
          return;
        }

        return {
          name: item.name,
          label: item.title,
          displayType: item.type,
          inputType: 'input-text' /** 对于CRUD这个属性没用 */
        };
      })
      .filter(
        (f): f is Exclude<typeof f, null | false | undefined> => f != null
      );
    let viewFields: ScaffoldField[] = [];
    let viewApi: any;
    let insertFields: ScaffoldField[] = [];
    let insertApi: any;
    let editFields: ScaffoldField[] = [];
    let editApi: any;
    let bulkEditFields: ScaffoldField[] = [];
    let bulkEditApi: any;
    let simpleQueryFields: ScaffoldField[] = [];
    let bulkDeleteApi: any;
    let deleteApi: any;

    /** 已开启特性 */
    const feats: DSFeatureType[] = [];

    const collectFormFields = (body: any[]) =>
      body.map((item: any) => ({
        ...pick(item, ['name', 'label']),
        inputType: item.type ?? 'input-text',
        displayType: 'tpl'
      }));

    traverseSchemaDeep(
      schema,
      (key: string, value: any, host: Record<string, any>) => {
        if (key === 'feat') {
          if (value === 'Insert') {
            feats.push('Insert');
            insertFields = collectFormFields(host?.body ?? []);
            insertApi = host?.api;
          } else if (value === 'Edit') {
            feats.push('Edit');
            editFields = collectFormFields(host?.body ?? []);
            editApi = host?.api;
          } else if (value === 'BulkEdit') {
            feats.push('BulkEdit');
            bulkEditFields = collectFormFields(host?.body ?? []);
            bulkEditApi = host?.api;
          } else if (value === 'View') {
            feats.push('View');
            viewFields = collectFormFields(host?.body ?? []);
            viewApi = host?.initApi;
          }
        }

        if (key === 'behavior') {
          if (value === 'BulkDelete') {
            feats.push('BulkDelete');

            const actions = get(host, 'onEvent.click.actions', []);
            const actionSchema = actions.find(
              (action: any) =>
                action?.actionType === 'ajax' && action?.args?.api != null
            );
            bulkDeleteApi = get(actionSchema, 'args.api', '');
          } else if (value === 'Delete') {
            feats.push('Delete');

            const actions = get(host, 'onEvent.click.actions', []);
            const actionSchema = actions.find(
              (action: any) =>
                action?.actionType === 'ajax' && action?.args?.api != null
            );
            deleteApi = get(actionSchema, 'args.api', '');
          } else if (Array.isArray(value) && value.includes('SimpleQuery')) {
            feats.push('SimpleQuery');

            simpleQueryFields = (host?.body ?? []).map((item: any) => ({
              ...pick(item, ['name', 'label']),
              inputType: item.type ?? 'input-text',
              isplayType: 'tpl'
            }));
          }
        }

        return [key, value];
      }
    );

    const config = {
      feats: uniq(feats),
      dsType: ApiDSBuilder.key,
      listFields,
      listApi: JSONPipeOut(schema?.api),
      viewFields,
      viewApi: JSONPipeOut(viewApi),
      insertFields,
      insertApi: JSONPipeOut(insertApi),
      editFields,
      editApi: JSONPipeOut(editApi),
      bulkEditFields,
      bulkEditApi: JSONPipeOut(bulkEditApi),
      deleteApi: JSONPipeOut(deleteApi),
      bulkDeleteApi: JSONPipeOut(bulkDeleteApi),
      simpleQueryFields,
      primaryField: schema?.primaryField ?? 'id'
    };

    return config;
  }

  guessScaffoldConfigFromSchema(schema: GenericSchema): ScaffoldConfig {
    const renderer = schema?.type;

    if (renderer === 'form' && schema.dsType === ApiDSBuilder.key) {
      return this.guessFormConfig(schema);
    } else if (renderer === 'crud2' && schema.dsType === ApiDSBuilder.key) {
      return this.guessCRUDConfig(schema);
    } else {
      return {
        feat: schema?.feat,
        dsType: schema.dsType ?? ApiDSBuilder.key
      };
    }
  }

  buildCRUDSchema(options: ApiDSBuilderOptions) {
    const {scaffoldConfig} = options;
    const {
      feats,
      primaryField = 'id',
      listApi,
      editApi,
      bulkEditApi
    } = scaffoldConfig || {};
    const enableBulkEdit = feats?.includes('BulkEdit');
    const enableBulkDelete = feats?.includes('BulkDelete');
    const enableEdit = feats?.includes('Edit');
    const multiple = enableBulkEdit || enableBulkDelete;

    const id = generateNodeId();
    /** 暂时不考虑 cards 和 list */
    return {
      id,
      type: 'crud2',
      mode: 'table2',
      dsType: ApiDSBuilder.key,
      syncLocation: true,
      multiple: multiple,
      /** 通过脚手架创建的单条操作入口都在操作列中，所以rowSelection暂时不需要radio */
      ...(multiple
        ? {
            rowSelection: {
              type: 'checkbox',
              keyField: primaryField
            }
          }
        : {}),
      loadType: 'pagination',
      primaryField: primaryField,
      api: listApi,
      ...(enableBulkEdit ? {quickSaveApi: bulkEditApi} : {}),
      ...(enableEdit ? {quickSaveItemApi: editApi} : {}),
      filter: this.buildCRUDFilterSchema(options, id),
      headerToolbar: this.buildHeaderToolbar(options, id),
      footerToolbar: this.buildFooterToolbar(options, id),
      columns: this.buildCRUDColumnsSchema(options, id)
    };
  }

  buildFormSchema(options: ApiDSBuilderOptions) {
    const {feat, scaffoldConfig} = options;
    const {initApi, __rebuild, __pristineSchema} = scaffoldConfig || {};
    let formSchema: GenericSchema;

    if (feat === 'Insert') {
      formSchema = this.buildInsertSchema(options);
    } else if (feat === 'Edit') {
      formSchema = this.buildEditSchema(options);
    } else {
      formSchema = this.buildBulkEditSchema(options);
    }

    const baseSchema = {
      ...formSchema,
      ...(feat === 'Edit' ? {initApi} : {}),
      dsType: ApiDSBuilder.key
    };

    if (__rebuild === true && __pristineSchema && isObject(__pristineSchema)) {
      const id = __pristineSchema.id ?? generateNodeId();

      return {
        ...__pristineSchema,
        ...baseSchema,
        id: id
      };
    }

    return baseSchema;
  }
}

registerDSBuilder(ApiDSBuilder);
