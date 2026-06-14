import { _decorator, Node, instantiate, Prefab } from 'cc';
import { Singleton } from '../Base/Singleton';

const { ccclass } = _decorator;

@ccclass('ObjectPoolManager')
export class ObjectPoolManager extends Singleton {
  static get Instance() {
    return super.GetInstance<ObjectPoolManager>();
  }

  // 根节点：所有对象池的父节点（隐藏节点，不渲染）
  private objectPool: Node;
  // 按实体类型分类存储节点队列
  private map: Map<string, Node[]> = new Map();

  /**
   * 从对象池获取一个节点
   * @param type 实体类型
   * @returns 可用节点
   */
  get(type: string, prefabMap: Map<string, Prefab>, stage: Node): Node {
    // 1. 初始化根池容器（只执行一次）
    if (!this.objectPool) {
      this.objectPool = new Node("ObjectPool");
      // 把对象池节点挂到场景根节点，避免被场景销毁逻辑误删
      this.objectPool.setParent(stage);
    }

    // 2. 如果该类型还没有创建过池子，初始化一个
    if (!this.map.has(type)) {
      this.map.set(type, []);
      // 创建该类型的子池容器
      const container = new Node(type + "Pool");
      container.setParent(this.objectPool);
    }

    // 3. 获取该类型的节点队列
    const nodes = this.map.get(type)!;

    // 4. 如果池子里没有可用节点，实例化新的
    if (!nodes.length) {
      const prefab = prefabMap.get(type);
      if (!prefab) {
        console.error(`ObjectPoolManager: 找不到类型为 ${type} 的预制体！`);
        return new Node(); // 兜底，避免报错
      }

      const node = instantiate(prefab);
      node.name = type; // 标记类型，归还时用
      node.setParent(this.objectPool.getChildByName(type + "Pool"));
      node.active = false;
      return node;
    } else {
      // 5. 池子里有节点，直接取出复用
      const node = nodes.pop()!;
      // node.active = true;
      return node;
    }
  }

  /**
   * 将节点归还到对象池
   * @param node 要归还的节点
   */
  ret(node: Node) {
    if (!node || !node.isValid) {
      console.warn("ObjectPoolManager: 归还了无效节点！");
      return;
    }

    // 1. 隐藏节点，标记为不可用
    node.active = false;

    // 2. 根据节点名称（实体类型）归还到对应池子
    const type = node.name;
    if (this.map.has(type)) {
      this.map.get(type)!.push(node);
    } else {
      console.warn(`ObjectPoolManager: 节点类型 ${type} 不存在对应池子，直接销毁节点！`);
      node.destroy();
    }
  }

  /**
   * 一次性归还多个节点（可选扩展）
   * @param nodes 节点数组
   */
  retMany(nodes: Node[]) {
    nodes.forEach(node => this.ret(node));
  }
  /**
   * 清空指定类型的对象池（可选扩展）
   * @param type 实体类型
   */
  clear(type?: string) {
    if (type) {
      // 清空指定类型的池子
      const nodes = this.map.get(type);
      if (nodes) {
        nodes.forEach(node => node.destroy());
        this.map.set(type, []);
      }
    } else {
      // 清空所有池子
      this.map.forEach((nodes, key) => {
        nodes.forEach(node => node.destroy());
        this.map.set(key, []);
      });
    }
  }

  reset() {
    this.objectPool = null
    this.map.clear()
  }
}