# 🎮 PlayTogeter

> 基于 Cocos Creator 3.8.8 的局域网多人派对游戏框架 —— 支持微信小游戏 & TapTap 小游戏双平台

[![Cocos Creator](https://img.shields.io/badge/Cocos_Creator-3.8.8-blue?logo=cocos)](https://www.cocos.com/creator)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-WeChat_|_TapTap-green)]()

---

## 📖 项目简介

**PlayTogeter** 是一款运行在微信小游戏和 TapTap 小游戏平台上的**本地局域网多人派对游戏**。玩家通过 UDP 广播在同一 WiFi 下自动发现彼此、组建房间、选择游戏模式并实时对战。

目前内置 **「MMU」** 游戏模式 —— 一场在**持续缩小的圆盘**上进行的玻璃球大逃杀：玩家操控彩色玻璃球，利用物理碰撞将对手推下圆盘，最后存活者获胜。支持**多人联机**、**单人 AI 对战**（含 10 个 AI 对手）以及**回合重开**。

项目采用**可扩展的多模式架构**，新增游戏模式只需实现 `IGameMode` 接口并注册即可接入大厅系统。

---

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| **游戏引擎** | Cocos Creator 3.8.8（2D） |
| **编程语言** | TypeScript |
| **物理引擎** | Box2D（WASM 子包） |
| **网络通信** | UDP（WeChat `wx.createUDPSocket` / TapTap `tap.createUDPSocket`） |
| **资源管理** | Cocos Asset Bundle（按模式分包加载） |
| **构建目标** | 微信小游戏 / TapTap 小游戏 |
| **渲染管线** | Cocos 2D Renderer（Sprite、ParticleSystem2D、Label、Tween） |

---

## 🏗 架构设计

```
assets/
├── Base/                   # 🔹 基础类
│   ├── Singleton.ts         #   泛型单例基类
│   └── Carouselton.ts       #   轮播/滚动基类
├── Enums/                   # 🔹 枚举常量（事件名、消息类型、模式标识）
├── GameStateProtocol/       # 🔹 类型安全的游戏状态协议
│   └── index.ts             #   状态映射表 + 构造器注册表 + IGameMode 接口
├── Runtime/                 # 🔹 运行时核心服务
│   ├── EventManager.ts      #   事件发布/订阅系统（on/off/emit）
│   ├── DataManager.ts       #   强类型状态存储 + 预制体缓存
│   ├── ObjectPoolManager.ts #   通用节点对象池
│   └── UIData.ts            #   UI 引用单例（跨模块访问）
├── Net/                     # 🔹 网络层
│   ├── UdpManager.ts        #   UDP Socket 封装（广播/单播/消息分发）
│   ├── Server.ts            #   房主逻辑（房间创建/心跳/玩家管理/重连）
│   ├── Client.ts            #   客户端逻辑（房间发现/加入/心跳/断线重连）
│   ├── RoomManager.ts       #   房间基类（玩家增删、ID 生成）
│   ├── RoomData.ts          #   房间状态数据单例
│   └── MsgProtocol.ts       #   消息类型接口定义
├── UI/                      # 🔹 UI 层
│   ├── UIManager.ts         #   UI 初始化绑定
│   ├── HallManager.ts       #   大厅状态管理
│   ├── ChooseMod.ts         #   模式选择 & Bundle 动态加载
│   ├── ControlerUI/         #   虚拟摇杆控制器（持久化节点）
│   ├── ModUI/               #   模式轮播 & 多人同步
│   ├── RoomUI/              #   房间列表 / 创建 / 加入
│   └── MiniManager/         #   大厅迷你场景预览
├── GAME_MMU/                # 🔹 游戏模式子包（MMU）
│   ├── Script/
│   │   ├── MMUManager.ts    #     模式总控（实现 IGameMode）
│   │   ├── MMUInputManager.ts #   输入处理 & 物理驱动力
│   │   ├── MMUNetwork.ts    #     游戏状态广播同步
│   │   ├── MMURenderer.ts   #     节点渲染 & 布局
│   │   ├── DiskManager.ts   #     缩圈圆盘管理
│   │   ├── GlassBallManager.ts # 玻璃球实体
│   │   ├── AIGlassBall.ts   #     AI 敌人行为
│   │   ├── ReadyTimer.ts    #     开局倒计时
│   │   ├── SuccessManager.ts #    胜负判定 & 结算 UI
│   │   └── ConstData.ts     #     玩法数值常量
│   ├── Prefab/              #   预制体（Disk / GlassBall / 结算卡）
│   ├── Scenes/              #   MMU.scene
│   └── Sprite/              #   精灵资源
├── ModFunc/                 # 🔹 通用功能（相机跟随 / 退出重开）
├── Utils/                   # 🔹 工具函数
└── resources/               # 🔹 共享资源（图片 / UI 预制体）
```

### 核心设计模式

| 模式 | 应用 | 说明 |
|------|------|------|
| **Singleton** | 所有 Manager 类 | 通过泛型 `Singleton.GetInstance<T>()` 实现全局单例访问 |
| **Event-Driven** | 模块间通信 | `EventManager` 提供 `on / off / emit` 发布订阅，模块零耦合 |
| **Object Pool** | 游戏实体节点 | `ObjectPoolManager` 复用 GlassBall 节点，避免频繁实例化 |
| **Type-Safe Registry** | 游戏模式扩展 | `GameStateRegistry` 映射 `MOD_TYPE → 状态构造函数`，编译时类型检查 |
| **Strategy** | 多模式支持 | `IGameMode` 接口统一 `init / clean / inputManager / network / renderer` |
| **Carousel** | UI 滚动选择 | `Carouselton` 基类提供轮播索引导航 |

---

## ✨ 核心功能与技术亮点

### 🌐 UDP 局域网零配置联机

- 基于 UDP 广播的**自动房间发现**，无需服务器、无需输入 IP
- 房主定期广播房间信息（1s 间隔），客户端自动发现并展示房间列表
- 心跳保活机制（6s 超时剔除）+ **断线自动重连**（4.5s 触发重连，5s 超时）
- WeChat / TapTap 双平台 UDP API 抽象封装，通过 `UdpManager.tap` 标志位切换

### 🎯 类型安全的可扩展模式系统

```typescript
// 新增游戏模式只需三步：
// 1. 在 MOD_TYPE 枚举中添加新值
// 2. 定义状态类并注册到 GameStateRegistry
// 3. 实现 IGameMode 接口
export interface IGameMode extends Component {
    readonly modType: MOD_TYPE;
    inputManager: InputManager;
    network: Network;
    renderer: Renderer;
    init(): void;
    clean(): void;
}
```

- `DataManager` 使用 TypeScript Mapped Types 实现强类型状态存储，杜绝 `any`
- `GameStateProtocol` 通过 `satisfies Record<MOD_TYPE, ...>` 确保模式注册完整性

### ⚡ 物理驱动的实时对战

- 基于 Box2D（`RigidBody2D` + `CircleCollider2D`）的真实物理碰撞
- 房主统一计算物理 + 广播状态（100ms 间隔），客户端插值同步
- 线性阻尼 + 速度叠加的操控手感调校

### 🧠 AI 对战系统

- 单机模式下自动生成 10 个 AI 对手（`AIGlassBall`）
- AI 行为：碰撞检测 → 锁定最近目标 → 朝目标方向施加冲击力
- 边界感知：靠近圆盘边缘时自动反向转向，模拟生存策略

### 📦 动态分包加载

- 游戏模式作为独立 Asset Bundle，按需加载，减小首包体积
- `PreloadPrefab` 在启动阶段预加载 Bundle 内预制体并缓存到 `DataManager.prefabMap`
- 场景切换自动释放旧 Bundle，控制内存占用

### 🎨 虚拟摇杆控制器

- 持久化节点（`PersistentControler`），跨场景不销毁
- 触摸拖动归一化方向向量，支持多指操作
- 轮播式控制器切换（`ControlerManager extends Carouselton`）

### 🎬 大厅交互体验

- 模式轮播选择器（Tween 动画）+ 迷你场景预览（`MiniScene`）
- 房间列表实时刷新 + 过期房间自动清理（3s 超时）
- 模式和场景在多人房间内同步切换

---

## 🚀 运行方式

### 环境要求

- **Cocos Creator 3.8.8**（[下载地址](https://www.cocos.com/creator-download)）
- **微信开发者工具**（[下载地址](https://developers.weixin.qq.com/minigame/dev/devtools/download.html)）或 **TapTap 开发者工具**
- Node.js 16+

### 本地开发

```bash
# 1. 克隆项目
git clone <repo-url>
cd PlayTogeterSimple

# 2. 使用 Cocos Creator 3.8.8 打开项目
#    启动 Cocos Creator → 导入项目 → 选择 PlayTogeterSimple 目录

# 3. 在编辑器中预览（F5 或点击"预览"按钮）
```

### 构建发布

```bash
# 微信小游戏
# Cocos Creator → 菜单栏 → 项目 → 构建发布
#   平台：微信小游戏
#   主包压缩类型：合并依赖
#   开启 WASM 子包

# TapTap 小游戏
# 先构建微信小游戏，再通过 extensions/taptap-minigame-tools 转换
```

### 联机测试

1. 两台或多台设备连接**同一 WiFi / 局域网**
2. 一台设备点击「创建房间」成为房主
3. 其他设备在房间列表中选择房间并「加入」
4. 房主选择游戏模式后点击「开始游戏」
5. 所有玩家自动进入游戏场景，等待 3 秒倒计时后开战

---

## 📂 项目结构速览

```
PlayTogeterSimple/
├── assets/                  # 游戏资源 & 脚本
│   ├── Base/                # 基础类（Singleton / Carouselton）
│   ├── Enums/               # 枚举定义
│   ├── GameStateProtocol/   # 游戏状态类型系统
│   ├── GAME_MMU/            # MMU 游戏模式子包
│   ├── ModFunc/             # 通用功能组件
│   ├── Net/                 # 网络通信层
│   ├── Runtime/             # 运行时服务
│   ├── Scenes/              # 场景文件（Start / Main）
│   ├── Script/              # 启动引导脚本
│   ├── UI/                  # UI 组件
│   ├── Utils/               # 工具函数
│   └── resources/           # 共享资源
├── extensions/              # 扩展插件（TapTap 转换工具）
├── settings/                # 项目设置
├── profiles/                # 构建配置
├── package.json             # 项目配置
└── tsconfig.json            # TypeScript 配置
```

---

## 🎯 游戏玩法（MMU 模式）

| 要素 | 说明 |
|------|------|
| **胜利条件** | 将其他所有玩家的玻璃球撞下圆盘，成为最后存活者 |
| **缩圈机制** | 圆盘每 1 秒缩小 `0.01` 倍，活动空间持续收窄 |
| **操作方式** | 虚拟摇杆控制移动方向，碰撞产生推力 |
| **AI 敌人** | 单机模式自动生成 10 个 AI，主动攻击 + 边界避险 |
| **结算展示** | 胜利/失败卡片 + 获胜者颜色标识 |

---

## 📝 开发信息

### 构建配置

- **设计分辨率**：1280 × 720（横屏）
- **物理引擎**：2D Physics（Box2D WASM 子包）
- **引擎裁剪**：关闭 3D / Spine / DragonBones / WebSocket，启用 2D / UI / Tween / Particle / Audio

### 消息协议

所有网络通信使用 **JSON over UDP**，消息格式：

```typescript
interface MsgHead {
    type: MSG_TYPE;      // 消息类型
    timestamp: number;   // 时间戳
    senderId: string;    // 发送者 ID
}
```

消息通过 `UdpManager` 接收后，按 `head.type` 分发到 `EventManager`，各模块自行监听处理。

### 代码规范

- TypeScript `strict: false`（Cocos Creator 默认）
- 类名使用 PascalCase，方法名使用 camelCase
- 单例通过 `static get Instance()` 访问
- 事件监听必须配对 `onLoad/onDestroy` 或 `onEnable/onDisable` 进行注销
- 游戏模式通过 `IGameMode` 接口实现，确保 `init()` 和 `clean()` 正确管理生命周期

---

## 📄 License

MIT License © 2026

---

<p align="center">
  <sub>Built with Cocos Creator & TypeScript | WeChat Mini Game + TapTap Mini Game</sub>
</p>
