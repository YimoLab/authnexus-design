import { createApp } from 'vue'
import App from './App.vue'

/* 设计系统样式：按 docs/ADOPT.md 的顺序引入（fonts 最先）——
   示例通过相对路径直接引用仓库资产，复制到新项目时改为你项目里的路径即可 */
import '../../../fonts/fonts.css'
import '../../../css/tokens.css'
import '../../../css/brand.css'
import '../../../css/base.css'
import '../../../css/components.css'
import '../../../css/motion.css'

createApp(App).mount('#app')
