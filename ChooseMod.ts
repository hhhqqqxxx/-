import { _decorator, Component, director, error, assetManager, AssetManager } from 'cc';
import { EventManager } from '../Runtime/EventManager';
import { CONTOLER_ENENT, MSG_TYPE, UI_EVENT } from '../Enums';
import { RoomData } from '../Net/RoomData';
import { UdpManager } from '../Net/UdpManager';
import { Server } from '../Net/Server';
import { UIData } from '../Runtime/UIData';
import { stopAllTweenPlus } from '../Utils/Tools';
const { ccclass } = _decorator;


@ccclass('ChooseMod')
export class ChooseMod extends Component {
    onLoad() {
        EventManager.Instance.on(UI_EVENT.GAME_START, this.startGame, this);
    }

    onDestroy() {
        EventManager.Instance.off(UI_EVENT.GAME_START, this.startGame);
    }


    handleStartGame(event: Event, modName: string) {
        if (!RoomData.Instance.isHost && !RoomData.Instance.isSingle) return
        if (!modName) {
            error('游戏模式名称不能为空！');
            return;
        }
        stopAllTweenPlus()
        const data = {
            modName: modName
        }
        RoomData.Instance.playerName = UIData.Instance.playName_Box.string
        Server.Instance.endBroadcast()
        EventManager.Instance.emit(UI_EVENT.GAME_START, data);
        if (RoomData.Instance.isHost) {
            for (let i = 0; i < 3; i++)
                UdpManager.Instance.sendBroadcast({
                    head: {
                        type: MSG_TYPE.GAME_START,
                        timestamp: Date.now(),
                        senderId: Server.Instance.playerId,
                    },
                    modName: modName
                });
        }
    }

    private async startGame(data: any) {
        try {
            EventManager.Instance.emit(CONTOLER_ENENT.PERSIST_CONTROLER);
            EventManager.Instance.off(UI_EVENT.GAME_START, this.startGame);
            const modName = data.modName
            // 1. 加载 Bundle
            const bundle = await this.loadBundle(modName);

            // 2. 加载并切换场景
            const scenePath = `Scenes/${modName}`;
            await this.loadAndRunScene(bundle, scenePath);

        } catch (err) {
            error(`游戏启动失败：${(err as Error).message}`);
        }
    }


    private loadBundle(modName: string): Promise<AssetManager.Bundle> {
        const bundleName = `GAME_${modName}`;
        return new Promise((resolve, reject) => {
            assetManager.loadBundle(bundleName, (err, bundle) => {
                if (err) reject(new Error(`Bundle加载失败：${bundleName}，错误：${err.message}`));
                else resolve(bundle);
            });
        });
    }


    private loadAndRunScene(bundle: AssetManager.Bundle, scenePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            bundle.loadScene(scenePath, (err, scene) => {
                if (err) reject(new Error(`场景加载失败：${scenePath}，错误：${err.message}`));
                director.runScene(scene)
                resolve()
            });
        });
    }
}