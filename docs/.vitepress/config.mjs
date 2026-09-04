export default {
  title: 'Flash Technical Knowledge Base',
  description: 'Embedded storage and low-level Flash development guide',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Flash Guide', link: '/flash/terminology' }
    ],
    sidebar: {
      '/flash/': [
        {
          text: 'Flash Architecture',
          items: [
            { text: 'Flash Terminology', link: '/flash/terminology' },
            { text: 'Controller Interface', link: '/flash/controller' },
            { text: 'Flash Operations', link: '/flash/operations' },
            { text: 'Bad Block Management', link: '/flash/management' }
          ]
        }
      ]
    }
  }
}
