import { IOClients, ServiceContext, RecorderState } from '@vtex/api'

declare global {
  interface State extends RecorderState {
    userAuthToken?: string
    explicitlyAuthenticated?: boolean
    isImpersonated?: boolean
  }

  type Context = ServiceContext<IOClients, State>
}
