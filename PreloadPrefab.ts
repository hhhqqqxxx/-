import { _decorator, assetManager, Component, Prefab } from 'cc';
import { MOD_TYPE } from '../Enums';
import { DataManager } from '../Runtime/DataManager';

const { ccclass } = _decorator;

@ccclass('PreloadPrefab')
export class PreloadPrefab extends Component {

    // ======================
    // 🔥 配置表：以后加东西只改这里
    // ======================
    private readonly preloadConfig = [
        { bundle: 'GAME_MMU', prefabPath: 'Prefab/GlassBall', type: MOD_TYPE.MMU },

        // 想加多少加多少！
    ];

    /**
     * 批量预加载所有分包预制体
     */
    async preLoadAllPrefabs() {
        // console.log('开始预加载所有小游戏预制体...');

        for (const config of this.preloadConfig) {
            await this.loadSinglePrefab(
                config.bundle,
                config.prefabPath,
                config.type
            );
        }

        //console.log('✅ 所有预制体加载完成！');
    }

    /**
     * 加载单个分包 -> 单个预制体 -> 卸载分包 -> 保留资源
     */
    private loadSinglePrefab(
        bundleName: string,
        prefabName: string,
        modType: MOD_TYPE
    ): Promise<void> {
        return new Promise((resolve) => {
            // 1. 加载分包
            assetManager.loadBundle(bundleName, (err, bundle) => {
                if (err) {
                    //console.error(`加载分包失败：${bundleName}`, err);
                    resolve();
                    return;
                }

                // 2. 加载指定预制体
                bundle.load<Prefab>(prefabName, Prefab, (err, prefab) => {
                    if (err) {
                        //  console.error(`加载预制体失败：${prefabName}`, err);
                        resolve();
                        return;
                    }

                    // 3. 保存到全局
                    DataManager.Instance.prefabMap.set(modType, prefab);
                    //console.log(`✅ 加载完成：${bundleName}/${prefabName}`);

                    // 4. 卸载分包，保留资源
                    assetManager.removeBundle(bundle);

                    resolve();
                });
            });
        });
    }
}