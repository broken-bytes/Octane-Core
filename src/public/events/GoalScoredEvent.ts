import { Event } from './Event'
import { PlayerSummary } from '../models/PlayerSummary'
import { Vector3 } from '../models/Vector3'
import { BallTouch } from '../models/BallTouch'

export interface GoalScoredEvent extends Event {
    goalSpeed: number
    goalTime: number
    impactLocation: Vector3
    scorer: PlayerSummary
    assister: PlayerSummary
    lastTouch: BallTouch
}