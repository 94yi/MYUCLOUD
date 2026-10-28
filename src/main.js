import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'
import './vendor/perrin/tokens.css'
import './workspace.css'
if (import.meta.env.MODE !== 'pages' && import.meta.env.MODE !== 'snoval') import('./local-fonts.css')

createApp(App).mount('#app')
