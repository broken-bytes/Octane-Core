import { Event } from './public/events/Event'
import { OctaneMeta } from './public/meta/Meta'
import { UpdateState } from './public/state/UpdateState'

export interface OctaneCoreConfig {
    port: number
}

export interface CloseInfo {
    code: number
    reason: string
    clean: boolean
}

type EventHandler = (event: Event) => void
type StateHandler = (state: UpdateState) => void
type MetaHandler = (meta: OctaneMeta) => void
type OpenHandler = () => void
type CloseHandler = (info: CloseInfo) => void
type ErrorHandler = (err: Error) => void

const EVENTS_PATH = '/events'
const STATE_PATH = '/state'
const META_PATH = '/meta'
const CHANNEL_COUNT = 3

export class OctaneCore {
    private sockets = new Map<string, WebSocket>()
    private openChannels = new Set<string>()
    private hasFiredOpen = false

    private eventHandlers = new Set<EventHandler>()
    private stateHandlers = new Set<StateHandler>()
    private metaHandlers = new Set<MetaHandler>()
    private openHandlers = new Set<OpenHandler>()
    private closeHandlers = new Set<CloseHandler>()
    private errorHandlers = new Set<ErrorHandler>()

    constructor(private readonly config: OctaneCoreConfig) {}

    onEvent(handler: EventHandler): () => void {
        this.eventHandlers.add(handler)

        return () => this.eventHandlers.delete(handler)
    }

    onState(handler: StateHandler): () => void {
        this.stateHandlers.add(handler)

        return () => this.stateHandlers.delete(handler)
    }

    onMeta(handler: MetaHandler): () => void {
        this.metaHandlers.add(handler)

        return () => this.metaHandlers.delete(handler)
    }

    onOpen(handler: OpenHandler): () => void {
        this.openHandlers.add(handler)

        return () => this.openHandlers.delete(handler)
    }

    onClose(handler: CloseHandler): () => void {
        this.closeHandlers.add(handler)

        return () => this.closeHandlers.delete(handler)
    }

    onError(handler: ErrorHandler): () => void {
        this.errorHandlers.add(handler)

        return () => this.errorHandlers.delete(handler)
    }

    connect() {
        this.openChannel(EVENTS_PATH, (data) => {
            const event = JSON.parse(data) as Event
            for (const handler of this.eventHandlers) handler(event)
        })
        this.openChannel(STATE_PATH, (data) => {
            const state = JSON.parse(data) as UpdateState
            for (const handler of this.stateHandlers) handler(state)
        })
        this.openChannel(META_PATH, (data) => {
            const meta = JSON.parse(data) as OctaneMeta
            for (const handler of this.metaHandlers) handler(meta)
        })
    }

    close() {
        for (const ws of this.sockets.values()) ws.close()
        this.sockets.clear()
        this.openChannels.clear()
        this.hasFiredOpen = false
    }

    private openChannel(path: string, dispatch: (data: string) => void) {
        if (this.sockets.has(path)) return

        const ws = new WebSocket(`ws://localhost:${this.config.port}${path}`)
        this.sockets.set(path, ws)

        ws.addEventListener('open', () => {
            this.openChannels.add(path)
            if (this.openChannels.size === CHANNEL_COUNT && !this.hasFiredOpen) {
                this.hasFiredOpen = true
                for (const handler of this.openHandlers) handler()
            }
        })

        ws.addEventListener('message', (e) => {
            const data = typeof e.data === 'string' ? e.data : ''
            if (!data) return
            try {
                dispatch(data)
            } catch (err) {
                const wrapped = err instanceof Error ? err : new Error(String(err))
                for (const handler of this.errorHandlers) handler(wrapped)
            }
        })

        ws.addEventListener('close', (e) => {
            this.sockets.delete(path)
            this.openChannels.delete(path)
            const info: CloseInfo = { code: e.code, reason: e.reason, clean: e.wasClean }
            const wasFullyOpen = this.hasFiredOpen
            this.hasFiredOpen = false
            if (wasFullyOpen) {
                for (const handler of this.closeHandlers) handler(info)
            }
        })

        ws.addEventListener('error', () => {
            const err = new Error(`WebSocket error (${path})`)
            for (const handler of this.errorHandlers) handler(err)
        })
    }
}
