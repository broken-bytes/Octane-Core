import { Event } from './Event'
import { PlayerSummary } from '../models/PlayerSummary'

export enum StatFeedEventType {
    demolish
}

export interface StatFeedEvent extends Event {
    stat: StatFeedEventType
    mainTarget: PlayerSummary
    secondaryTarget?: PlayerSummary
}