import { _decorator } from 'cc';
import { UdpManager } from './UdpManager';
import { Singleton } from '../Base/Singleton';
import { UIData } from '../Runtime/UIData';
import { PlayerInfo, RoomInfo } from './MsgProtocol';
import { RoomData } from './RoomData';
const { ccclass } = _decorator;

@ccclass('RoomManager')
export class RoomManager extends Singleton {

    isSingle = true;//通过这个判断，只能初始化一次
    isHost = false;
    playerId = '?';
    playerName = '无';
    roomInfo: RoomInfo = {
        roomId: '',
        roomName: '',
        players: [],
        hostIp: '',
        hostPort: 6666,
        timestamp: 0
    };

    async init() {
        this.genIdandgetName();
        this.listenAll();
        await UdpManager.Instance.init();
    }

    genIdandgetName() {
        this.playerName = UIData.Instance.playName_Box.string == "" ? "无" : UIData.Instance.playName_Box.string
        this.playerId = this.playerId == '?' ? 'P' + Date.now().toString(16) : this.playerId;
        RoomData.Instance.playerName = this.playerName
        RoomData.Instance.playerId = this.playerId
    }

    listenAll() { }

    clear() { }
    addPlayer(player: PlayerInfo) {
        const exist = this.roomInfo.players.find(p => p.playerId === player.playerId);

        if (!exist) {
            // 新玩家：加入
            this.roomInfo.players.push(player);
        } else {
            exist.playName = player.playName;
        }
    }
    // 通用移除玩家方法
    removePlayer(pid: string) {
        const index = this.roomInfo.players.findIndex(p => p.playerId === pid);
        if (index !== -1) {
            this.roomInfo.players.splice(index, 1);
        }
    }
}