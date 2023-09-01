import { IOClients, ServiceContext, RecorderState } from '@vtex/api'

declare global {
  interface State extends RecorderState {
    userAuthToken?: string
    explicitlyAuthenticated?: boolean
  }

  type Context = ServiceContext<IOClients, State>
}
