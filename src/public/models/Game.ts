import { Ball } from './Ball'
import { PlayerSummary } from './PlayerSummary'
import { Team } from './Team'

export interface Game {
    teams: [Team]
    timeSeconds: number
    isOvertime: boolean
    frame?: number
    elapsed?: number
    ball: Ball
    isReplay: boolean
    hasWinner: boolean
    winner: string
    arena: string
    hasTarget: boolean
    target?: PlayerSummary
}