import { createApp, h } from 'vue'
import {
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NNotificationProvider,
} from 'naive-ui'
import { MotionPlugin } from '@vueuse/motion'

const themeOverrides = {
  common: {
    primaryColor: '#4a9eff',
    primaryColorHover: '#3388ee',
    primaryColorPressed: '#2477d6',
    primaryColorSuppl: '#76b8ff',
    infoColor: '#4a9eff',
    borderRadius: '6px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  Button: {
    colorPrimary: '#4a9eff',
    colorHoverPrimary: '#3388ee',
    colorPressedPrimary: '#2477d6',
  },
}

/** Mount an extension page with the shared Naive UI theme and motion runtime. */
export function mountApp(App) {
  const Root = {
    render: () => h(NConfigProvider, { themeOverrides }, {
      default: () => h(NMessageProvider, null, {
        default: () => h(NNotificationProvider, null, {
          default: () => h(NDialogProvider, null, {
            default: () => h(App),
          }),
        }),
      }),
    }),
  }

  createApp(Root).use(MotionPlugin).mount('#app')
}
