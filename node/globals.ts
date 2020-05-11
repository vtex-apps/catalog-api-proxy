import { IOClients, ServiceContext, RecorderState } from '@vtex/api'

declare global {
  interface State extends RecorderState {
    userAuthToken?: string
  }

  type Context = ServiceContext<IOClients, State>
}
