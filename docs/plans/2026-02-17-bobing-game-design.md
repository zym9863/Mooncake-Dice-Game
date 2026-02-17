# 博饼游戏设计文档

## 概述

基于 Vite + Vue 3 + TypeScript 实现的中国传统博饼游戏，支持多人同设备轮流掷骰子，中国风喜庆视觉风格，含骰子动画和音效。

## 游戏规则

6 颗骰子，判定优先级从高到低：

| 排名 | 名称 | 条件 | 奖品数量 |
|------|------|------|----------|
| 状元(六杯红) | 六杯红 | 6个四 | 1（共享状元池） |
| 状元(六杯黑) | 六杯黑 | 6个相同(非四) | 1 |
| 状元(五红) | 五红 | 5个四 | 1 |
| 状元(五子) | 五子 | 5个相同(非四) | 1 |
| 状元(四红) | 四红 | 4个四 | 1 |
| 榜眼 | 对堂 | 1-2-3-4-5-6各一 | 2 |
| 探花 | 三红 | 恰好3个四 | 4 |
| 进士 | 四进 | 4个相同(非四红) | 8 |
| 举人 | 二举 | 恰好2个四 | 16 |
| 秀才 | 一秀 | 恰好1个四 | 32 |

**抢状元规则**：状元只有1份，后来者掷出更高级别可以抢走前任的状元。

## 技术架构

### 组件结构

```
App.vue                    # 根组件，游戏状态机
├── SetupScreen.vue        # 设置界面：玩家人数、名字
├── GameScreen.vue         # 游戏主界面
│   ├── DiceBoard.vue      # 骰子区域（6颗骰子 + 掷骰按钮）
│   ├── Dice.vue           # 单个骰子（CSS 3D动画）
│   ├── ResultBanner.vue   # 结果展示横幅（喜庆动效）
│   ├── PrizePool.vue      # 奖品池剩余情况
│   └── PlayerList.vue     # 玩家列表及已获奖品
└── ResultScreen.vue       # 结算界面：最终排名
```

### 核心模块

```
composables/
├── useGameState.ts        # 游戏状态管理（玩家、轮次、奖品池）
├── useDiceRoll.ts         # 骰子逻辑（随机、判定）
└── useAudio.ts            # Web Audio API 音效
```

### 游戏状态

```typescript
type GamePhase = 'setup' | 'playing' | 'result'

interface Player {
  name: string
  prizes: Prize[]
}

interface Prize {
  rank: string      // '状元' | '榜眼' | '探花' | '进士' | '举人' | '秀才'
  subRank?: string  // 状元子级别
  round: number
}

interface GameState {
  phase: GamePhase
  players: Player[]
  currentPlayerIndex: number
  currentRound: number
  totalRounds: number
  prizePool: Record<string, number>  // 各奖品剩余数量
  champion: { playerIndex: number; subRank: string } | null  // 当前状元持有者
}
```

### 判定算法

```
1. 统计6颗骰子中"4"的数量 (fourCount) 和各点数出现次数
2. 按优先级判定：
   - fourCount === 6 → 六杯红
   - 有某点数出现6次(非4) → 六杯黑
   - fourCount === 5 → 五红
   - 有某点数出现5次(非4) → 五子
   - fourCount === 4 → 四红
   - 包含1,2,3,4,5,6各一个 → 对堂
   - fourCount === 3 → 三红
   - 有某点数出现4次(非4) → 四进
   - fourCount === 2 → 二举
   - fourCount === 1 → 一秀
   - 以上都不是 → 无奖
```

## 视觉设计

- 配色：红 #DC2626 / 金 #F59E0B / 深红 #991B1B 为主
- 骰子："四"用红色圆点，其余黑色
- 中奖时：金色文字 + 粒子爆炸效果
- 字体：系统默认，标题可用楷体/宋体
- 响应式：移动端优先，竖屏可操作

## 音效

- Web Audio API 合成音效，无需外部文件
- 骰子滚动声：短促的白噪声 burst
- 中奖提示声：上升音阶
- 状元特效：更长更喜庆的音效

## 游戏流程

1. 设置界面：输入 2-10 位玩家名字
2. 游戏开始：按顺序轮流掷骰子
3. 每次掷骰：动画 1.2s → 显示结果 → 自动分配奖品
4. 抢状元：后来者掷出更高级别状元，自动抢夺
5. 结束条件：所有轮次完成，或所有奖品已发完
6. 结算：显示每人获得的奖品和最终排名
