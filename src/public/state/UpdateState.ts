import { Event } from '../events/Event'
import { PlayerSummary } from '../models/PlayerSummary'

export interface UpdateState extends Event {
    players: [PlayerSummary]
}