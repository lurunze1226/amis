/**
 * @file SubMenu
 * @description 导航子菜单
 * @author fex
 */

import React from 'react';
import {SubMenu as RcSubMenu} from 'rc-menu';
import omit from 'lodash/omit';

import {ClassNamesFn, themeable} from '../../theme';
import {MenuContextProps, MenuContext} from './MenuContext';
import {CaretIcon} from '../icons';

interface MenuTitleInfo {
  key: string;
  domEvent: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>;
}

export interface SubMenuProps {
  className?: string;
  popupClassName?: string;
  classPrefix: string;
  classnames: ClassNamesFn;
  label: string | React.ReactElement;
  id?: string | number;
  level?: number;
  children?: React.ReactNode;
  icon?: string | React.ReactNode;
  expandIcon?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  onTitleMouseEnter?: (e: MenuTitleInfo) => void;
  onTitleMouseLeave?: (e: MenuTitleInfo) => void;
  onTitleClick?: (e: MenuTitleInfo) => void;
  [propName: string]: any;
}

export function SubMenu(props: SubMenuProps) {
  const {collapsed, mode, themeColor} = React.useContext(MenuContext);
  const {
    className,
    popupClassName,
    classnames: cx,
    label,
    icon,
    level,
    disabled
  } = props;
  const iconNode = icon ? (
    typeof icon === 'string' ? (
      <i key="icon" className={cx(`Menu-item-icon iconfont`, icon)} />
    ) : React.isValidElement(icon) ? (
      icon
    ) : null
  ) : null;
  const labelNode =
    label && typeof label === 'string' ? (
      <span
        className={cx(`Menu-item-label`, {
          ['Menu-item-label-collapsed']: collapsed && level === 1
        })}
      >
        {collapsed ? label.slice(0, 1) : label}
      </span>
    ) : React.isValidElement(label) ? (
      label
    ) : null;
  const expandIconNode =
    mode === 'horizontal' ? (
      <span key="expand-toggle" className={cx('Menu-submenu-arrow')}>
        <CaretIcon />
      </span>
    ) : null;

  return (
    <RcSubMenu
      {...omit(props, 'label', 'id', 'classPrefix', 'classnames', 'theme')}
      className={cx(
        'Menu-submenu',
        {
          ['Menu-submenu-dark']: themeColor === 'dark'
        },
        className
      )}
      popupClassName={cx(
        'Menu-submenu-popup',
        {
          ['Menu-submenu-popup-dark']: themeColor === 'dark'
        },
        popupClassName
      )}
      disabled={disabled}
      title={
        level === 1 && collapsed ? (
          iconNode || labelNode
        ) : (
          <>
            {iconNode}
            {labelNode}
            {expandIconNode}
          </>
        )
      }
    />
  );
}

export default themeable(SubMenu);
