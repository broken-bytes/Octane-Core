export enum EventType {
    ballHit,
    clockUpdatedSeconds,
    countdownBegin,
    crossbarHit,
    goalReplayEnd,
    goalReplayStart,
    goalReplayWillEnd,
    goalScored,
    matchCreated,
    matchInitialized,
    matchDestroyed,
    matchEnded,
    matchPaused,
    matchUnpaused,
    podiumStart,
    replayCreated,
    roundStarted,
    statfeedEvent
}

export interface Event {
    type: EventType
    matchId: string
}