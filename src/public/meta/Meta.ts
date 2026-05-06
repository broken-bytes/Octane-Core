export interface OctaneMetaSide {
    name: string
    logo: string
    wins: number
}

export interface OctaneMeta {
    bestOf: number
    blue: OctaneMetaSide
    orange: OctaneMetaSide
}
