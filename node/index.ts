import './globals'

import { IOClients, Service } from '@vtex/api'
import { catalog } from './handlers/catalog'

const FOUR_SECONDS_MS =  4 * 1000

const retryConfig = {
  retries: 1,
}

export { Runtime } from '@vtex/api'

export default new Service<IOClients>({
  clients: {
    options: {
      default: {
        retryConfig,
        timeout: FOUR_SECONDS_MS,
      },
    }
  },
  routes: {
    catalog,
  }
})
