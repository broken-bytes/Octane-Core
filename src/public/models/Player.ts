import { PlayerSummary } from './PlayerSummary'

export interface Player {
    name: string
    primaryId: string
    spectatorId: number
    team: number
    score: number
    goals: number
    assists: number
    saves: number
    touches: number
    bumps: number
    demos: number
    hasCar?: boolean
    speed?: number
    boost?: number
    isBoosting?: boolean
    isOnGround?: boolean
    isOnWall?: boolean
    isPowersliding?: boolean
    isDemolished?: boolean
    attacker?: PlayerSummary 
    isSupersonic: boolean
}