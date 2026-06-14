import { _decorator, Component, director, Vec3 } from 'cc';
import { MMUNetwork } from './MMUNetwork';
import { MMURenderer } from './MMURenderer';
import { MMUInputManager } from './MMUInputManager';
import { MOD_TYPE, MSG_TYPE } from 'db://assets/Enums';
import { IGameMode, StateMMU } from 'db://assets/GameStateProtocol';
import { PlayerInfo } from 'db://assets/Net/MsgProtocol';
import { RoomData } from 'db://assets/Net/RoomData';
import { EventManager } from 'db://assets/Runtime/EventManager';
import { DataManager } from '../../Runtime/DataManager';
import { ObjectPoolManager } from '../../Runtime/ObjectPoolManager';
import { AI_NUM } from './ConstData';


const { ccclass } = _decorator;

@ccclass('MMUManager')
export class MMUManager extends Component implements IGameMode {
    state: StateMMU;
    players: PlayerInfo[];
    lockRender = true;

    inputManager: MMUInputManager;
    network: MMUNetwork;
    renderer: MMURenderer;
    isInit: boolean = false
    public get modType(): MOD_TYPE {
        return MOD_TYPE.MMU;
    }
    onEnable() {
        if (!this.isInit)
            this.initDependencies();
        this.registerEvents();
    }

    onDisable() {
        this.unregisterEvents();
        this.network.stopSync();
        this.inputManager.stopTimer();
    }

    update() {
        if (this.lockRender) return;
        this.renderer.render()
        this.inputManager.applyInput();
        this.inputManager.sendInput()
    }

    async init() {
        this.lockRender = true;
        this.players = RoomData.Instance.roomInfo.players;
        this.state = DataManager.Instance.getState(MOD_TYPE.MMU);
        this.initGameState();
        await this.initC()//每块都要await，每块等每块的await
        this.lockRender = false;
    }
    async initC() {
        await this.renderer.initRenderNodes();
        this.applyNeed();
        this.inputManager.init();
        this.network.startStateSync();
    }
    clean() {
        ObjectPoolManager.Instance.retMany(this.renderer.nodePool)
        this.renderer.nodePool = []
        this.inputManager.inputList = []
        DataManager.Instance.init(MOD_TYPE.MMU)
    }
    private initDependencies() {
        this.inputManager = new MMUInputManager();
        this.network = new MMUNetwork();
        this.renderer = new MMURenderer();
        this.isInit = true
    }

    private applyNeed() {
        this.inputManager.applyNeed(this.renderer.getBallCache());
        this.network.applyNeed(this.renderer.getBallCache());
    }

    private registerEvents() {
        if (RoomData.Instance.isHost)
            EventManager.Instance.on(MSG_TYPE.GAME_INPUT, this.inputManager.onInput, this.inputManager);
        if (!RoomData.Instance.isHost && !RoomData.Instance.isSingle)
            EventManager.Instance.on(MSG_TYPE.GAME_STATE, this.network.onState, this.network);
        if (!RoomData.Instance.isHost && !RoomData.Instance.isSingle && director.getScene().name === MOD_TYPE.MMU)
            EventManager.Instance.on(MSG_TYPE.GAME_STATE, this.renderer.createMissingNodes, this.renderer);
    }

    private unregisterEvents() {
        EventManager.Instance.off(MSG_TYPE.GAME_INPUT, this.inputManager.onInput);
        EventManager.Instance.off(MSG_TYPE.GAME_STATE, this.network.onState);
    }

    private initGameState() {
        if (RoomData.Instance.isSingle) {
            this.state.glassBalls = [{
                playerId: '?',
                playName: RoomData.Instance.playerName,
                position: Vec3.ZERO,
                active: true
            }];
        }
        else {
            this.state.glassBalls = this.state.glassBalls.filter(ball => {
                const keep = this.players.some(p => p.playerId === ball.playerId);
                if (!keep)
                    this.inputManager.removeInput(ball.playerId)
                return keep;
            });

            const existIds = new Set(this.state.glassBalls.map(b => b.playerId));
            const newBalls = this.players
                .filter(p => !existIds.has(p.playerId))
                .map(p => ({ playerId: p.playerId, playName: p.playName, position: Vec3.ZERO, active: true }));

            this.state.glassBalls.push(...newBalls);
        }
        if (director.getScene().name === MOD_TYPE.MMU)
            if (RoomData.Instance.isHost || RoomData.Instance.isSingle)
                for (let i = 0; i <= AI_NUM; i++)
                    this.state.glassBalls.push({
                        playerId: `AI${i}`,
                        playName: "AI",
                        position: Vec3.ZERO,
                        active: true
                    })
        //console.log("初始化游戏状态")
        // console.log(this.state)
    }
}