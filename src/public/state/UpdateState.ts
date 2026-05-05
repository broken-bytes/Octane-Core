import { Game } from '../models/Game'
import { Player } from '../models/Player'

export interface UpdateState {
    matchId: string
    players: Player[]
    game: Game
}
