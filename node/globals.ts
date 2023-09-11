import { ServiceContext, RecorderState } from '@vtex/api'
import { Clients } from './clients'

declare global {
  interface State extends RecorderState {
    userAuthToken?: string
    explicitlyAuthenticated?: boolean
    isImpersonated?: boolean
  }

  type Context = ServiceContext<Clients, State>
}
