import isEqual from 'lodash/isEqual';
import isFunction from 'lodash/isFunction';
import {RendererEvent} from '../utils/renderer-event';
import {setVariable, cloneObject, createObject} from '../utils/object';
import {
  RendererAction,
  ListenerAction,
  ListenerContext,
  registerAction
} from './Action';
import type {ScopedComponentType} from '../Scoped';

export interface ICmptAction extends ListenerAction {
  actionType:
    | 'setValue'
    | 'static'
    | 'nonstatic'
    | 'show'
    | 'hidden'
    | 'enabled'
    | 'disabled'
    | 'reload';
  args: {
    value?: string | {[key: string]: string};
    index?: number; // setValue支持更新指定索引的数据，一般用于数组类型
    /** 变量的路径, 包含变量的命名空间, 如果setValue动作包含该参数, 则认为是变量赋值 */
    variablePath?: string;
  };
}

/**
 * 组件动作
 *
 * @export
 * @class CmptAction
 * @implements {Action}
 */
export class CmptAction implements RendererAction {
  async run(
    action: ICmptAction,
    renderer: ListenerContext,
    event: RendererEvent<any>
  ) {
    /**
     * 根据唯一ID查找指定组件
     * 触发组件未指定id或未指定响应组件componentId，则使用触发组件响应
     */
    const component =
      action.componentId && renderer.props.$schema.id !== action.componentId
        ? event.context.scoped?.getComponentById(action.componentId)
        : renderer;
    const dataMergeMode = action.dataMergeMode || 'merge';

    // 显隐&状态控制
    if (['show', 'hidden'].includes(action.actionType)) {
      return renderer.props.topStore.setVisible(
        action.componentId,
        action.actionType === 'show'
      );
    } else if (['static', 'nonstatic'].includes(action.actionType)) {
      return renderer.props.topStore.setStatic(
        action.componentId,
        action.actionType === 'static'
      );
    } else if (['enabled', 'disabled'].includes(action.actionType)) {
      return renderer.props.topStore.setDisable(
        action.componentId,
        action.actionType === 'disabled'
      );
    }

    /**
     * 数据更新, 分为2种类型:
     * 如果args中携带variablePath参数, 则认为是变量赋值, 否则认为是组件数据更新
     */
    if (action.actionType === 'setValue') {
      const env = renderer?.props?.env ?? {};
      const {session = 'gloabl', variable: variableConfig} = env;
      const variablePath = action?.args?.variablePath;

      if (
        variablePath &&
        typeof variablePath === 'string' &&
        variableConfig &&
        variableConfig.namespace &&
        typeof variableConfig.namespace === 'string'
      ) {
        const {value} = action.args;
        /** 更新后的数据, 从args中拿到的是上一次的值, 所以优先从event data中获取 */
        const updatedValue = event?.data?.value ?? value;
        const {namespace, beforeSetData} = variableConfig;

        if (!isFunction(beforeSetData)) {
          return;
        }

        /** 更新变量数据，仅处理当前session的组件 */
        const cmptList: ScopedComponentType[] =
          event.context.scoped.getComponentByVariablePath(
            session,
            namespace,
            variablePath
          );

        for (const component of cmptList) {
          const cmptPath = component?.props?.$path;
          const triggeredPath = renderer?.props?.$path;

          /** 非Isolate Scope组件过滤掉自身, 避免循环更新 */
          if (
            !component.setData &&
            (cmptPath === triggeredPath ||
              isEqual(component?.props?.$schema, renderer?.props?.$schema))
          ) {
            continue;
          }

          if (isFunction(component?.setData)) {
            const newData = beforeSetData(
              updatedValue,
              variablePath,
              component?.props?.data,
              true
            );

            component.setData(newData, false);
          } else if (isFunction(component?.props?.onChange)) {
            const submitOnChange = !!component?.props?.$schema?.submitOnChange;
            const newData = beforeSetData(
              updatedValue,
              variablePath,
              component?.props?.data,
              false
            );

            component.props.onChange(newData, submitOnChange, true);
          }
        }
        return;
      } else {
        if (component?.setData) {
          return component?.setData(
            action.args?.value,
            dataMergeMode === 'override',
            action.args?.index
          );
        } else {
          return component?.props.onChange?.(action.args?.value);
        }
      }
    }

    // 刷新
    if (action.actionType === 'reload') {
      return component?.reload?.(
        undefined,
        action.data,
        undefined,
        undefined,
        dataMergeMode === 'override',
        action.args
      );
    }

    // 执行组件动作
    return component?.doAction?.(action, action.args);
  }
}

registerAction('component', new CmptAction());
