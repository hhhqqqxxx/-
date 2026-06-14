import { _decorator } from 'cc';
import { RoomManager } from './RoomManager';
import { MSG_TYPE, UI_EVENT } from '../Enums';
import { EventManager } from '../Runtime/EventManager';
import { UdpManager } from './UdpManager';
import { UIData } from '../Runtime/UIData';
import { RoomData } from './RoomData';
const { ccclass } = _decorator;

@ccclass('Server')
export class Server extends RoomManager {
    static get Instance() {
        return super.GetInstance<Server>()
    }

    heartBeatMap: Map<string, number> = new Map()
    createRoomBcTimer: any = null;
    listenBeatTimer: any = null;

    createRoom() {
        //  console.log("【房主】创建房间成功")
        RoomData.Instance.isHost = true
        RoomData.Instance.isSingle = false
        this.roomInfo.roomName = UIData.Instance.roomName_Box.string === "" ? "无" : UIData.Instance.roomName_Box.string;
        this.roomInfo.roomId = 'ROOM_' + this.playerId;
        this.addPlayer({
            playerId: this.playerId,
            playName: this.playerName,
            isHost: true
        })
        RoomData.Instance.roomInfo = this.roomInfo
        this.startBroadcast();
        EventManager.Instance.emit(UI_EVENT.CLEAR_MINI_SCENE)
        EventManager.Instance.emit(UI_EVENT.PERFORM_MINI_SCENE, UIData.Instance.modTime)
    }

    startBroadcast() {
        // console.log("【房主】开始广播房间信息")
        clearInterval(this.createRoomBcTimer);
        this.createRoomBcTimer = setInterval(() => {
            UdpManager.Instance.sendBroadcast({
                head: {
                    type: MSG_TYPE.ROOM_BROADCAST,
                    timestamp: Date.now(),
                    senderId: this.playerId,
                },
                roomInfo: this.roomInfo
            });
        }, 1000);
        this.listenHeartBeat()
        this.offListen()
        EventManager.Instance.on(MSG_TYPE.HEART_BEAT, this.loadHeartBeat, this);
        EventManager.Instance.on(MSG_TYPE.JOIN_REQUEST, this.onJoinRequest, this);
        EventManager.Instance.on(MSG_TYPE.RE_CONECTION, this.onReConnection, this);
        EventManager.Instance.on(MSG_TYPE.OUT_ROOM, this.kickPlayer, this);
    }
    endBroadcast() {
        clearInterval(this.createRoomBcTimer);
        this.createRoomBcTimer = null
        EventManager.Instance.off(MSG_TYPE.JOIN_REQUEST, this.onJoinRequest);
    }
    onJoinRequest(msg: any, remote: any) {
        // console.log("【房主】收到玩家加入请求")
        const pid = msg.head.senderId;
        this.addPlayer({
            playerId: pid,
            playName: msg.playerName,
            isHost: false
        })
        this.heartBeatMap.set(msg.head.senderId, Date.now())
        // 回复客户端
        UdpManager.Instance.sendUnicast(remote.address, remote.port, {
            head: {
                type: MSG_TYPE.JOIN_ACCEPT,
                timestamp: Date.now(),
                senderId: this.playerId,
            },
        });

        // 广播玩家列表
        EventManager.Instance.emit(UI_EVENT.MOD_SYNC, UIData.Instance.modManager.currentIndex)//同步miniscene
        this.broadcastRoomInfo()
    }
    broadcastRoomInfo() {
        // console.log("【房主】广播最新房间玩家列表")
        UdpManager.Instance.sendBroadcast({
            head: {
                type: MSG_TYPE.PLAYER_LIST,
                timestamp: Date.now(),
                senderId: this.playerId,
            },
            roomId: this.roomInfo.roomId,
            players: this.roomInfo.players
        });
        // console.log(this.roomInfo)
        EventManager.Instance.emit(UI_EVENT.ROOM_INFO, this.roomInfo)
        EventManager.Instance.emit(UI_EVENT.PERFORM_MINI_SCENE, UIData.Instance.modTime)
    }
    loadHeartBeat(msg: any, remote: any) {
        // console.log("【房主】收到玩家心跳，回复心跳")
        this.heartBeatMap.set(msg.head.senderId, Date.now())
        UdpManager.Instance.sendUnicast(remote.address, remote.port, {
            head: {
                type: MSG_TYPE.HEART_BEAT,
                timestamp: Date.now(),
                senderId: this.playerId,
            },
        });
    }

