import React, {useEffect, useCallback} from 'react';
import pick from 'lodash/pick';
import {
  noop,
  themeable,
  ThemeProps,
  localeable,
  LocaleProps,
  uncontrollable,
  isObject
} from 'amis-core';

import {FormulaEditor, VariableItem} from './Editor';
import ResultBox from '../ResultBox';
import Select from '../Select';
import NumberInput from '../NumberInput';
import DatePicker from '../DatePicker';
import Tag from '../Tag';

import type {Option} from 'amis-core';
import type {FormulaPickerProps} from './Picker';

export interface FormulaInputProps
  extends Pick<
      FormulaPickerProps,
      | 'className'
      | 'disabled'
      | 'evalMode'
      | 'allowInput'
      | 'placeholder'
      | 'clearable'
      | 'borderMode'
      | 'variables'
      | 'inputSchema'
    >,
    ThemeProps,
    LocaleProps {
  /**
   * 输入值
   */
  value?: string;

  popOverContainer?: any;

  /**
   * Change事件回调
   */
  onChange?: (value: string | any[]) => void;

  /**
   * 子元素渲染
   */
  itemRender?: (value: any) => JSX.Element | string;
}

const FormulaInput: React.FC<FormulaInputProps> = props => {
  const {
    translate: __,
    className,
    classnames: cx,
    allowInput,
    placeholder,
    borderMode,
    evalMode,
    value,
    variables,
    inputSchema = {type: 'text'},
    popOverContainer,
    onChange,
    itemRender
  } = props;
  const schemaType = inputSchema.type;
  /** 自上层共享的属性 */
  const sharedProps = pick(props, ['disabeld', 'clearable']);
  const pipInValue = useCallback(
    (value?: any) => {
      return value;
    },
    ['value']
  );
  const pipOutValue = useCallback(
    (origin: any) => {
      let result = origin;

      if (schemaType === 'boolean') {
        result = origin.value;
      } else if (schemaType === 'select') {
        result = Array.isArray(origin)
          ? origin.map(item => item.value)
          : origin.value;
      }
      onChange?.(result);
    },
    ['onChange']
  );

  if (schemaType === 'number') {
    return (
      <NumberInput
        {...sharedProps}
        className={cx(className, 'FormulaPicker-input-number')}
        borderMode="none"
        placeholder={__(placeholder ?? 'NumberInput.placeholder')}
        step={inputSchema.step}
        min={inputSchema.minimum}
        max={inputSchema.maximum}
        precision={inputSchema.precision}
        value={pipInValue(value ?? inputSchema.defaultValue)}
        onChange={pipOutValue}
      />
    );
  } else if (schemaType === 'date') {
    return (
      <DatePicker
        {...sharedProps}
        className={cx(className, 'FormulaPicker-input-date')}
        borderMode="none"
        placeholder={__(placeholder ?? 'Date.placeholder')}
        format={inputSchema.format || 'YYYY-MM-DD'}
        inputFormat={inputSchema.inputFormat || 'YYYY-MM-DD'}
        timeFormat=""
        popOverContainer={popOverContainer}
        value={pipInValue(value ?? inputSchema.defaultValue)}
        onChange={pipOutValue}
      />
    );
  } else if (schemaType === 'time') {
    return (
      <DatePicker
        {...sharedProps}
        className={cx(className, 'FormulaPicker-input-time')}
        viewMode="time"
        borderMode="none"
        placeholder={__(placeholder ?? 'Time.placeholder')}
        format={inputSchema.format || 'HH:mm'}
        inputFormat={inputSchema.inputFormat || 'HH:mm'}
        dateFormat=""
        timeFormat={inputSchema.format || 'HH:mm'}
        popOverContainer={popOverContainer}
        value={pipInValue(value ?? inputSchema.defaultValue)}
        onChange={pipOutValue}
      />
    );
  } else if (schemaType === 'datetime') {
    return (
      <DatePicker
        {...sharedProps}
        className={cx(className, 'FormulaPicker-input-datetime')}
        borderMode="none"
        placeholder={__(placeholder ?? 'Time.placeholder')}
        format={inputSchema.format || ''}
        inputFormat={inputSchema.inputFormat || 'YYYY-MM-DD HH:mm'}
        timeFormat={inputSchema.timeFormat || 'HH:mm'}
        popOverContainer={popOverContainer}
        value={pipInValue(value ?? inputSchema.defaultValue)}
        onChange={pipOutValue}
      />
    );
  } else if (schemaType === 'select' || schemaType === 'boolean') {
    return (
      <Select
        {...sharedProps}
        className={cx(className, `FormulaPicker-input-${schemaType}`)}
        borderMode="none"
        multiple={inputSchema.multiple}
        options={
          schemaType === 'boolean'
            ? [
                {
                  label: __(inputSchema?.trueLabel ?? 'FormulaInput.True'),
                  value: true
                },
                {
                  label: __(inputSchema?.falseLabel ?? 'FormulaInput.False'),
                  value: false
                }
              ]
            : inputSchema.options ?? []
        }
        value={pipInValue(value)}
        renderValueLabel={option => {
          const label = option.label?.toString() ?? '';

          return schemaType === 'boolean' || !inputSchema.multiple ? (
            <Tag label={label} className={cx('rounded')} />
          ) : (
            <>{label}</>
          );
        }}
        onChange={pipOutValue}
      />
    );
  } else {
    return (
      <ResultBox
        {...sharedProps}
        className={cx(className)}
        allowInput={allowInput}
        borderMode={borderMode}
        placeholder={placeholder}
        value={pipInValue(value)}
        result={
          allowInput || !value
            ? void 0
            : FormulaEditor.highlightValue(value, variables!, evalMode)
        }
        itemRender={itemRender}
        onResultChange={noop}
        onChange={pipOutValue}
      />
    );
  }
};

export default themeable(
  localeable(
    uncontrollable(FormulaInput, {
      value: 'onChange'
    })
  )
);
