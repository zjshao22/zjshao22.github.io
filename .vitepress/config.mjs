import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '知识库',
  description: '个人知识记录',
  srcDir: 'docs',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '首页', link: '/' },
      { text: '笔记', link: '/notes/' },
      { text: '关于', link: '/about/' }
    ],

    sidebar: {
      '/notes/': [
        {
          text: '笔记',
          items: [
            { text: '快速开始', link: '/notes/' },
            { text: 'JavaScript', link: '/notes/javascript/' },
            { text: 'Python', link: '/notes/python/' },
            { text: 'DevOps', link: '/notes/devops/' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zjshao22' }
    ],

    footer: {
      message: 'Released under MIT License.',
      copyright: 'Copyright © 2024-present'
    },

    search: {
      provider: 'local'
    }
  }
})
