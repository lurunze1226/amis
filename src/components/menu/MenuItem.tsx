/**
 * @file MenuItem
 * @description 导航项目
 * @author fex
 */

import React from 'react';
import {Link} from 'react-router';
import omit from 'lodash/omit';
import {Item} from 'rc-menu';
import TooltipWrapper, {Trigger} from '../TooltipWrapper';

import {mapTree, autobind} from '../../utils/helper';
import {ClassNamesFn, themeable} from '../../theme';
import {MenuContextProps, MenuContext} from './MenuContext';

export type LinkItem = LinkItemProps;

interface MenuTitleInfo {
  key: string;
  domEvent: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>;
}

interface LinkItemProps {
  id?: number;
  label: string;
  hidden?: boolean;
  open?: boolean;
  className?: string;
  children?: Array<LinkItem>;
  path?: string;
  icon?: string;
  component?: React.ReactType;
}

export interface MenuItemProps {
  id?: number;
  label: string;
  eventKey?: string;
  hidden?: boolean;
  open?: boolean;
  className?: string;
  children?: React.ReactNode;
  path?: string;
  icon?: string | React.ReactNode;
  level?: number;
  component?: React.ReactType;
  classPrefix: string;
  classnames: ClassNamesFn;
  disabled?: boolean;
  disabledTip?: string;
  tooltipContainer?: any;
  tooltipTrigger?: Trigger | Array<Trigger>;
  onMouseEnter?: (e: MenuTitleInfo) => void;
  onMouseLeave?: (e: MenuTitleInfo) => void;
  onClick?: (e: MenuTitleInfo) => void;
}

export class MenuItem extends React.Component<MenuItemProps> {
  static defaultProps: Pick<MenuItemProps, 'tooltipTrigger' | 'disabled'> = {
    disabled: false,
    tooltipTrigger: ['hover', 'focus']
  };

  static contextType = MenuContext;

  container: React.RefObject<any> = React.createRef();

  context: MenuContextProps;

  constructor(props: MenuItemProps) {
    super(props);
  }

  renderMenuItem() {
    const {classnames: cx, icon, label, path, level} = this.props;
    const {collapsed} = this.context;
    const shouldSimplified = collapsed && level === 1;

    const iconNode = icon ? (
      typeof icon === 'string' ? (
        <i key="icon" className={cx(`Menu-item-icon iconfont`, icon)} />
      ) : React.isValidElement(icon) ? (
        icon
      ) : null
    ) : null;
    const labelNode =
      label && typeof label === 'string' ? (
        <Link
          className={cx(`Menu-item-label`, {
            ['Menu-item-label-collapsed']: shouldSimplified
          })}
          to={path || ''}
        >
          {shouldSimplified ? label.slice(0, 1) : label}
        </Link>
      ) : null;

    if (shouldSimplified) {
      return iconNode || labelNode;
    }

    return (
      <>
        {iconNode}
        {labelNode}
      </>
    );
  }

  render() {
    const {
      className,
      classnames: cx,
      label,
      disabled,
      disabledTip,
      tooltipContainer,
      tooltipTrigger,
      eventKey,
      onMouseEnter,
      onMouseLeave,
      onClick,
      level
    } = this.props;
    const {collapsed, mode, themeColor, direction} = this.context;
    const showToolTip = mode === 'vertical' && collapsed && level === 1;

    return (
      <TooltipWrapper
        tooltipClassName={cx('Menu-item-tooltip', {
          ['Menu-item-tooltip-dark']: themeColor === 'dark'
        })}
        placement={direction === 'rtl' ? 'left' : 'right'}
        tooltip={disabled ? disabledTip : showToolTip ? label : ''}
        container={tooltipContainer}
        trigger={tooltipTrigger}
        rootClose
      >
        <Item
          {...omit(
            this.props,
            'label',
            'id',
            'classPrefix',
            'classnames',
            'theme',
            'tooltipTrigger'
          )}
          className={cx(className)}
          eventKey={eventKey}
          disabled={disabled}
        >
          {this.renderMenuItem()}
        </Item>
      </TooltipWrapper>
    );
  }
}

export default themeable(MenuItem);
