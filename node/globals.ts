import { IOClients, ServiceContext } from '@vtex/api'

declare global {
  type Context = ServiceContext<IOClients>
}
