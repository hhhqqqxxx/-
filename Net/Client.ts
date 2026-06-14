import { _decorator } from 'cc';
import { RoomManager } from './RoomManager';
import { MSG_TYPE, UI_EVENT } from '../Enums';
import { EventManager } from '../Runtime/EventManager';
import { RoomBroadcastInfo, RoomInfo } from './MsgProtocol';
import { UdpManager } from './UdpManager';
import { RoomData } from './RoomData';
import { UIData } from '../Runtime/UIData';

const { ccclass } = _decorator;

@ccclass('Client')
export class Client extends RoomManager {
    static get Instance() {
        return super.GetInstance<Client>();
    }

    hostIp = '';
    hostPort = 6666;

    roomList: Map<string, RoomInfo> = new Map();

    playerChoose: string = '?';

    serverHeartTime: number = Date.now();
    isReconnecting: boolean = false;
    reconnectStartTime: number = 0;

    checkTimer: any = null;
    heartBeatTimer: any = null;

    listenAll() {
        // console.log("【客户端】开始监听房间广播")
        EventManager.Instance.on(MSG_TYPE.ROOM_BROADCAST, this.onRoomBroadcast, this);
        this.startRoomCheck();
    }

    onRoomBroadcast(msg: RoomBroadcastInfo, remote: any) {
        // console.log("【客户端】收到房间广播信息")
        const roomInfo = msg.roomInfo;

        roomInfo.hostIp = remote.address;
        roomInfo.hostPort = remote.port;

        roomInfo.timestamp = msg.head.timestamp;

        this.roomList.set(roomInfo.roomId, roomInfo);
        EventManager.Instance.emit(UI_EVENT.ROOM_LIST, Array.from(this.roomList.values()));
    }

    startRoomCheck() {
        // console.log("【客户端】开始检测超时房间")
        clearInterval(this.checkTimer);
        this.checkTimer = setInterval(() => {
            const now = Date.now();
            const expiredRoomIds: string[] = [];

            for (const [roomId, info] of this.roomList) {
                if (now - info.timestamp > 3000) {
                    expiredRoomIds.push(roomId);
                }
            }

            for (const roomId of expiredRoomIds) {
                this.roomList.delete(roomId);
            }

            if (expiredRoomIds.length > 0) {
                EventManager.Instance.emit(UI_EVENT.ROOM_LIST, Array.from(this.roomList.values()));
            }

        }, 1000);
    }

    joinRoom() {
        // console.log("【客户端】发送加入房间请求")
        const roomInfo = this.roomList.get(this.playerChoose);
        this.roomInfo = roomInfo
        RoomData.Instance.isSingle = false
        RoomData.Instance.roomInfo = this.roomInfo
        if (!roomInfo) return;
        this.hostIp = roomInfo.hostIp;
        this.hostPort = roomInfo.hostPort;
        for (let i = 0; i < 3; i++) {
            UdpManager.Instance.sendUnicast(roomInfo.hostIp, roomInfo.hostPort, {
                head: {
                    type: MSG_TYPE.JOIN_REQUEST,
                    timestamp: Date.now(),
                    senderId: this.playerId,
                },
                playerName: this.playerName
            });
        }

        this.endRoomBroadcast()
        EventManager.Instance.on(MSG_TYPE.JOIN_ACCEPT, this.onJoinSuccess, this);
        EventManager.Instance.on(MSG_TYPE.PLAYER_LIST, this.freshList, this);
        EventManager.Instance.on(MSG_TYPE.HEART_BEAT, this.loadHeartBeat, this);
        EventManager.Instance.on(MSG_TYPE.OUT_ROOM, this.reset, this);
        this.heartBeat()
    }

    onJoinSuccess() {
        // console.log("【客户端】加入房间成功")
        EventManager.Instance.off(MSG_TYPE.JOIN_ACCEPT, this.onJoinSuccess);
        EventManager.Instance.emit(UI_EVENT.CLEAR_MINI_SCENE)
        this.serverHeartTime = Date.now();
    }

