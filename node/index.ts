import './globals'

import { IOClients, Service } from '@vtex/api'
import { catalog } from './handlers/catalog'

const TWO_SECONDS_MS =  2 * 1000

export { Runtime } from '@vtex/api'

export default new Service<IOClients>({
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
