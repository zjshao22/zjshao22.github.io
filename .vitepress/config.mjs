import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '零肆の知识库',
  description: '记录学习的点点滴滴',
  srcDir: 'docs',

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }]
  ],

  themeConfig: {
    logo: '/logo.svg',
    name: '零肆',

    nav: [
      { text: '首页', link: '/' },
      { text: '前端', link: '/frontend/' },
      { text: '后端', link: '/backend/' },
      { text: 'DevOps', link: '/devops/' },
      { text: 'AI', link: '/ai/' },
      { text: '关于', link: '/about/' }
    ],

    sidebar: {
      '/frontend/': [
        {
          text: '前端',
          items: [
            { text: '概览', link: '/frontend/' },
            { text: 'JavaScript', link: '/frontend/javascript/' },
            { text: 'TypeScript', link: '/frontend/typescript/' },
            { text: 'Vue', link: '/frontend/vue/' },
            { text: 'CSS', link: '/frontend/css/' }
          ]
        }
      ],
      '/backend/': [
        {
          text: '后端',
          items: [
            { text: '概览', link: '/backend/' },
            { text: 'Python', link: '/backend/python/' },
            { text: 'Node.js', link: '/backend/nodejs/' },
            { text: '数据库', link: '/backend/database/' },
            { text: 'API 设计', link: '/backend/api/' }
          ]
        }
      ],
      '/devops/': [
        {
          text: 'DevOps',
          items: [
            { text: '概览', link: '/devops/' },
            { text: 'Docker', link: '/devops/docker/' },
            { text: 'Linux', link: '/devops/linux/' },
            { text: 'CI/CD', link: '/devops/cicd/' },
            { text: 'Nginx', link: '/devops/nginx/' }
          ]
        }
      ],
      '/ai/': [
        {
          text: 'AI',
          items: [
            { text: '概览', link: '/ai/' },
            { text: 'LLM', link: '/ai/llm/' },
            { text: 'Prompt 工程', link: '/ai/prompt/' },
            { text: '机器学习', link: '/ai/ml/' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zjshao22' }
    ],

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024-present 零肆'
    },

    search: {
      provider: 'local'
    }
  }
})
