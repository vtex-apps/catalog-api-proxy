import './globals'

import { Service } from '@vtex/api'

import { catalog } from './handlers/catalog'

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
    catalog,
  }
})
