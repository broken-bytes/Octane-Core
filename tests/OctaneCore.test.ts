import { OctaneCore } from '../src/OctaneCore'
import { Event, EventType } from '../src/public/events/Event'
import { UpdateState } from '../src/public/state/UpdateState'

type Listener = (e: any) => void

class FakeWebSocket {
    static instances: FakeWebSocket[] = []

    url: string
    closeCalled = false
    private listeners = new Map<string, Set<Listener>>()

    constructor(url: string) {
        this.url = url
        FakeWebSocket.instances.push(this)
    }

    addEventListener(type: string, handler: Listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set())
        this.listeners.get(type)!.add(handler)
    }

    close() {
        this.closeCalled = true
    }

    dispatch(type: string, event: any = {}) {
        const handlers = this.listeners.get(type)
        if (!handlers) return
        for (const h of handlers) h(event)
    }
}

const original = (globalThis as any).WebSocket

beforeEach(() => {
    FakeWebSocket.instances = []
    ;(globalThis as any).WebSocket = FakeWebSocket
})

afterEach(() => {
    ;(globalThis as any).WebSocket = original
})

const socketAt = (path: string) =>
    FakeWebSocket.instances.find((s) => s.url.endsWith(path) && !s.closeCalled)!

const openBoth = () => {
    socketAt('/events').dispatch('open')
    socketAt('/state').dispatch('open')
}