    listenHeartBeat() {
        // console.log("【房主】开始检测所有玩家心跳")
        clearInterval(this.listenBeatTimer);
        this.listenBeatTimer = setInterval(() => {
            const now = Date.now();
            const expiredRoomIds: string[] = [];

            for (const [senderId, timestamp] of this.heartBeatMap) {//[key,value]
                // console.log(now - timestamp)
                if (now - timestamp > 6000) {
                    expiredRoomIds.push(senderId);
                }
            }

            for (const timeoutId of expiredRoomIds) {
                const index = this.roomInfo.players.findIndex(player => player.playerId == timeoutId);
                if (index !== -1) {
                    // console.log("心跳超时了!")
                    this.roomInfo.players.splice(index, 1); // ✅ 删除 1 个
                    this.heartBeatMap.delete(timeoutId); // ✅ 同时清理心跳记录
                    this.broadcastRoomInfo()
                }
            }

        }, 1500);
    }
    // 收到玩家重连请求
    onReConnection(msg: any, remote: any) {
        // console.log("【房主】收到玩家重连请求")
        const pid = msg.head.senderId;
        // 刷新心跳
        this.heartBeatMap.set(pid, Date.now());
        this.addPlayer({
            playerId: pid,
            playName: msg.playerName,
            isHost: false
        })
        this.broadcastRoomInfo()
        // 回复重连成功
        UdpManager.Instance.sendUnicast(remote.address, remote.port, {
            head: {
                type: MSG_TYPE.RE_CONECTION,
                timestamp: Date.now(),
                senderId: this.playerId,
            }
        });
    }
    offListen() {
        EventManager.Instance.off(MSG_TYPE.HEART_BEAT, this.loadHeartBeat);
        EventManager.Instance.off(MSG_TYPE.JOIN_REQUEST, this.onJoinRequest);
        EventManager.Instance.off(MSG_TYPE.RE_CONECTION, this.onReConnection);
        EventManager.Instance.off(MSG_TYPE.OUT_ROOM, this.kickPlayer);

    }

    destroyRoom() {
        // console.log("【房主】销毁房间，断开所有连接")
        UdpManager.Instance.sendBroadcast({
            head: {
                type: MSG_TYPE.OUT_ROOM,
                timestamp: Date.now(),
                senderId: this.playerId,
            },
        });
        // 1. 清空所有定时器
        clearInterval(this.createRoomBcTimer);
        clearInterval(this.listenBeatTimer);
        this.createRoomBcTimer = null;
        this.listenBeatTimer = null;

        // 2. 清空所有事件监听
        this.offListen()

        // 3. 清空心跳记录
        this.heartBeatMap.clear();

        // 4. 清空房间数据 + 玩家列表
        RoomData.Instance.roomInfo = this.roomInfo = {
            roomId: '',
            roomName: '',
            players: [],
            hostIp: '',
            hostPort: 6666,
            timestamp: 0
        };
        RoomData.Instance.isHost = false
        RoomData.Instance.isSingle = true
        // console.log("房间已销毁 → 全部重置完成");
        EventManager.Instance.emit(UI_EVENT.CLEAR_MINI_SCENE)
        EventManager.Instance.emit(UI_EVENT.PERFORM_MINI_SCENE, UIData.Instance.modTime)
    }


    // 通用移除玩家方法
    kickPlayer(msg: any) {
        // console.log("【房主】玩家主动退出，移除玩家")
        const pid = msg.head.senderId
        this.removePlayer(pid)
        this.heartBeatMap.delete(pid);
        this.broadcastRoomInfo()
    }

}