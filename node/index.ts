import './globals'

import {
    Cached,
    ClientsConfig,
    Service,
    LRUCache,
    ParamsContext,
    RecorderState,
  } from '@vtex/api'
import { Clients } from './clients/'

import { prepare } from './middlewares/prepare'
import { request } from './middlewares/request'
import { warmup } from './middlewares/warmup'

process.env.DETERMINISTIC_VARY = 'true'

const TEN_SECONDS_MS =  2 * 5000
const FIVE_MINUTES_CACHE = 5 * 1000 * 60

const salesChannelCache = new LRUCache<string, Cached>({ max: FIVE_MINUTES_CACHE })

metrics.trackCache('vbase', salesChannelCache)

const clients: ClientsConfig<Clients> = {
  implementation: Clients,
  options: {
    default: {
      retries: 1,
      timeout: TEN_SECONDS_MS,
    },
    salesChannelApi:{
      retries: 1,
      concurrency: 10,
      memoryCache: salesChannelCache,
    }
  }
}

export default new Service<Clients, RecorderState, ParamsContext>({
  clients,
  routes: {
    catalog: [prepare(false), request],
    authenticatedCatalog: [prepare(true), request],
    keepAlive:[warmup]
  }
})
