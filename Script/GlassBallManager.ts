import { _decorator, Color, Component, director, Label, ParticleSystem2D, randomRangeInt, RigidBody2D, Sprite, tween, Tween, Vec2 } from 'cc';
import { GlassBall, StateMMU } from '../../GameStateProtocol';
import { ObjectPoolManager } from '../../Runtime/ObjectPoolManager';
import { RoomData } from '../../Net/RoomData';
import { MOD_TYPE, MSG_TYPE, TWEEN_TIME } from '../../Enums';
import { EventManager } from '../../Runtime/EventManager';
import { UdpManager } from '../../Net/UdpManager';
import { POSITION_SCALE, DANGER_OFFSET } from './ConstData';
import { DataManager } from '../../Runtime/DataManager';

const { ccclass } = _decorator;

@ccclass('GlassBallManager')
export class GlassBallManager extends Component {
    private state!: StateMMU;
    playerId: string = "?";
    private cLabel: Label = null;
    private particle: ParticleSystem2D = null;
    private rigid: RigidBody2D = null
    private lockRender = true;
    private isFalling = false
    private tempV: Vec2 = Vec2.ZERO
    private syncTimer: number | null = null;

    init(data: GlassBall) {
        // console.log(`🎱 [玻璃球] init 执行 | 玩家ID: ${data.playerId} | 名字: ${data.playName}`);
        this.state = DataManager.Instance.getState(MOD_TYPE.MMU);
        this.cLabel = this.node.getComponentInChildren(Label)!;
        this.particle = this.node.getComponentInChildren(ParticleSystem2D)!;
        this.rigid = this.node.getComponent(RigidBody2D)!;
        this.playerId = data.playerId;
        this.cLabel.string = data.playName || "无";

        const randomColor = new Color(
            randomRangeInt(0, 255),
            randomRangeInt(0, 255),
            randomRangeInt(0, 255)
        );

        // 传参用纯对象，不要直接传 Color 实例
        const dataColor = {
            head: { senderId: this.playerId },
            randomColor: { r: randomColor.r, g: randomColor.g, b: randomColor.b }
        };

        // 非MMU场景 / 单机 → 直接显示
        if (director.getScene().name !== MOD_TYPE.MMU || RoomData.Instance.isSingle) {
            // console.log(`🎱 [玻璃球] 非联机模式，直接显示颜色`);
            this.show(dataColor);
            return;
        }

        // 房主：广播颜色
        if (RoomData.Instance.isHost) {
            // console.log(`🎱 [玻璃球] 我是房主，直接显示并广播颜色`);
            this.show(dataColor);
            this.startSyncColor(randomColor);
        }
        // 非房主：监听颜色
        else {
            // console.log(`🎱 [玻璃球] 我是客户端，等待颜色同步...`);
            this.listen();

        }
    }

    /** 房主：发送3次颜色同步 */
    private startSyncColor(color: Color) {
        let count = 0;
        // console.log(`🎱 [玻璃球] 房主开始广播颜色（共3次）`);

        // 关键：转成纯JSON普通对象，不能传Color引擎对象
        const sendColorData = {
            r: color.r,
            g: color.g,
            b: color.b
        };

        this.syncTimer = setInterval(() => {
            UdpManager.Instance.sendBroadcast({
                head: {
                    type: MSG_TYPE.CHARACTER_SYNC,
                    timestamp: Date.now(),
                    senderId: this.playerId
                },
                randomColor: sendColorData
            });
            count++;
            // console.log(`🎱 [玻璃球] 房主广播颜色 → 第 ${count} 次`);

            if (count >= 3) {
                // console.log(`🎱 [玻璃球] 房主颜色广播完成，停止定时器`);
                this.clearSyncTimer();
            }
        }, 100);
    }

    /** 清理定时器 */
    private clearSyncTimer() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    /** 非房主：监听颜色 */
    private listen() {
        // console.log(`🎱 [玻璃球] 客户端开始监听颜色消息`);
        EventManager.Instance.on(MSG_TYPE.CHARACTER_SYNC, this.show, this);
        EventManager.Instance.on(MSG_TYPE.GAME_DEFEAT, this.playFallAnimation, this);
    }

