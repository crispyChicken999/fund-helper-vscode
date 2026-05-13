// Vue Router 配置

import { createRouter, createWebHistory } from 'vue-router'
import { initApp } from '@/appInit'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '首页' }
    },
    {
      path: '/market',
      name: 'market',
      component: () => import('@/views/MarketView.vue'),
      meta: { title: '行情中心' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: '设置' }
    },
    {
      path: '/fund/:code',
      name: 'fundDetail',
      component: () => import('@/views/FundDetailView.vue'),
      meta: { title: '基金详情' },
      props: true
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  try {
    await initApp()
  } catch (e) {
    console.error('应用初始化失败:', e)
  }
  if (to.meta.title) {
    document.title = `${to.meta.title} - 基金助手`
  }
  next()
})

export default router
