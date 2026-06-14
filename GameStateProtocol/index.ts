import { Component, Node, randomRange, Vec2, Vec3 } from 'cc';
import { InputType } from '../UI/ControlerUI/InputProtocol';
import { MOD_TYPE } from '../Enums';


// 🔥 1. 【类型映射表】模式 <-> 状态类 (类型安全核心)

export interface GameStateMap {
    [MOD_TYPE.MMU]: StateMMU;
    // 新增模式在这里加一行: [MOD_TYPE.BALL]: StateBall;
}

// MMU 状态
export class StateMMU {
    public glassBalls: GlassBall[] = [];
    public diskSize: Vec2;
    constructor() {
        const random = randomRange(1, 1.5)
        this.diskSize = new Vec2(random, random)
    }
}

// 🔥 2. 【构造器注册表】模式 <-> 构造函数 (自动创建核心)

export const GameStateRegistry = {
    [MOD_TYPE.MMU]: StateMMU,
    // 新增模式在这里加一行: [MOD_TYPE.BALL]: StateBall;
} as const satisfies Record<MOD_TYPE, new () => GameStateMap[MOD_TYPE]>;


// 3. 基础接口定义

export interface InputManager {
    inputList: InputType[];
}

export interface Network { }

export interface Renderer {
    nodePool: Node[];
}

export interface IGameMode extends Component {
    readonly modType: MOD_TYPE;
    inputManager: InputManager;
    network: Network;
    renderer: Renderer;
    init(): void;
    clean(): void;
}

// 4. 实体与状态类

export interface GlassBall {
    playName: string;
    playerId: string;
    position: Vec3;
    active: boolean;
}



// 示例：新增的 Ball 状态
// export class StateBall {
//     public score: number = 0;
// }