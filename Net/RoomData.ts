import { _decorator } from 'cc';
import { Singleton } from '../Base/Singleton';
import { RoomInfo } from './MsgProtocol';

export class RoomData extends Singleton {
    static get Instance() {
        return super.GetInstance<RoomData>()
    }
    isSingle = true;//通过这个判断，只能初始化一次
    isHost = false;
    roomInfo: RoomInfo = {
        roomId: '',
        roomName: '',
        players: [],
        hostIp: '',
        hostPort: 6666,
        timestamp: 0
    };
    playerName: string = "无"
    playerId: string = "?"

}


