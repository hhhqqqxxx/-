import { director, Node, Vec3 } from 'cc';
import { MOD_TYPE, MSG_TYPE } from 'db://assets/Enums';
import { ObjectPoolManager } from 'db://assets/Runtime/ObjectPoolManager';
import { UIData } from 'db://assets/Runtime/UIData';
import { RoomData } from 'db://assets/Net/RoomData';
import { StateMMU } from 'db://assets/GameStateProtocol';
import { DataManager } from '../../Runtime/DataManager';
import { AIGlassBall } from './AIGlassBall';
import { getCanvas } from '../../Utils/Tools';
import { EventManager } from '../../Runtime/EventManager';
import { POSITION_SCALE, SAFE_OFFSET } from './ConstData';

export class MMURenderer {
    private state: StateMMU;
    public nodePool: Node[] = [];
    private syncCache: Map<string, { node: Node; comp: any }> = new Map();

    initRenderNodes() {
        return new Promise<void>(resolve => {
            this.state = DataManager.Instance.getState(MOD_TYPE.MMU);
            const validIds = new Set(this.state.glassBalls.map(b => b.playerId));
            this.cleanInvalidNodes(validIds);
            this.createMissingNodes();
            resolve()
        })
    }

    public cleanInvalidNodes(validIds: Set<string>) {
        //console.log("【MMURenderer】清理无用节点")
        this.nodePool = this.nodePool.filter(node => {
            const comp = node.getComponent('GlassBallManager') as any;
            if (!comp) return false;

            const keep = validIds.has(comp.playerId);
            if (!keep) {
                ObjectPoolManager.Instance.ret(node);
            }
            return keep;
        });
    }

    public createMissingNodes() {//接收onState消息
        // console.log("【MMURenderer】创建缺失节点")
        const poolIds = new Set(this.nodePool.map(n => (n.getComponent('GlassBallManager') as any)?.playerId));

        this.state.glassBalls.forEach(ball => {
            if (!poolIds.has(ball.playerId)) {
                let stage = getCanvas()
                if (director.getScene().name === MOD_TYPE.MMU)
                    stage = stage.getChildByName("Stage")
                else
                    stage = UIData.Instance.miniScene
                const node = ObjectPoolManager.Instance.get(
                    MOD_TYPE.MMU,
                    DataManager.Instance.prefabMap,
                    stage
                );
                //  console.log("【MMURenderer】创建了节点")
                this.nodePool.push(node);
                const comp = node.getComponent('GlassBallManager') as any;
                comp?.init(ball);
                if (ball.playerId.startsWith("AI")) {
                    node.addComponent(AIGlassBall)
                    EventManager.Instance.off(MSG_TYPE.GAME_STATE, this.createMissingNodes);
                }
            }
        });
        this.buildSyncCache();
        this.refreshLayout()
    }
    public refreshLayout() {
        const pool = this.nodePool;
        const count = pool.length;

        if (count === 0) return;

        let radius = 0;

        if (director.getScene().name === MOD_TYPE.MMU)
            radius = this.state.diskSize.x * POSITION_SCALE / 2 - SAFE_OFFSET;

        const angleStep = 360 / count;
        const rad2Deg = Math.PI / 180;

        //  生成一个 0~count-1 的随机顺序索引列表
        const indices = Array.from({ length: count }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        for (let i = 0; i < count; i++) {
            const realIndex = indices[i]; // 随机取一个节点索引
            const child = pool[realIndex]; // 依然用原数组，不修改

            const angle = i * angleStep;
            const radian = angle * rad2Deg;
            const x = radius * Math.cos(radian);
            const y = radius * Math.sin(radian);

            child.setPosition(new Vec3(x, y, 0));
        }
    }
    buildSyncCache() {
        this.syncCache.clear();

        this.nodePool.forEach(node => {
            const comp = node.getComponent('GlassBallManager') as any;
            if (!comp || !comp.playerId) return;
            DataManager.Instance.nodePool.set(comp.playerId, node)
            this.syncCache.set(comp.playerId, { node, comp });
        });
        // console.log("【MMURenderer】创建缓存")
        //console.log(this.syncCache)
    }

    render() {
        if (!this.state?.glassBalls) return;
        this.state.glassBalls.forEach(ballData => {
            const cache = this.syncCache.get(ballData.playerId);
            if (!RoomData.Instance.isHost && !RoomData.Instance.isSingle)
                cache?.comp.render(ballData);
            if (RoomData.Instance.isHost || RoomData.Instance.isSingle)
                cache?.comp.fall();
        });
    }


    getBallCache() {
        return this.syncCache;
    }
}