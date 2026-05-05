import { Event } from './Event'

export interface MatchEndedEvent extends Event {
    winnerTeamId: number
}