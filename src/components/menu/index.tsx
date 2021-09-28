/**
 * @file Menu
 * @description 导航菜单，基于rc-menu实现：https://github.com/react-component/menu
 * @author fex
 */

import React from 'react';
import omit from 'lodash/omit';
import RcMenu, {
  ItemGroup as RcMenuItemGroup,
  MenuProps as RcMenuProps
} from 'rc-menu';

import {mapTree} from '../../utils/helper';
import {ClassNamesFn, themeable} from '../../theme';
import MenuItem, {LinkItem} from './MenuItem';
import SubMenu from './SubMenu';
import {MenuContext} from './MenuContext';
import {CaretIcon} from '../icons';

export interface Navigation {
  label: string;
  children?: Array<LinkItem>;
  prefix?: JSX.Element;
  affix?: JSX.Element;
  className?: string;
  [propName: string]: any;
}

export interface MenuProps extends RcMenuProps {
  id?: string;
  className?: string;
  classPrefix: string;
  classnames: ClassNamesFn;
  renderLink: Function;
  isActive: Function;
  isOpen: (link: LinkItem) => boolean;
  navigations: Array<Navigation>;

  /**
   * 主题配色
   */
  themeColor?: 'light' | 'dark';

  /**
   * 导航排布方式
   */
  mode?: 'vertical' | 'horizontal';

  /**
   * 菜单是否折叠收起，仅在mode为vertical时生效
   */
  collapsed?: boolean;

  /**
   * 子菜单触发方式
   */
  triggerSubMenuAction?: 'hover' | 'click';

  /**
   * 布局排列方式，默认rtl(right to left)
   */
  direction?: 'rtl' | 'ltr';

  /**
   * mode为horizontal时，Menu折叠状态的图标或文案
   */
  overflowedIndicator?: React.ReactNode;
}

interface MenuState {
  navigations: Array<Navigation>;
  [propName: string]: any;
}

export class Menu extends React.Component<MenuProps, MenuState> {
  static defaultProps: any = {
    collapsed: false,
    themeColor: 'light',
    mode: 'vertical',
    direction: 'ltr',
    triggerSubMenuAction: 'hover',
    renderLink: (item: any) => {
      return <a>{item.label || item?.link?.label}</a>;
    },
    isActive: (link: LinkItem) => link.open,
    isOpen: (item: LinkItem) =>
      item.children ? item.children.some(item => item.open) : false
  };

  constructor(props: MenuProps) {
    super(props);

    const isOpen = props.isOpen;
    let id = 1;

    this.state = {
      navigations: mapTree(
        props.navigations,
        (
          item: Navigation,
          key: number,
          level: number,
          paths: Array<Navigation>
        ) => {
          const isActive =
            typeof item.active === 'undefined'
              ? (props.isActive as Function)(item)
              : item.active;

          return {
            ...item,
            id: id++,
            active: isActive,
            open: isActive || isOpen(item as LinkItem),
            level
          };
        },
        1,
        true
      )
    };
  }

  componentDidUpdate(prevProps: MenuProps) {
    const props = this.props;
    const isOpen = prevProps.isOpen;

    if (
      prevProps.navigations !== props.navigations ||
      prevProps.isActive !== props.isActive
    ) {
      let id = 1;
      this.setState({
        navigations: mapTree(
          props.navigations,
          (item: Navigation) => {
            const isActive =
              typeof item.active === 'undefined'
                ? (props.isActive as Function)(item)
                : item.active;

            return {
              ...item,
              id: id++,
              active: isActive,
              open: isActive || isOpen(item as LinkItem)
            };
          },
          1,
          true
        )
      });
    }
  }

  /**
   *
   */
  renderExpandIcon() {
    const {classnames: cx, mode} = this.props;

    return (
      <span
        key="expand-toggle"
        className={cx('Menu-submenu-arrow')}
        // onClick={e => toggleExpand(link, e)}
      >
        <CaretIcon />
      </span>
    );
  }

  renderMenuList(list: Navigation[]) {
    const {mode} = this.props;

    return list.map(item => {
      if (item.children && item.children.length) {
        return (
          <SubMenu
            id={item.id}
            label={item.label}
            level={item.level}
            disabled={item.disabled}
          >
            {this.renderMenuList(item.children)}
          </SubMenu>
        );
      }
      return (
        <MenuItem
          {...omit(item, 'id', 'label')}
          label={item.label}
          id={item.id}
          level={item.level}
          disabled={item.disabled}
        />
      );
    });
  }

  render() {
    const {
      classPrefix,
      className,
      classnames: cx,
      collapsed,
      themeColor,
      mode,
      triggerSubMenuAction,
      direction,
      overflowedIndicator
    } = this.props;
    const navigations = this.state.navigations;
    const defaultOpenKeys = navigations.map(item => item.id);

    console.log(navigations);

    return (
      <MenuContext.Provider value={{themeColor, mode, collapsed, direction}}>
        <RcMenu
          prefixCls={`${classPrefix}Menu`}
          className={cx(`Menu-${direction}`, className, {
            ['Menu-collapsed']: mode === 'vertical' && collapsed,
            ['Menu-dark']: themeColor === 'dark',
            ['Menu-light']: themeColor === 'light'
          })}
          direction={direction}
          mode={mode === 'vertical' && !collapsed ? 'inline' : mode}
          triggerSubMenuAction={triggerSubMenuAction}
          expandIcon={() => this.renderExpandIcon()}
          overflowedIndicator={
            React.isValidElement(overflowedIndicator) ? (
              overflowedIndicator
            ) : (
              <i className={cx('Menu-overflowedIcon', 'fa fa-ellipsis-h')} />
            )
          }
          overflowedIndicatorPopupClassName={cx({
            ['Menu-overflow-menu-dark']: themeColor === 'dark'
          })}
          defaultOpenKeys={defaultOpenKeys}
        >
          {this.renderMenuList(navigations)}
        </RcMenu>
      </MenuContext.Provider>
    );
  }
}

export default themeable(Menu);