    loadHeartBeat(msg: any) {
        // console.log("【客户端】收到房主心跳回复")
        this.serverHeartTime = Date.now();
        this.isReconnecting = false;
    }

    heartBeat() {
        // console.log("【客户端】开始发送心跳")
        clearInterval(this.heartBeatTimer);

        this.heartBeatTimer = setInterval(() => {
            const now = Date.now();
            UdpManager.Instance.sendUnicast(this.hostIp, this.hostPort, {
                head: {
                    type: MSG_TYPE.HEART_BEAT,
                    timestamp: now,
                    senderId: this.playerId,
                }
            });


            if (!this.isReconnecting) {
                if (now - this.serverHeartTime > 4500) {
                    this.isReconnecting = true;
                    this.reconnectStartTime = now;
                    EventManager.Instance.on(MSG_TYPE.RE_CONECTION, this.onReConnectAck, this);
                    this.sendReconnect();
                }
            }

            else {
                this.sendReconnect();
                if (now - this.reconnectStartTime > 5000) {
                    this.reset();
                }
            }

        }, 1500);
    }


    sendReconnect() {
        // console.log("【客户端】发送重连请求")
        UdpManager.Instance.sendUnicast(this.hostIp, this.hostPort, {
            head: {
                type: MSG_TYPE.RE_CONECTION,
                timestamp: Date.now(),
                senderId: this.playerId,
            },
            playerName: this.playerName
        });
    }

    onReConnectAck() {
        // console.log("【客户端】重连房间成功")
        EventManager.Instance.off(MSG_TYPE.RE_CONECTION, this.onReConnectAck);
        this.isReconnecting = false;
        this.serverHeartTime = Date.now();
    }


    freshList(msg: any) {
        // console.log("【客户端】更新房间玩家列表")
        if (msg.roomId !== this.roomInfo.roomId) {
            return;
        }

        this.roomInfo.players = [];

        msg.players.forEach(player => {
            this.addPlayer(player);
        });
        EventManager.Instance.emit(UI_EVENT.ROOM_INFO, this.roomInfo)
        EventManager.Instance.emit(UI_EVENT.PERFORM_MINI_SCENE, UIData.Instance.modTime)
    }

    quitRoom() {
        // console.log("【客户端】主动退出房间")
        UdpManager.Instance.sendUnicast(this.hostIp, this.hostPort, {
            head: {
                type: MSG_TYPE.OUT_ROOM,
                timestamp: Date.now(),
                senderId: this.playerId,
            },
        });
        this.reset()
    }

    reset() {
        // console.log("【客户端】重置连接，断开房间")
        clearInterval(this.heartBeatTimer);
        this.heartBeatTimer = null;

        EventManager.Instance.off(MSG_TYPE.PLAYER_LIST, this.freshList);
        EventManager.Instance.off(MSG_TYPE.HEART_BEAT, this.loadHeartBeat);
        EventManager.Instance.off(MSG_TYPE.RE_CONECTION, this.onReConnectAck);
        EventManager.Instance.off(MSG_TYPE.OUT_ROOM, this.reset);

        this.isReconnecting = false;
        this.reconnectStartTime = 0;
        this.serverHeartTime = Date.now();

        RoomData.Instance.roomInfo = this.roomInfo = {
            roomId: '',
            roomName: '',
            players: [],
            hostIp: '',
            hostPort: 6666,
            timestamp: 0
        };

        this.playerChoose = '?';
        this.hostIp = '';
        this.hostPort = 6666;
        RoomData.Instance.isSingle = true
        EventManager.Instance.emit(UI_EVENT.BACK_NORMAL);
        // console.log("玩家已主动退出房间 → 全部重置完成");
        EventManager.Instance.emit(UI_EVENT.CLEAR_MINI_SCENE)
        EventManager.Instance.emit(UI_EVENT.PERFORM_MINI_SCENE, UIData.Instance.modTime)
    }

    endRoomBroadcast() {
        // console.log("【客户端】停止监听房间广播")
        EventManager.Instance.off(MSG_TYPE.ROOM_BROADCAST, this.onRoomBroadcast);
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        this.roomList.clear();
    }
}