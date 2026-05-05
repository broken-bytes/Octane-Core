import { OctaneCore } from '../src/OctaneCore'
import { Event, EventType } from '../src/public/events/Event'

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

const last = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1]

describe('OctaneCore', () => {
    test('connect opens a websocket at ws://localhost:PORT', () => {
        const core = new OctaneCore({ port: 1234 })
        core.connect()

        expect(FakeWebSocket.instances).toHaveLength(1)
        expect(last().url).toBe('ws://localhost:1234')
    })

    test('connect is a no-op while a socket is already open', () => {
        const core = new OctaneCore({ port: 1234 })
        core.connect()
        core.connect()

        expect(FakeWebSocket.instances).toHaveLength(1)
    })

    test('connect creates a new socket after the previous one closed', () => {
        const core = new OctaneCore({ port: 1234 })
        core.connect()
        last().dispatch('close', { code: 1000, reason: '', wasClean: true })
        core.connect()

        expect(FakeWebSocket.instances).toHaveLength(2)
    })

    test('open events fan out to all open handlers', () => {
        const core = new OctaneCore({ port: 1234 })
        const a = jest.fn()
        const b = jest.fn()
        core.onOpen(a)
        core.onOpen(b)
        core.connect()

        last().dispatch('open')

        expect(a).toHaveBeenCalledTimes(1)
        expect(b).toHaveBeenCalledTimes(1)
    })

    test('messages are JSON-parsed and dispatched as Event', () => {
        const core = new OctaneCore({ port: 1234 })
        const handler = jest.fn()
        core.onEvent(handler)
        core.connect()

        const event: Event = { type: EventType.matchCreated, matchId: 'm-1' }
        last().dispatch('message', { data: JSON.stringify(event) })

        expect(handler).toHaveBeenCalledWith(event)
    })

    test('close event fires close handlers with CloseInfo', () => {
        const core = new OctaneCore({ port: 1234 })
        const handler = jest.fn()
        core.onClose(handler)
        core.connect()

        last().dispatch('close', { code: 1006, reason: 'gone', wasClean: false })

        expect(handler).toHaveBeenCalledWith({ code: 1006, reason: 'gone', clean: false })
    })

    test('error event fires error handlers with an Error', () => {
        const core = new OctaneCore({ port: 1234 })
        const handler = jest.fn()
        core.onError(handler)
        core.connect()

        last().dispatch('error')

        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler.mock.calls[0][0]).toBeInstanceOf(Error)
    })

    test('close() invokes ws.close on the underlying socket', () => {
        const core = new OctaneCore({ port: 1234 })
        core.connect()
        core.close()

        expect(last().closeCalled).toBe(true)
    })

    test('close() before connect is a no-op', () => {
        const core = new OctaneCore({ port: 1234 })
        expect(() => core.close()).not.toThrow()
    })

    test('handlers can unsubscribe via the returned function', () => {
        const core = new OctaneCore({ port: 1234 })
        const handler = jest.fn()
        const unsubscribe = core.onEvent(handler)
        core.connect()

        unsubscribe()

        const event: Event = { type: EventType.matchCreated, matchId: 'm-1' }
        last().dispatch('message', { data: JSON.stringify(event) })

        expect(handler).not.toHaveBeenCalled()
    })

    test('a stale close event does not clear a freshly reconnected socket', () => {
        const core = new OctaneCore({ port: 1234 })
        core.connect()
        const first = last()
        first.dispatch('close', { code: 1000, reason: '', wasClean: true })
        core.connect()
        const second = last()

        // simulate the first socket dispatching a delayed close after reconnect
        first.dispatch('close', { code: 1000, reason: '', wasClean: true })

        // a third connect should still be a no-op because `second` is still active
        core.connect()

        expect(FakeWebSocket.instances).toHaveLength(2)
        expect(FakeWebSocket.instances[1]).toBe(second)
    })
})
