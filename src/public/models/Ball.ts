import { Vector3 } from './Vector3'

export interface Ball {
    location?: Vector3
    speed?: number
    preHitSpeed?: number
    postHitSpeed?: number
    teamId?: number
}