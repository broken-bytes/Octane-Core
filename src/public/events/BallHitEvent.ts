import { Ball } from '../models/Ball'
import { Event } from './Event'
import { PlayerSummary } from '../models/PlayerSummary'

export interface BallHitEvent extends Event {
    players: [PlayerSummary]
    ball: Ball
}