describe('OctaneCore', () => {
    test('connect opens /events and /state on the configured port', () => {
        const core = new OctaneCore({ port: 1234 })
        core.connect()

        expect(FakeWebSocket.instances.map((s) => s.url).sort()).toEqual([
            'ws://localhost:1234/events',
            'ws://localhost:1234/state'
        ])
    })

    test('connect is a no-op while channels are already open', () => {
        const core = new OctaneCore({ port: 1234 })
        core.connect()
        core.connect()

        expect(FakeWebSocket.instances).toHaveLength(2)
    })

    test('open fires once, only after both channels have opened', () => {
        const core = new OctaneCore({ port: 1234 })
        const handler = jest.fn()
        core.onOpen(handler)
        core.connect()

        socketAt('/events').dispatch('open')
        expect(handler).not.toHaveBeenCalled()

        socketAt('/state').dispatch('open')
        expect(handler).toHaveBeenCalledTimes(1)
    })

    test('open fans out to all open handlers', () => {
        const core = new OctaneCore({ port: 1234 })
        const a = jest.fn()
        const b = jest.fn()
        core.onOpen(a)
        core.onOpen(b)
        core.connect()
        openBoth()

        expect(a).toHaveBeenCalledTimes(1)
        expect(b).toHaveBeenCalledTimes(1)
    })

    test('messages on /events are JSON-parsed and dispatched as Event', () => {
        const core = new OctaneCore({ port: 1234 })
        const handler = jest.fn()
        core.onEvent(handler)
        core.connect()

        const event: Event = { type: EventType.matchCreated, matchId: 'm-1' }
        socketAt('/events').dispatch('message', { data: JSON.stringify(event) })

        expect(handler).toHaveBeenCalledWith(event)
    })

    test('messages on /state are JSON-parsed and dispatched as UpdateState', () => {
        const core = new OctaneCore({ port: 1234 })
        const handler = jest.fn()
        core.onState(handler)
        core.connect()

        const state = { matchId: 'm-1', players: [], game: {} } as unknown as UpdateState
        socketAt('/state').dispatch('message', { data: JSON.stringify(state) })

        expect(handler).toHaveBeenCalledWith(state)
    })

    test('events do not leak into state handlers and vice versa', () => {
        const core = new OctaneCore({ port: 1234 })
        const eventHandler = jest.fn()
        const stateHandler = jest.fn()
        core.onEvent(eventHandler)
        core.onState(stateHandler)
        core.connect()

        const event: Event = { type: EventType.matchCreated, matchId: 'm-1' }
        socketAt('/events').dispatch('message', { data: JSON.stringify(event) })

        expect(eventHandler).toHaveBeenCalledTimes(1)
        expect(stateHandler).not.toHaveBeenCalled()
    })

    test('malformed JSON dispatches an error to error handlers', () => {
        const core = new OctaneCore({ port: 1234 })
        const errorHandler = jest.fn()
        const eventHandler = jest.fn()
        core.onError(errorHandler)
        core.onEvent(eventHandler)
        core.connect()

        socketAt('/events').dispatch('message', { data: '{not-json' })

        expect(eventHandler).not.toHaveBeenCalled()
        expect(errorHandler).toHaveBeenCalledTimes(1)
        expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error)
    })

    test('empty-string message frames are dropped silently', () => {
        const core = new OctaneCore({ port: 1234 })
        const eventHandler = jest.fn()
        const errorHandler = jest.fn()
        core.onEvent(eventHandler)
        core.onError(errorHandler)
        core.connect()

        socketAt('/events').dispatch('message', { data: '' })

        expect(eventHandler).not.toHaveBeenCalled()
        expect(errorHandler).not.toHaveBeenCalled()
    })

    test('close after fully-open fires close handlers with CloseInfo', () => {
        const core = new OctaneCore({ port: 1234 })
        const handler = jest.fn()
        core.onClose(handler)
        core.connect()
        openBoth()

        socketAt('/events').dispatch('close', { code: 1006, reason: 'gone', wasClean: false })

        expect(handler).toHaveBeenCalledWith({ code: 1006, reason: 'gone', clean: false })
    })

    test('close before fully-open does not fire close handlers', () => {
        const core = new OctaneCore({ port: 1234 })
        const handler = jest.fn()
        core.onClose(handler)
        core.connect()

        socketAt('/events').dispatch('open')
        socketAt('/events').dispatch('close', { code: 1006, reason: 'gone', wasClean: false })

        expect(handler).not.toHaveBeenCalled()
    })

    test('close fires at most once per fully-open session', () => {
        const core = new OctaneCore({ port: 1234 })
        const handler = jest.fn()
        core.onClose(handler)
        core.connect()
        openBoth()

        socketAt('/events').dispatch('close', { code: 1000, reason: '', wasClean: true })
        socketAt('/state').dispatch('close', { code: 1000, reason: '', wasClean: true })

        expect(handler).toHaveBeenCalledTimes(1)
    })

    test('error event fires error handlers with an Error mentioning the channel', () => {
        const core = new OctaneCore({ port: 1234 })
        const handler = jest.fn()
        core.onError(handler)
        core.connect()

        socketAt('/events').dispatch('error')

        expect(handler).toHaveBeenCalledTimes(1)
        const err = handler.mock.calls[0][0]
        expect(err).toBeInstanceOf(Error)
        expect(err.message).toContain('/events')
    })

    test('close() closes every channel and is safe before connect', () => {
        const core = new OctaneCore({ port: 1234 })
        expect(() => core.close()).not.toThrow()

        core.connect()
        const events = socketAt('/events')
        const state = socketAt('/state')

        core.close()

        expect(events.closeCalled).toBe(true)
        expect(state.closeCalled).toBe(true)
    })

    test('connect after close creates fresh sockets', () => {
        const core = new OctaneCore({ port: 1234 })
        core.connect()
        core.close()
        core.connect()

        expect(FakeWebSocket.instances).toHaveLength(4)
    })

    test('handlers can unsubscribe via the returned function', () => {
        const core = new OctaneCore({ port: 1234 })
        const eventHandler = jest.fn()
        const stateHandler = jest.fn()
        const unsubEvent = core.onEvent(eventHandler)
        const unsubState = core.onState(stateHandler)
        core.connect()
        unsubEvent()
        unsubState()

        socketAt('/events').dispatch('message', {
            data: JSON.stringify({ type: EventType.matchCreated, matchId: 'm-1' })
        })
        socketAt('/state').dispatch('message', {
            data: JSON.stringify({ matchId: 'm-1', players: [], game: {} })
        })

        expect(eventHandler).not.toHaveBeenCalled()
        expect(stateHandler).not.toHaveBeenCalled()
    })
})
