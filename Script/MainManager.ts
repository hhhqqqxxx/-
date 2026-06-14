
import { _decorator, Component, instantiate, Prefab } from 'cc';
import { MMUManager } from './MMUManager';
import { MOD_TYPE } from '../../Enums';
import { DataManager } from '../../Runtime/DataManager';
import { DiskManager } from './DiskManager';
import { ObjectPoolManager } from '../../Runtime/ObjectPoolManager';
const { ccclass, property } = _decorator;

@ccclass('MainManager')
export class MainManager extends Component {
    @property(Prefab)
    disk: Prefab = null
    async onLoad() {
        ObjectPoolManager.Instance.reset()
        DataManager.Instance.init(MOD_TYPE.MMU);
        await this.putStage()
        this.perform()
    }

    async putStage() {
        let disk = instantiate(this.disk)
        disk.setParent(this.node)
        await disk.getComponent(DiskManager).init()
    }
    perform() {
        let activeMode = this.node.getComponent(MMUManager);
        activeMode.enabled = true;
        activeMode.init?.();
    };

}
