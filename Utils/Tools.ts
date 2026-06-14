import { _decorator, director, Node, Tween } from 'cc';


export const getCanvas = () => {
    return director.getScene().getChildByName("Canvas")
}

export const activeControl = (list: Node[], bool: boolean) => {
    list.forEach(node => {
        if (node) node.active = bool;
    });
}

export const deepClone = (obj: any, map = new WeakMap()) => {
    // 处理基础类型和 null
    if (typeof obj !== "object" || obj === null) {
        return obj
    }

    // 处理循环引用
    if (map.has(obj)) {
        return map.get(obj)
    }

    // 处理特殊对象
    if (obj instanceof Date) return new Date(obj)
    if (obj instanceof RegExp) return new RegExp(obj)

    // 初始化结果
    const res = Array.isArray(obj) ? [] : {}
    map.set(obj, res) // 记录当前对象，避免循环引用

    // 递归拷贝属性
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            res[key] = deepClone(obj[key], map)
        }
    }

    return res
}

export const toFix = (i: number, digit = 3) => {
    const scale = 10 ** digit
    return Math.floor(i * scale) / scale

}

export const randeonBySeed = (seed: number) => {
    return (seed * 9301 + 49297) % 233280
}

export const scheduleTimer = (fuc: Function, interval: number, repeat: number) => {
    let count = 0;
    const timer = setInterval(() => {
        count++;
        fuc();
        if (count >= repeat) {
            clearInterval(timer);
        }
    }, interval);
}

export const stopAllTweenPlus = () => {
    for (let i = 0; i < 3; i++)
        Tween.stopAll()
}