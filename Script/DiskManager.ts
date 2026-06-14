import { _decorator, Component } from 'cc';
import { EventManager } from '../../Runtime/EventManager';
import { GAME_MMU, MOD_TYPE, MSG_TYPE } from '../../Enums';
import { RoomData } from '../../Net/RoomData';
import { DataManager } from '../../Runtime/DataManager';
import { StateMMU } from '../../GameStateProtocol';
import { Server } from '../../Net/Server';
import { UdpManager } from '../../Net/UdpManager';
import { DISK_SPEED } from './ConstData';

const { ccclass, property } = _decorator;

@ccclass('DiskManager')
export class DiskManager extends Component {

    private state: StateMMU;
    private diskTimer: number | null = null;
    isStart = false
    init() {
        return new Promise<void>(resolve => {
            this.state = DataManager.Instance.getState(MOD_TYPE.MMU);
            this.stop()
            EventManager.Instance.on(MSG_TYPE.GAME_STATE_MAP, this.onDiskChange, this);
            // 初始化圆盘大小
            const size = this.state.diskSize;
            this.node.setScale(size.x, size.y);
            if (RoomData.Instance.isHost || RoomData.Instance.isSingle) {
                EventManager.Instance.on(GAME_MMU.READY_TIME_ON, this.diskStart, this);
                this.schedule(() => {
                    UdpManager.Instance.sendBroadcast({
                        head: { type: MSG_TYPE.GAME_STATE_MAP, timestamp: Date.now(), senderId: Server.Instance.playerId },
                        roomId: RoomData.Instance.roomInfo.roomId,
                        diskSize: this.state.diskSize
                    });
                }, 0.5, 3)
                this.diskTimer = setInterval(() => {
                    if (this.isStart)
                        this.broadcastDisk()
                }, 1000);
            }
            // 监听圆盘变化
            resolve()
        })
    }
    diskStart() {
        EventManager.Instance.off(GAME_MMU.READY_TIME_ON, this.diskStart);
        this.isStart = true
    }
    broadcastDisk() {
        this.state.diskSize.x -= DISK_SPEED

        this.state.diskSize.y -= DISK_SPEED
        EventManager.Instance.emit(GAME_MMU.GAME_STATE_MAP, {
            roomId: RoomData.Instance.roomInfo.roomId,
            diskSize: this.state.diskSize
        })
        if (RoomData.Instance.isHost)
            for (let i = 0; i < 3; i++)
                UdpManager.Instance.sendBroadcast({
                    head: { type: MSG_TYPE.GAME_STATE_MAP, timestamp: Date.now(), senderId: Server.Instance.playerId },
                    roomId: RoomData.Instance.roomInfo.roomId,
                    diskSize: this.state.diskSize
                });
    }
    onDiskChange(data: any) {
        // 房间匹配
        if (data.roomId !== RoomData.Instance.roomInfo.roomId) return;
        if (this.node.scale.x <= 0)
            this.stop()

        // 更新数据 + 视图
        this.state.diskSize = data.diskSize;//把数据改回去了！1.19应该传过来的是1.2所以一直1.19-1.2-1.19
        this.node.setScale(data.diskSize.x, data.diskSize.y);
    };

    stop() {
        if (this.diskTimer) clearInterval(this.diskTimer);
        this.diskTimer = null;
        EventManager.Instance.off(MSG_TYPE.GAME_STATE_MAP, this.onDiskChange);
        EventManager.Instance.off(GAME_MMU.READY_TIME_ON, this.diskStart);
    }
    onDisable() {
        // 安全取消监听
        this.stop()
    }
}