import { _decorator, sys } from 'cc';
import { EventManager } from '../Runtime/EventManager';
import { Singleton } from '../Base/Singleton';
const { ccclass } = _decorator;

@ccclass('UdpManager')
export class UdpManager extends Singleton {
    static get Instance() {
        return super.GetInstance<UdpManager>()
    }
    tap: boolean = false
    private udp: any = null;
    localPort = 6666;
    broadcastAddr = '255.255.255.255';
    broadcastPort = 6666;
    isInit = false;

    async init() {
        if (this.isInit) return;
        if (sys.platform !== sys.Platform.WECHAT_GAME) {
            return;
        }
        // await this.getBroadcastIP()
        // console.log("子网:" + this.broadcastAddr)
        // this.broadcastAddr = '255.255.255.255';//////////////////
        return new Promise<void>(resolve => {
            if (!this.tap)
                // @ts-ignore
                this.udp = wx.createUDPSocket();
            else
                // @ts-ignore
                this.udp = tap.createUDPSocket();
            this.udp.bind(this.localPort);

            this.udp.onMessage(res => {
                try {
                    const str = this.ab2str(res.message);
                    const msg = JSON.parse(str);
                    const type = msg.head?.type;
                    if (type) {
                        EventManager.Instance.emit(type, msg, res.remoteInfo);
                    }
                } catch (e) {
                    console.error(e)
                }
            });

            this.udp.onError((err: any) => {
                console.error('UDP错误', err);
            });

            this.isInit = true;
            resolve();

        });
    }
    // getBroadcastIP(): Promise<string> {
    //     return new Promise((resolve, reject) => {
    //         if (!this.tap)
    //             // @ts-ignore
    //             wx.getLocalIPAddress({
    //                 success: (res) => {
    //                     
    //                     let ip: string = res.localip;
    //                     console.log(ip)
    //                     let parts: string[] = ip.split('.');
    //                     console.log(parts)
    //                    
    //                     this.broadcastAddr = parts[0] + '.' + parts[1] + '.' + parts[2] + '.255';
    //                     resolve(this.broadcastAddr);
    //                 },
    //                 fail: (err) => {
    //                     reject(err);
    //                 }
    //             })
    //         else
    //             // @ts-ignore
    //             tap.getLocalIPAddress({
    //                 success: (res) => {
    //                     
    //                     let ip = res.localip;
    //                     let parts = ip.split('.');
    //                     
    //                     this.broadcastAddr = parts[0] + '.' + parts[1] + '.' + parts[2] + '.255';
    //                     resolve(this.broadcastAddr);
    //                 },
    //                 fail: (err) => {
    //                     reject(err);
    //                 }
    //             })
    //     })
    // }



    sendBroadcast(obj: any) {
        if (!this.isInit) return;
        const str = JSON.stringify(obj);
        const data = this.str2ab(str);
        this.udp.send({ address: this.broadcastAddr, port: this.broadcastPort, message: data });
    }

    sendUnicast(ip: string, port: number, obj: any) {
        if (!this.isInit) return;
        const str = JSON.stringify(obj);
        const data = this.str2ab(str);
        this.udp.send({ address: ip, port: port, message: data });
    }

    // ArrayBuffer → 字符串
    private ab2str(buf: ArrayBuffer): string {
        let arr = new Uint8Array(buf);
        let str = "";
        for (let i = 0; i < arr.length; i++) {
            str += String.fromCharCode(arr[i]);
        }
        return str;
    }
    // 字符串 → ArrayBuffer
    private str2ab(str: string): ArrayBuffer {
        let buf = new ArrayBuffer(str.length);
        let view = new Uint8Array(buf);
        for (let i = 0; i < str.length; i++) {
            view[i] = str.charCodeAt(i);
        }
        return buf;
    }
    close() {
        this.udp?.close();
        this.isInit = false;
    }
}