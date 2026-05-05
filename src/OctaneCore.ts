import { Event } from './public/events/Event'

export interface OctaneCoreConfig {
    port: number
}

export interface CloseInfo {
  code: number
  reason: string
  clean: boolean
}

type EventHandler = (message: Event) => void
type OpenHandler = () => void
type CloseHandler = (info: CloseInfo) => void
type ErrorHandler = (err: Error) => void

export class OctaneCore {
    private websocket: WebSocket | null = null

    private eventHandlers = new Set<EventHandler>()
    private openHandlers = new Set<OpenHandler>()
    private closeHandlers = new Set<CloseHandler>()
    private errorHandlers = new Set<ErrorHandler>()

    constructor(private readonly config: OctaneCoreConfig) {}

    onEvent(handler: EventHandler): () => void {
        this.eventHandlers.add(handler)

        return () => this.eventHandlers.delete(handler)
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
        if (this.websocket) return

        const ws = new WebSocket(`ws://localhost:${this.config.port}`)
        this.websocket = ws

        ws.addEventListener('open', () => {
            for (const handler of this.openHandlers) handler()
        })

        ws.addEventListener('message', (e) => {
            const event = JSON.parse(typeof e.data === 'string' ? e.data : '') as Event
            for (const handler of this.eventHandlers) handler(event)
        })

        ws.addEventListener('close', (e) => {
            if (this.websocket === ws) this.websocket = null
            const info: CloseInfo = { code: e.code, reason: e.reason, clean: e.wasClean }
            for (const handler of this.closeHandlers) handler(info)
        })

        ws.addEventListener('error', () => {
            const err = new Error('WebSocket error')
            for (const handler of this.errorHandlers) handler(err)
        })
    }

    close() {
        this.websocket?.close()
        this.websocket = null
    }
}
