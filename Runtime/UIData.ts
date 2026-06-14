import { _decorator, EditBox, Node } from 'cc';
import { Singleton } from '../Base/Singleton';
import { ModManager } from '../UI/ModUI/ModManager';
import { ControlerManager } from '../UI/ControlerUI/ControlerManager';
import { PersistentControler } from '../UI/ControlerUI/PersistentControler';


export class UIData extends Singleton {
    static get Instance() {
        return super.GetInstance<UIData>()
    }
    modTime: string
    playName_Box: EditBox
    roomName_Box: EditBox
    modManager: ModManager
    contolerManager: ControlerManager
    web: Node
    roomCenter: Node
    miniScene: Node
    persistControler: PersistentControler = null
    UIroot: Node = null

}


