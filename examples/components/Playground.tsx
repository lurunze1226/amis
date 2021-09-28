/*
 * @description
 * @file        /amis/examples/components/Playground.tsx
 * @author      lurunze@baidu.com
 */

import React from 'react';
import cx from 'classnames';
import NotFound from '../../src/components/404';
import Layout from '../../src/components/Layout';
import AsideNav from '../../src/components/AsideNav';
import Menu from '../../src/components/menu';
import {
  AlertComponent,
  Button,
  Drawer,
  ToastComponent
} from '../../src/components/index';
import {eachTree, mapTree} from '../../src/utils/helper';

import {
  Router,
  Route,
  IndexRoute,
  browserHistory,
  hashHistory,
  Link,
  Redirect,
  withRouter
} from 'react-router';

export default class Playground extends React.PureComponent<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {};
  }

  render() {
    const navigationsRaw = [
      {
        label: 'A',
        icon: 'icon-api',
        children: [
          {
            label: 'A-1',
            path: '/zh-CN/components/index',
            icon: 'icon-setting'
          },
          {
            label: '超过十六个字符串设计六六六六六六七',
            path: '/zh-CN/components/page'
          }
        ]
      },
      {
        label: 'B超过十六个字符串设计六六六六六六七',
        children: [
          {
            label: 'B-1',
            path: '/zh-CN/components/action',
            disabled: true
          },
          {
            label: 'B-2',
            path: '/zh-CN/components/app',
            disabled: true
          },
          {
            label: 'B-3',
            path: '/zh-CN/components/button'
          }
        ]
      },
      {
        label: 'not-disbaled',
        path: '/zh-CN/components/button'
      },
      {
        label: 'FFF',
        path: '/zh-CN/components/action',
        icon: 'icon-moladb-new',
        disabled: true
      },
      {
        label: 'CCCCCC',
        disabled: true,
        children: [
          {
            label: 'C-1',
            children: [
              {
                label: 'C-1-1',
                path: '/zh-CN/components/action'
              }
            ]
          }
        ]
      },
      {
        label: 'DDDDDDDD',
        children: [
          {
            label: 'D-1',
            children: [
              {
                label: 'D-1-1',
                path: '/zh-CN/components/action'
              }
            ]
          },
          {
            label: 'D-2',
            children: [
              {
                label: 'D-2-1',
                path: '/zh-CN/components/action'
              }
            ]
          }
        ]
      },
      {
        label: 'E',
        children: [
          {
            label: 'E-1',
            children: [
              {
                label: 'E-1-1',
                path: '/zh-CN/components/action'
              }
            ]
          }
        ]
      }
    ];

    const saasNav = [
      {
        label: '应用开发',
        children: [
          {
            label: '页面管理',
            icon: 'iconfont icon-file-list',
            path: '/admin/page/:id',
            url: '/admin/page/home',
            permission: 'admin:page:?'
          },

          {
            label: 'API 中心',
            icon: 'iconfont icon-api',
            path: '/admin/api/:groupKey',
            url: '/admin/api/default'
          },

          {
            label: '实体管理',
            icon: 'iconfont icon-moladb-new',
            permission: 'admin:model:?',
            path: '/admin/model/:dsId',
            url: '/admin/model/default',
            children: [
              {
                hidden: true,
                label: '数据管理',
                icon: 'iconfont icon-database',
                path: '/admin/model-data/:dsId/:mId',
                url: '/admin/model-data/default/default',
                permission: 'admin:app:dataManage'
              }
            ]
          },

          {
            label: '应用发布',
            icon: 'iconfont icon-deploy',
            path: '/admin/release',
            permission: 'admin:app:publish'
          },
          {
            label: '应用设置',
            icon: 'iconfont icon-setting',
            path: '/admin/setting',
            permission: 'admin:app:setting'
          },
          {
            label: '全局查找',
            icon: 'iconfont icon-new-search',
            path: '/admin/search',
            permission: 'admin:app:setting'
          }
        ]
      },
      {
        label: '应用管理',
        children: []
      }
    ];

    return (
      <section style={{display: 'flex', flexFlow: 'row nowrap'}}>
        <div style={{width: '500px', marginRight: '20px'}}>
          {/* <Menu navigations={navigationsRaw} />
          <Menu
            navigations={navigationsRaw}
            collapsed
            isActive={(link: any) => false}
          />
          <Menu
            mode="horizontal"
            navigations={navigationsRaw}
            isActive={(link: any) => false}
          /> */}
        </div>
        <div style={{width: '400px'}}>
          <Menu navigations={saasNav} themeColor="dark" />

          {/* <Menu
            navigations={navigationsRaw}
            collapsed
            themeColor="dark"
            isActive={(link: any) => false}
          />*/}

          <Menu
            mode="horizontal"
            themeColor="dark"
            navigations={saasNav}
            isActive={(link: any) => false}
          />
        </div>
      </section>
    );
  }
}
