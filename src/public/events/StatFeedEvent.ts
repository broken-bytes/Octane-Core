import { Event } from './Event'
import { PlayerSummary } from '../models/PlayerSummary'

export enum StatFeedEventType {
    demolish,
    shot,
    goal,
    longGoal,
    hatTrick,
    save,
    epicSave,
    savior,
    assist,
    playmaker,
}

export interface StatFeedEvent extends Event {
    stat: StatFeedEventType
    mainTarget: PlayerSummary
    secondaryTarget?: PlayerSummary
}