    /** 显示颜色 + 动画 */
    show = (data: any) => {
        if (data.head.senderId !== this.playerId) return;
        // console.log('=====================================================');
        // console.log(`🎯 [收到颜色消息]`);
        // console.log(`🎯 我的ID: ${this.playerId}`);
        // console.log(`🎯 发送者ID: ${data?.head?.senderId ?? "无"}`);
        // console.log(`🎯 是否匹配: ${data?.head?.senderId === this.playerId ? "✅ 是" : "❌ 否"}`);
        // console.log(`🎯 收到颜色原始数据:`, data?.randomColor);
        // console.log('=====================================================');


        if (!this.cLabel || !this.node.isValid) {
            // console.log(`❌ [show] 节点或Label已销毁`);
            return;
        }

        // 容错：防止 r/g/b undefined
        const colorRaw = data.randomColor ?? { r: 255, g: 255, b: 255 };
        const finalColor = new Color(
            colorRaw.r ?? 255,
            colorRaw.g ?? 255,
            colorRaw.b ?? 255
        );

        // console.log(`✅ [show] 验证通过，解析后颜色: R=${finalColor.r} G=${finalColor.g} B=${finalColor.b}`);

        // 关闭监听，只收一次
        EventManager.Instance.offplus(MSG_TYPE.CHARACTER_SYNC, this.show, this);

        // 设置精灵颜色
        const sprite = this.node.getComponentInChildren(Sprite);
        if (sprite) {
            sprite.color = finalColor;
            // console.log(`✅ [show] 球体颜色设置成功`);
        } else {
            // console.log(`⚠️ [show] 没找到 Sprite 组件`);
        }
        this.particle = this.node.getComponent(ParticleSystem2D);
        if (this.particle) {
            this.particle.startColor = finalColor;
            this.particle.endColor = new Color(finalColor.r, finalColor.g, finalColor.b, 0);
        }

        this.node.active = true;
        this.playFadeAnimation(finalColor)
        this.lockRender = false;
        // console.log(`✅ [show] 玻璃球激活，渲染解锁`);
    };

    /** 渐变动画（保留，想用随时打开） */
    private playFadeAnimation(color: Color) {
        const duration = TWEEN_TIME.COLOR_FADE_TIME;

        this.cLabel.color = new Color(color.r, color.g, color.b);
        let c = {
            a: 255
        }
        tween(c)
            .to(duration, { a: 0 }, {
                onUpdate: () => {
                    this.cLabel.color = new Color(color.r, color.g, color.b, c.a)
                }
            })
            .start()
    }



    /** 关闭颜色监听 */
    private offListener() {
        // console.log(`🎱 [玻璃球] 关闭颜色监听`);
        EventManager.Instance.offplus(MSG_TYPE.CHARACTER_SYNC, this.show, this);
        EventManager.Instance.offplus(MSG_TYPE.GAME_DEFEAT, this.playFallAnimation, this);
    }

    render(data: GlassBall) {
        if (this.lockRender) return;
        this.node.position = this.node.position.lerp(data.position, 0.1);
    }
    fall() {
        if (this.isFalling) {
            this.rigid.linearVelocity = this.tempV
            return;
        }
        const diskRadius = (this.state.diskSize.x * POSITION_SCALE) / 2;
        const dangerRadius = diskRadius + DANGER_OFFSET;


        if (this.node.position.length() > dangerRadius) {
            this.calmDown()
            this.isFalling = true
            if (RoomData.Instance.isHost) {
                for (let i = 0; i < 3; i++)
                    UdpManager.Instance.sendBroadcast({
                        head: {
                            type: MSG_TYPE.GAME_DEFEAT,
                            timestamp: Date.now(),
                            senderId: this.playerId
                        },
                    });
            }
            const data = {
                head: {
                    senderId: this.playerId
                }
            }
            this.playFallAnimation(data)
        }
    }
    playFallAnimation(data: any) {
        if (data.head.senderId !== this.playerId) return;
        EventManager.Instance.offplus(MSG_TYPE.GAME_DEFEAT, this.playFallAnimation, this);
        const duration = TWEEN_TIME.GLASSBALL_FALL_TIME;
        let startSize = this.particle.startSize
        tween(this.node.scale)
            .to(duration, { x: 0, y: 0 },
                {
                    onUpdate: () => {
                        this.particle.startSize = startSize * this.node.scale.x
                    }
                }
            )
            .call(() => {
                this.recycle();
                ObjectPoolManager.Instance.ret(this.node)
            })
            .start()
    }
    calmDown() {
        this.tempV = this.rigid.linearVelocity
        this.rigid.enabledContactListener = false
    }
    /** 回收重置 */
    recycle() {
        // console.log(`♻️ [玻璃球] 回收`);
        this.offListener();
        this.clearSyncTimer();
        this.lockRender = true;
    }

    onDisable() {
        this.recycle();
    }
    onDestroy() {
        Tween.stopAll()
    }
}