import './globals'

import { Service } from '@vtex/api'

import { prepare } from './middlewares/prepare'
import { request } from './middlewares/request'

const TWO_SECONDS_MS =  2 * 1000

export default new Service({
  clients: {
    options: {
      default: {
        retries: 1,
        timeout: TWO_SECONDS_MS,
      },
    }
  },
  routes: {
    catalog: [prepare(false), request],
    authenticatedCatalog: [prepare(true), request],
  }
})
