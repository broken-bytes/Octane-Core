import { Event } from './Event'

export interface ClockUpdatedEvent extends Event {
    timeInSeconds: number
    isOvertime: boolean
}