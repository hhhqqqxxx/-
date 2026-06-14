import { _decorator, BoxCollider2D, Collider2D, Component, Contact2DType, math, Node, RigidBody2D, v2, Vec2, Vec3 } from 'cc';
import { RoomData } from '../../Net/RoomData';
import { DataManager } from '../../Runtime/DataManager';
import { GAME_MMU, MOD_TYPE } from '../../Enums';
import { ATTACK_DISTANCE, ATTACK_SPEED, LINEAR_DAMPING, POSITION_SCALE, SAFE_OFFSET, SPEED } from './ConstData';
import { StateMMU } from '../../GameStateProtocol';
import { EventManager } from '../../Runtime/EventManager';

const { ccclass, property } = _decorator;



@ccclass('AIGlassBall')
export class AIGlassBall extends Component {
    private state!: StateMMU;
    private rigidBody: RigidBody2D = null;
    private target: Node = null
    private dir: Vec3 = new Vec3();
    private box: BoxCollider2D = null
    private diskRadius: number = 1200
    isStart = false

    onLoad() {
        // 初始化时就获取刚体，避免 update 里频繁 GetComponent
        if (!RoomData.Instance.isHost && !RoomData.Instance.isSingle) return
        EventManager.Instance.on(GAME_MMU.READY_TIME_ON, this.AiStart, this);
        this.rigidBody = this.node.getComponent(RigidBody2D);
        this.state = DataManager.Instance.getState(MOD_TYPE.MMU);
        this.equip()
    }

    onDisable() {
        if (this.box)
            this.box.off(Contact2DType.BEGIN_CONTACT, this.attack, this)
        EventManager.Instance.offplus(GAME_MMU.READY_TIME_ON, this.AiStart, this);
    }

    AiStart() {
        EventManager.Instance.offplus(GAME_MMU.READY_TIME_ON, this.AiStart, this);
        this.isStart = true
    }
    equip() {
        this.rigidBody.enabledContactListener = true
        this.box = this.node.addComponent(BoxCollider2D)
        this.box.density = 0
        this.box.size = math.size(this.diskRadius, this.diskRadius)
        this.box.sensor = true
        this.box.on(Contact2DType.BEGIN_CONTACT, this.attack, this)
    }
    attack(selfCollider: Collider2D, otherCollider: Collider2D) {
        if (!this.isStart) return
        this.target = otherCollider.node;

        // 缓存速度（减少访问）
        const velocity = this.rigidBody.linearVelocity;

        Vec2.subtract(
            this.dir,
            this.node.position,
            this.target.position
        );
        Vec2.normalize(this.dir, this.dir);
        // ATTACK_SPEED = randomRangeInt(3, 6)
        // 计算新速度
        const newVX = velocity.x - this.dir.x * ATTACK_SPEED - velocity.x * LINEAR_DAMPING;
        const newVY = velocity.y - this.dir.y * ATTACK_SPEED - velocity.y * LINEAR_DAMPING;

        // 应用速度
        this.rigidBody.linearVelocity = v2(newVX, newVY);
    }
    update(deltaTime: number) {
        this.survival();
    }

    private survival() {
        if (!this.isStart) return
        // 非主机、非单机直接退出（原逻辑）
        if (!this.rigidBody) return;

        // 缓存当前速度
        const velocity = this.rigidBody.linearVelocity;
        const vX = velocity.x;
        const vY = velocity.y;

        // 计算圆盘半径（提取魔法数字）
        this.diskRadius = (this.state.diskSize.x * POSITION_SCALE) / 2;
        const safeRadius = this.diskRadius - SAFE_OFFSET;
        this.box.size = math.size(this.diskRadius + ATTACK_DISTANCE, this.diskRadius + ATTACK_DISTANCE)//每一秒变一次

        // 判断是否超出安全区域
        if (this.node.position.length() > safeRadius) {
            // 计算反方向
            this.dir = Vec2.normalize(this.node.position, this.node.position);

            // 计算新速度（原逻辑不变）
            const newVX = vX - this.dir.x * SPEED - vX * LINEAR_DAMPING;
            const newVY = vY - this.dir.y * SPEED - vY * LINEAR_DAMPING;

            // 应用新速度
            this.rigidBody.linearVelocity = v2(newVX, newVY);
        }
    }
}