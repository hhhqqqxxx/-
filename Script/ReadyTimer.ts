import { _decorator, Component, Label, Node } from 'cc';
import { RoomData } from '../../Net/RoomData';
import { GAME_MMU, MSG_TYPE } from '../../Enums';
import { EventManager } from '../../Runtime/EventManager';
import { Server } from '../../Net/Server';
import { UdpManager } from '../../Net/UdpManager';
const { ccclass, property } = _decorator;

@ccclass('ReadyTimer')
export class ReadyTimer extends Component {
    timerLabel: Label
    start() {
        this.timerLabel = this.node.getComponentInChildren(Label)
        let time = 3
        if (RoomData.Instance.isSingle || RoomData.Instance.isHost)
            this.schedule(() => {
                time--
                this.renderTimer(time)
                if (RoomData.Instance.isHost) {
                    for (let i = 0; i < 3; i++)
                        UdpManager.Instance.sendBroadcast({
                            head: { type: MSG_TYPE.READY_TIMER, timestamp: Date.now(), senderId: Server.Instance.playerId },
                            roomId: RoomData.Instance.roomInfo.roomId,
                            time: time
                        });
                }
            }, 1, 3)
        else
            EventManager.Instance.on(MSG_TYPE.READY_TIMER, this.onReadyTimer, this);
    }
    protected onDestroy(): void {
        EventManager.Instance.off(MSG_TYPE.READY_TIMER, this.onReadyTimer);
    }
    onReadyTimer(data: any) {
        if (data.roomId !== RoomData.Instance.roomInfo.roomId) return;
        this.renderTimer(data.time)
    }
    renderTimer(time: number) {
        this.timerLabel.string = time + ""
        if (!time) {
            this.timerLabel.string = "开始"
            EventManager.Instance.emit(GAME_MMU.READY_TIME_ON);
            this.node.destroy()
        }
    }
}


