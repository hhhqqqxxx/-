import { _decorator, Prefab, Node } from 'cc';
import { Singleton } from '../Base/Singleton';
import { MOD_TYPE } from '../Enums';
import { GameStateMap, GameStateRegistry } from '../GameStateProtocol';
import { InputType } from '../UI/ControlerUI/InputProtocol';

const { ccclass } = _decorator;

@ccclass('DataManager')
export class DataManager extends Singleton {
    static get Instance() {
        return super.GetInstance<DataManager>()
    }
    nodePool: Map<string, Node>
    inputList: InputType[]
    // 预制体缓存
    public readonly prefabMap: Map<MOD_TYPE, Prefab> = new Map();

    // 🔥 核心状态存储（强类型 Map）
    private readonly _stateMap: Map<string, GameStateMap[MOD_TYPE]> = new Map();

    // 🔥 【终极初始化】自动根据传入的 MOD_TYPE 创建状态
    public init(modType: string): void {
        const StateClass = GameStateRegistry[modType];
        this._stateMap.set(modType, new StateClass());
        this.nodePool = new Map<string, Node>()
        this.inputList = []
    }

    // 🔥 【强类型】获取状态（自动提示，无 any）
    public getState<K extends MOD_TYPE>(type: K): GameStateMap[K] {
        const state = this._stateMap.get(type);

        // 开发环境防错
        if (!state) {
            throw new Error(`[DataManager] 未找到 ${MOD_TYPE[type]} 状态，请先在 init 中传入！`);
        }

        return state;
    }


    // 🔥 【强类型】覆盖状态

    public setState<K extends MOD_TYPE>(type: K, state: GameStateMap[K]): void {
        this._stateMap.set(type, state);
    }

    // 清空所有状态（场景切换/重启用）
    public clearAllState(): void {
        this._stateMap.clear();
    }
}