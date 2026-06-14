import { Node, RigidBody2D, v2, Vec2 } from 'cc';
import { MSG_TYPE, MOD_TYPE } from 'db://assets/Enums';
import { UdpManager } from 'db://assets/Net/UdpManager';
import { UIData } from 'db://assets/Runtime/UIData';
import { RoomData } from 'db://assets/Net/RoomData';
import { Client } from 'db://assets/Net/Client';
import { Server } from 'db://assets/Net/Server';
import { deepClone } from 'db://assets/Utils/Tools';
import { InputMMU } from '../../UI/ControlerUI/InputProtocol';
import { DataManager } from '../../Runtime/DataManager';
import { LINEAR_DAMPING, SPEED } from './ConstData';

export class MMUInputManager {
    inputList: InputMMU[] = [];
    private lastInput: Vec2 = Vec2.ZERO
    private syncCache: Map<string, { node: Node; comp: any }> | null = null;
    private sendTimer: number | null = null;
    private readonly INTERVAL = 100;
    private inputTimeMap: Map<string, number> = new Map();
    private listenInputTimer: any = null;

    applyNeed(syncCache: Map<string, { node: Node; comp: any }>) {
        this.syncCache = syncCache;
    }
    init() {
        this.stopTimer()
        this.listenInputTime()
        this.startInputSend()
    }
    startInputSend() {
        if (RoomData.Instance.isHost || RoomData.Instance.isSingle) return;
        // console.log("【MMUInputManager】开始发送操作")
        this.sendTimer = setInterval(() => {
            // 安全获取玩家数据（防止 undefined）
            const player = this.syncCache.get(Client.Instance.playerId);
            // 【关键】判断：找不到玩家 或 节点未激活 → 停止发送
            if (!player.node.active)
                this.stopTimer();
            this.sendInput()
        }, this.INTERVAL);
    }

    stopTimer() {
        if (this.sendTimer) clearInterval(this.sendTimer);
        this.sendTimer = null;
        if (this.listenInputTimer) clearInterval(this.listenInputTimer);
        this.listenInputTimer = null;
    }

    addInput(input: InputMMU) {
        const exist = this.inputList.find(i => i.playerId === input.playerId);
        if (exist) {
            exist.joyInput = input.joyInput;
        } else {
            DataManager.Instance.inputList = this.inputList
            this.inputList.push({ ...input });
        }
    }

    removeInput(playerId: string) {
        const idx = this.inputList.findIndex(i => i.playerId === playerId);
        if (idx !== -1) this.inputList.splice(idx, 1);
    }

    applyInput() {
        if (RoomData.Instance.isSingle) {
            const input = UIData.Instance.persistControler.get();
            if (input) this.move(input);
            return;
        }

        if (RoomData.Instance.isHost) {
            const input = deepClone(UIData.Instance.persistControler.get());
            if (!input) return
            if (input.playerId === "?")
                input.playerId = Server.Instance.playerId;
            this.addInput(input);

            this.inputList.forEach(input => this.move(input));
        }
    }

    private move(input: InputMMU) {
        const cache = this.syncCache.get(input.playerId);
        if (!cache || !cache.node) return;
        const rb = cache.node.getComponent(RigidBody2D);
        if (rb) {
            let vX = rb.linearVelocity.x
            let vY = rb.linearVelocity.y
            rb.linearVelocity = v2(
                vX + input.joyInput.x * SPEED - vX * LINEAR_DAMPING,
                vY + input.joyInput.y * SPEED - vY * LINEAR_DAMPING
            );
        }
    }

    sendInput() {
        if (RoomData.Instance.isHost || RoomData.Instance.isSingle) return;
        let input = UIData.Instance.persistControler.get()
        if (!input || !Client.Instance.hostIp) return;
        if (this.lastInput?.equals(input.joyInput)) return;
        this.lastInput = input.joyInput.clone();
        UdpManager.Instance.sendUnicast(Client.Instance.hostIp, Client.Instance.hostPort, {
            head: { type: MSG_TYPE.GAME_INPUT, timestamp: Date.now(), senderId: Client.Instance.playerId },
            input: { ...input, type: MOD_TYPE.MMU }
        });
    }
    onInput(data: any) {
        if (!data || !data.input || !this.inputList) return;
        const pid = data.head.senderId;
        data.input.playerId = pid;
        this.inputTimeMap.set(pid, Date.now())
        this.addInput(data.input)
    }
    listenInputTime() {
        if (!RoomData.Instance.isHost) return;
        this.listenInputTimer = setInterval(() => {
            const now = Date.now();
            const expiredRoomIds: string[] = [];

            for (const [senderId, timestamp] of this.inputTimeMap) {//[key,value]
                // console.log(now - timestamp)
                if (now - timestamp > 3000) {
                    expiredRoomIds.push(senderId);
                }
            }

            for (const timeoutId of expiredRoomIds) {
                const index = this.inputList.findIndex(player => player.playerId == timeoutId);
                if (index !== -1) {
                    this.inputList.splice(index, 1);
                    this.inputTimeMap.delete(timeoutId);
                }
            }
        }, 1500);
    }
}