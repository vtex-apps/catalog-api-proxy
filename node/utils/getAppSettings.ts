import { Apps } from '@vtex/api'

import type { AppSettings } from '../typings/AppSettings'

export async function getAppSettings(ctx: Context) {
  const options = { timeout: 8000 }

  const app = new Apps(ctx.vtex, options)

  return app.getAppSettings(
    process.env.VTEX_APP_ID ?? ''
  ) as Promise<AppSettings>
}
