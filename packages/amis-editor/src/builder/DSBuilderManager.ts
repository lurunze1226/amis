/**
 * @file DSBuilderManager
 * @desc 数据源构造管理器
 */

import {builderFactory, DSBuilderInterface} from './DSBuilder';
import {EditorManager} from 'amis-editor-core';

export class DSBuilderManager {
  private builders: Map<string, DSBuilderInterface>;

  constructor(manager: EditorManager) {
    this.builders = new Map();

    builderFactory.forEach((Builder, key) => {
      this.builders.set(key, new Builder(manager));
    });
  }

  get size() {
    return this.builders.size;
  }

  getBuilderByKey(key: string) {
    return this.builders.get(key);
  }

  getBuilderByScaffoldSetting(scaffoldConfig: any) {
    return this.builders.get(scaffoldConfig.dsType);
  }

  getBuilderBySchema(schema: any) {
    let builder: DSBuilderInterface;

    this.builders.forEach(value => {
      if (value.match(schema)) {
        builder = value;
        return;
      }
    });

    return builder!;
  }

  getDefaultBuilderKey() {
    const sorted = Array.from(this.builders.entries()).sort((lhs, rhs) => {
      return (lhs[1].order ?? 0) - (rhs[1].order ?? 0);
    });

    return sorted[0][0];
  }

  getAvailableBuilders() {
    return Array.from(this.builders.entries())
      .filter(item => item[1]?.defaultHidden !== true)
      .sort((lhs, rhs) => {
        return (lhs[1].order ?? 0) - (rhs[1].order ?? 0);
      });
  }

  getDSSelectorSchema(patch: Record<string, any>) {
    const builders = this.getAvailableBuilders();
    const options = builders.map(([key, builder]) => ({
      label: builder.name,
      value: key
    }));

    return {
      type: 'radios',
      label: '数据来源',
      name: 'dsType',
      visible: options.length > 0,
      selectFirst: true,
      options: options,
      ...patch
    };
  }

  buildCollectionFromBuilders(
    callback: (
      builder: DSBuilderInterface,
      builderKey: string,
      index: number
    ) => any
  ) {
    const builders = this.getAvailableBuilders();
    const collection = builders
      .map(([key, builder], index) => {
        return callback(builder, key, index);
      })
      .filter(Boolean);

    return collection;
  }
}
