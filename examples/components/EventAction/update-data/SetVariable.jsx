/**
 * @file 变量更新示例
 */
import update from 'lodash/update';
import {extendObjectSuperByKey, cloneObject, setVariable} from 'amis-core';

const namespace = 'appVariables';
const initData = {
  ProductName: 'BCC',
  Banlance: 1234.888,
  ProductNum: 10,
  isOnline: false,
  ProductList: ['BCC', 'BOS', 'VPC'],
  PROFILE: {
    FirstName: 'Amis',
    Age: 18,
    Address: {
      street: 'ShangDi',
      postcode: 100001
    }
  }
};

export default {
  /** schema配置 */
  schema: {
    type: 'page',
    title: '更新变量数据',
    body: [
      {
        type: 'tpl',
        tpl: '变量的命名空间通过环境变量设置为了<code>appVariables</code>, 可以通过\\${appVariables.xxx}来取值'
      },
      {
        type: 'container',
        style: {
          padding: '8px',
          marginBottom: '8px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        },
        body: [
          {
            type: 'tpl',
            tpl: '<h2>数据域appVariables</h2>'
          },
          {
            type: 'json',
            id: 'u:44521540e64c',
            source: '${appVariables}',
            levelExpand: 10
          },
          {
            type: 'tpl',
            tpl: '<h3>接口中的<code>ProductName (\\${ProductName})</code>: <strong>${ProductName|default:-}</strong></h3>',
            inline: false,
            id: 'u:98ed5c5534ef'
          },
          {
            type: 'tpl',
            tpl: '<h3>变量中的<code>ProductName (\\${appVariables.ProductName})</code>: <strong>${appVariables.ProductName|default:-}</strong></h3>',
            inline: false,
            id: 'u:98ed5c5534ef'
          }
        ]
      },
      {
        type: 'form',
        title: '表单',
        body: [
          {
            label: '产品名称',
            type: 'input-text',
            placeholder: '请输入内容, 观察引用变量组件的变化',
            id: 'u:d9802fd83145',
            onEvent: {
              change: {
                weight: 0,
                actions: [
                  {
                    args: {
                      variablePath: 'appVariables.ProductName',
                      value: '${event.data.value}'
                    },
                    actionType: 'setValue'
                  }
                ]
              }
            }
          },
          {
            type: 'static',
            label: '产品名称描述',
            id: 'u:7bd4e2a4f95e',
            value: '${appVariables.ProductName}',
            name: 'staticName'
          }
        ],
        id: 'u:dc2580fa447a'
      }
    ],
    initApi: '/api/variable/initData',
    onEvent: {
      inited: {
        weight: 0,
        actions: [
          {
            args: {
              variablePath: 'appVariables.ProductName',
              value: '${event.data.ProductName}'
            },
            actionType: 'setValue'
          }
        ]
      }
    }
  },
  /** 环境变量 */
  env: {
    variable: {
      id: namespace,
      namespace,
      data: initData,
      beforeSetData: (value, path, ctx, isIsolated) => {
        const varPath = path.replace(/^appVariables\./, '');

        update(initData, varPath, origin => {
          return typeof value === typeof origin ? value : origin;
        });

        if (!isIsolated) {
          return value;
        }

        const newCtx = cloneObject(ctx);
        setVariable(newCtx.__super, path, value, true);

        return newCtx;
      },
      beforeInitRootData: ctx => {
        return extendObjectSuperByKey(ctx, initData, namespace);
      }
    }
  }
};
