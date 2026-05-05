import { Ball } from '../models/Ball'
import { BallTouch } from '../models/BallTouch'
import { Event } from './Event'
import { PlayerSummary } from '../models/PlayerSummary'
import { Vector3 } from '../models/Vector3'

export interface CrossbarHitEvent extends Event {
    ball: Ball
    impactForce: number
    lastTouch: BallTouch
}