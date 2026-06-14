import { _decorator, Component, instantiate, Node, Prefab, Sprite, Color } from 'cc';
import { DataManager } from '../../Runtime/DataManager';
import { getCanvas } from '../../Utils/Tools';
import { RoomData } from '../../Net/RoomData';
import { MSG_TYPE } from '../../Enums';
import { EventManager } from '../../Runtime/EventManager';
import { Server } from '../../Net/Server';
import { UdpManager } from '../../Net/UdpManager';
const { ccclass, property } = _decorator;

@ccclass('SuccessManager')
export class SuccessManager extends Component {////////////////////加上奖励机制，由房主自己判断
    // 序列化属性
    @property(Prefab)
    private cardPrefab: Prefab = null;

    @property(Node)
    private uiRoot: Node = null;

    // 缓存节点，避免重复创建
    private successCard: Node | null = null;
    private isGameEnded = false;
    private checkTimer = 0;
    start() {
        // 非房主 + 非单机 → 隐藏按钮
        if (!RoomData.Instance.isHost && !RoomData.Instance.isSingle) {
            this.uiRoot.children[0].active = false;
            EventManager.Instance.on(MSG_TYPE.GAME_END, this.onSuccess, this);
        }
    }
    onDestroy() {
        EventManager.Instance.off(MSG_TYPE.GAME_END, this.onSuccess);
    }
    onSuccess(data: any) {
        if (data.roomId !== RoomData.Instance.roomInfo.roomId) return;
        EventManager.Instance.off(MSG_TYPE.GAME_END, this.onSuccess);
        if (data.isSuccess)
            this.handleGameWin()
        else
            this.handleGameP()
    }
    update(deltaTime: number) {
        if (!RoomData.Instance.isHost && !RoomData.Instance.isSingle) return
        // 游戏已结束 → 直接跳过，大幅提升性能
        if (this.isGameEnded) return;
        if (!DataManager.Instance.nodePool.size) return
        // console.log(`[nodePool] 节点数量：${DataManager.Instance.nodePool.size}`);
        this.checkTimer += deltaTime;
        // 0.2秒检测一次，不用每帧跑
        if (this.checkTimer < 0.2) return;
        this.checkTimer = 0;

        // 从对象池获取活跃节点
        const activeNodes = Array.from(DataManager.Instance.nodePool.values()).filter(
            node => node.activeInHierarchy
        );

        // 只在这里加日志
        //console.log(`[Success] 活跃节点数量：${activeNodes.length}`);

        // 只剩最后一个节点 → 游戏胜利
        if (activeNodes.length === 1) {
            // console.log(`[Success] 满足胜利条件 → 触发胜利`);
            this.sendGameEnd(true)
            this.handleGameWin();
        }
        if (activeNodes.length === 0) {
            // console.log(`[Success] 满足结束条件 → 触发结束`);
            this.sendGameEnd(false)
            this.handleGameP();
        }
    }
    sendGameEnd(iswin: boolean) {
        for (let i = 0; i < 3; i++)
            UdpManager.Instance.sendBroadcast({
                head: {
                    type: MSG_TYPE.GAME_END,
                    timestamp: Date.now(),
                    senderId: Server.Instance.playerId,
                },
                roomId: RoomData.Instance.roomInfo.roomId,
                isWin: iswin
            });
    }
    private handleGameP() {
        // 标记游戏结束，防止重复执行
        this.isGameEnded = true;

        // 隐藏关卡舞台
        const stage = getCanvas().getChildByName("Stage");
        if (stage) stage.active = false;

        // 实例化胜利卡片
        this.createSuccessCard(2);
    }
    /**
     * 处理游戏胜利逻辑
     * @param winnerNode 胜利的节点
     */
    private handleGameWin() {
        // 标记游戏结束，防止重复执行
        this.isGameEnded = true;
        const activeNodes = Array.from(DataManager.Instance.nodePool.values()).filter(
            node => node.activeInHierarchy
        );
        let winnerNode = activeNodes[0]
        // 隐藏关卡舞台
        const stage = getCanvas().getChildByName("Stage");
        if (stage) stage.active = false;

        // 实例化胜利卡片
        this.createSuccessCard(1);

        // 设置胜利颜色
        this.setWinnerColor(winnerNode);
    }

    /**
     * 创建胜利卡片并挂载UI
     */
    private createSuccessCard(isWin: number) {
        if (!this.cardPrefab) {
            console.warn("[SuccessManager] cardPrefab 未赋值！");
            return;
        }

        this.successCard = instantiate(this.cardPrefab);
        this.successCard.setParent(this.node);
        const panel = this.successCard.getChildByName("Panel");
        if (panel) {
            panel.children[isWin].active = true
            // this.uiRoot.getComponent(Widget).enabled = false
            panel.addChild(this.uiRoot);
            this.uiRoot.setPosition(0, -225);
        }
    }

    /**
     * 设置胜利者颜色
     * @param targetNode 目标节点
     */
    private setWinnerColor(targetNode: Node) {
        if (!this.successCard) return;

        const winnerSprite = this.successCard.getChildByName("Panel").getChildByName("Winner")?.getComponent(Sprite);
        const targetSprite = targetNode.getComponentInChildren(Sprite);

        if (winnerSprite && targetSprite) {
            winnerSprite.color = new Color(targetSprite.color); // 复制颜色，避免引用问题
        }
    }
}