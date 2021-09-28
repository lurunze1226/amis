/**
 * @file Menu
 * @description 导航菜单上下文
 * @author fex
 */

import {createContext} from 'react';

export interface MenuContextProps {
  themeColor?: 'light' | 'dark';
  mode?: 'vertical' | 'horizontal';
  collapsed?: boolean;
  direction?: 'ltr' | 'rtl';
}

export const MenuContext = createContext<MenuContextProps>({
  themeColor: 'dark',
  mode: 'vertical',
  collapsed: false,
  direction: 'ltr'
});
