import { MOD_TYPE, MSG_TYPE } from 'db://assets/Enums';
import { RoomData } from 'db://assets/Net/RoomData';
import { Server } from 'db://assets/Net/Server';
import { UdpManager } from 'db://assets/Net/UdpManager';
import { StateMMU } from 'db://assets/GameStateProtocol';
import { Node } from 'cc';
import { DataManager } from '../../Runtime/DataManager';

export class MMUNetwork {
    private state: StateMMU;
    private syncCache: Map<string, { node: Node; comp: any }> | null = null;
    private syncTimer: number | null = null;
    private readonly INTERVAL = 100;

    get isHost() { return RoomData.Instance.isHost; }
    get isSingle() { return RoomData.Instance.isSingle; }

    applyNeed(syncCache: Map<string, { node: Node; comp: any }>) {
        this.syncCache = syncCache;
    }

    startStateSync() {
        this.state = DataManager.Instance.getState(MOD_TYPE.MMU);
        this.stopSync();
        if (!this.isHost || this.isSingle) return;
        // console.log("【MMUNetwork】开始广播状态")
        this.broadcastState()
        this.syncTimer = setInterval(() => this.broadcastState(), this.INTERVAL);
    }

    stopSync() {
        if (this.syncTimer) clearInterval(this.syncTimer);
        this.syncTimer = null;
    }
    broadcastState() {
        if (!this.syncCache || !this.state) return;
        this.state.glassBalls.forEach(ball => {
            let node = this.syncCache.get(ball.playerId).node
            if (node) {
                ball.position = node.position
                ball.active = node.active
            }
        })
        UdpManager.Instance.sendBroadcast({
            head: { type: MSG_TYPE.GAME_STATE, timestamp: Date.now(), senderId: Server.Instance.playerId },
            roomId: RoomData.Instance.roomInfo.roomId,
            glassBalls: this.state.glassBalls
        });
    }


    onState(data: any) {
        if (data.roomId !== RoomData.Instance.roomInfo.roomId) return
        this.state.glassBalls = data.glassBalls;
    }
}