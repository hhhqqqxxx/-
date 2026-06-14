// 消息类型

import { MSG_TYPE } from "../Enums";


export interface PlayerInfo {
    playerId: string
    playName: string
    isHost: boolean
}
export interface RoomInfo {
    hostIp: string
    hostPort: number
    players: PlayerInfo[]
    roomName: string
    roomId: string
    timestamp: number
}
export interface RoomBroadcastInfo {
    head: MsgHead
    roomInfo: RoomInfo
}

export interface MsgHead {
    type: MSG_TYPE
    timestamp: number
    senderId: string
}