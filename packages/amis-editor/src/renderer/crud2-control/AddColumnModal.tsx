/**
 * @file AddColumnModal
 * @desc 添加列
 */

import {useRef} from 'react';
import get from 'lodash/get';
import omit from 'lodash/omit';
import React, {useState, useCallback} from 'react';
import {Button, Modal, themeable, ThemeProps, utils} from 'amis';
import {getSchemaTpl, JSONPipeIn, EditorManager} from 'amis-editor-core';
import {DSFeatureType} from '../../builder';

import type {RendererProps, BaseApiObject} from 'amis';
import type {CRUDColumnControlState} from './CRUDColumnControl';
import type {ColumnSchema} from 'amis/lib/renderers/Table2';
import type {DSBuilderInterface} from '../../builder';

type InitData = Exclude<CRUDColumnControlState['addModalData'], undefined>;

interface AddColumnModalProps extends ThemeProps {
  visible: boolean;
  initData: InitData;
  ctx: Record<string, any>;
  manager: EditorManager;
  builder: DSBuilderInterface;
  render: RendererProps['render'];
  onConfirm: (scaffold: Record<string, any>) => void;
  onClose: () => void;
}

/** 表单数据 */
interface FormData extends InitData {
  name: string;
  title: string;
  feats: Extract<DSFeatureType, 'View' | 'Edit' | 'Delete'>[];
  viewApi?: string | BaseApiObject;
  editApi?: string | BaseApiObject;
  deleteApi?: string | BaseApiObject;
  __fieldItem: any[];
}

const AddColumnModal: React.FC<AddColumnModalProps> = props => {
  const {
    classnames: cx,
    render,
    visible,
    initData,
    ctx,
    manager,
    builder,
    onConfirm,
    onClose
  } = props;
  const componentId = ctx?.id;
  const modalRef = useRef<any>(null);
  const formRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);

  const handleModalConfirm = useCallback(async () => {
    const form = formRef?.current?.getWrappedInstance?.();
    let schema;
    let errorStack: any;

    setLoading(true);

    if (form) {
      try {
        schema = await form.submit?.(async (values: FormData) => {
          let scaffold;

          if (values.colType === 'field') {
            scaffold = {
              title: values.title,
              name: values.name,
              type: 'tpl'
            };
          } else if (values.colType === 'operation') {
            scaffold = {
              type: 'operation',
              title: '操作',
              buttons: [
                values.feats.includes('View')
                  ? builder.buildViewSchema({
                      feat: 'View',
                      renderer: 'crud',
                      schema: ctx,
                      inScaffold: false,
                      scaffoldConfig: {
                        viewFields: (ctx?.columns ?? []).map(
                          (item: ColumnSchema) => ({
                            inputType: item.type ?? 'input-text',
                            name: item.name,
                            label: item.title
                          })
                        ),
                        viewApi: values?.viewApi
                      }
                    })
                  : undefined,
                values.feats.includes('Edit')
                  ? builder.buildEditSchema({
                      feat: 'View',
                      renderer: 'crud',
                      schema: ctx,
                      inScaffold: false,
                      scaffoldConfig: {
                        editFields: (ctx?.columns ?? []).map(
                          (item: ColumnSchema) => ({
                            inputType: item.type ?? 'input-text',
                            name: item.name,
                            label: item.title
                          })
                        ),
                        editApi: values?.editApi
                      }
                    })
                  : undefined,
                values.feats.includes('Delete')
                  ? builder.buildCRUDDeleteSchema({
                      feat: 'Delete',
                      renderer: 'crud',
                      schema: ctx,
                      inScaffold: false,
                      scaffoldConfig: {
                        deleteApi: values?.deleteApi
                      }
                    })
                  : undefined
              ].filter(Boolean)
            };
          }

          return Promise.resolve(JSONPipeIn(scaffold));
        });
      } catch (error) {
        errorStack = error.stack;
      }
    }

    setLoading(false);

    if (!errorStack) {
      onConfirm(schema);
      onClose?.();
    } else {
      /** 表单校验没通过就不自动关闭Dialog */
      console.error(errorStack);
    }
  }, [onConfirm]);

  return (
    <React.Fragment>
      <Modal
        ref={modalRef}
        size="sm"
        show={visible}
        onHide={onClose}
        closeOnEsc={false}
        contentClassName="ae-Scaffold-Modal"
      >
        <Modal.Header showCloseButton onClose={onClose}>
          <Modal.Title>添加列</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {render(
            'column-control-modal',
            {
              type: 'form',
              title: '',
              mode: 'horizontal',
              horizontal: {
                justify: true,
                leftFixed: 'sm'
              },
              submitOnChange: true,
              wrapWithPanel: false,
              clearValueOnHidden: true,
              preventEnterSubmit: true,
              actions: [],
              body: [
                {
                  type: 'input-tag',
                  name: 'colType',
                  label: '列类型',
                  static: true,
                  className: 'mb-2',
                  options: [
                    {label: '字段列', value: 'field'},
                    {label: '操作列', value: 'operation'}
                  ]
                },
                ...(initData?.colType === 'field'
                  ? [
                      getSchemaTpl('formItemName', {
                        name: 'name',
                        label: '列字段',
                        required: true
                      }),
                      {
                        name: 'title',
                        label: '列标题',
                        type: 'input-text',
                        required: true
                      }
                    ]
                  : []),
                ...(initData?.colType === 'operation'
                  ? [
                      {
                        type: 'checkboxes',
                        label: '数据操作',
                        name: 'feats',
                        joinValues: false,
                        extractValue: true,
                        multiple: true,
                        inline: false,
                        options: [
                          {label: '查看详情', value: 'View'},
                          {label: '编辑记录', value: 'Edit'},
                          {label: '删除记录', value: 'Delete'}
                        ],
                        value: ['View', 'Edit', 'Delete']
                      },
                      ...builder.makeSourceSettingForm({
                        feat: 'View',
                        renderer: 'crud',
                        inScaffold: false,
                        sourceSettings: {
                          name: 'viewApi',
                          visibleOn:
                            "data.feats && data.feats.indexOf('View') > -1"
                        }
                      }),
                      ...builder.makeSourceSettingForm({
                        feat: 'Edit',
                        renderer: 'crud',
                        inScaffold: false,
                        sourceSettings: {
                          name: 'editApi',
                          visibleOn:
                            "data.feats && data.feats.indexOf('Edit') > -1"
                        }
                      }),
                      ...builder.makeSourceSettingForm({
                        feat: 'Delete',
                        renderer: 'crud',
                        inScaffold: false,
                        sourceSettings: {
                          name: 'deleteApi',
                          visibleOn:
                            "data.feats && data.feats.indexOf('Delete') > -1"
                        }
                      })
                    ].filter(i => !!i)
                  : [])
              ]
            },
            {
              ref: formRef,
              popOverContainer: modalRef.current,
              disabled: loading,
              data: utils.createObject(ctx, {...initData})
            }
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onClose}>取消</Button>
          <Button
            loading={loading}
            loadingClassName={cx('ae-CRUDConfigControl-modal-btn-loading')}
            level="primary"
            onClick={handleModalConfirm}
          >
            确定
          </Button>
        </Modal.Footer>
      </Modal>
    </React.Fragment>
  );
};

export default themeable(AddColumnModal);
