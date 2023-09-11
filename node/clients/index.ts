import { IOClients } from '@vtex/api'

import { SalesChannelApi } from './salesChannelApi'

export class Clients extends IOClients {
  public get salesChannelApi() {
    return this.getOrSet('salesChannelApi', SalesChannelApi)
  }
}
