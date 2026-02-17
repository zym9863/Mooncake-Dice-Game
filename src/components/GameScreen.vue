<script setup lang="ts">
import { ref, computed } from 'vue'
import Dice from './Dice.vue'
import { useDiceRoll, type DiceResult } from '../composables/useDiceRoll'
import { useAudio } from '../composables/useAudio'
import type { Player, Champion, GameEndMode } from '../composables/useGameState'

const props = defineProps<{
  players: Player[]
  currentPlayerIndex: number
  currentRound: number
  totalRounds: number
  endMode: GameEndMode
  prizePool: Record<string, number>
  champion: Champion | null
}>()

const emit = defineEmits<{
  rolled: [result: DiceResult]
  next: []
}>()

const { currentDice, isRolling, roll } = useDiceRoll()
const audio = useAudio()

const showResult = ref(false)
const lastResult = ref<DiceResult | null>(null)
const prizeAwarded = ref('')
const wasStolen = ref(false)
const waitingNext = ref(false)

const currentPlayer = computed(() => props.players[props.currentPlayerIndex])

const totalPrizes = computed(() =>
  Object.values(props.prizePool).reduce((a, b) => a + b, 0)
)

const prizeEntries = computed(() => [
  { name: '状元', count: props.prizePool['状元'] || 0, color: '#F59E0B' },
  { name: '榜眼', count: props.prizePool['榜眼'] || 0, color: '#C084FC' },
  { name: '探花', count: props.prizePool['探花'] || 0, color: '#FCA5A5' },
  { name: '进士', count: props.prizePool['进士'] || 0, color: '#67E8F9' },
  { name: '举人', count: props.prizePool['举人'] || 0, color: '#86EFAC' },
  { name: '秀才', count: props.prizePool['秀才'] || 0, color: '#D4A0A0' },
])

const particles = ref<{ id: number; x: number; y: number; color: string }[]>([])
let particleId = 0

function spawnParticles() {
  const colors = ['#F59E0B', '#DC2626', '#FDE68A', '#FCA5A5', '#FBBF24']
  const newParticles = Array.from({ length: 20 }, () => ({
    id: particleId++,
    x: Math.random() * 100,
    y: Math.random() * 30,
    color: colors[Math.floor(Math.random() * colors.length)] ?? '#F59E0B',
  }))
  particles.value = newParticles
  setTimeout(() => { particles.value = [] }, 1600)
}

async function handleRoll() {
  showResult.value = false
  waitingNext.value = false
  audio.playDiceRoll()

  const result = await roll()
  audio.playDiceLand()
  lastResult.value = result
  showResult.value = true

  emit('rolled', result)

  // 延迟一点显示结果
  await new Promise(r => setTimeout(r, 300))

  if (result.championLevel > 0) {
    // 看是否抢到
    if (props.champion && props.champion.playerIndex === props.currentPlayerIndex) {
      audio.playChampion()
      spawnParticles()
    } else if (props.champion) {
      audio.playSteal()
      spawnParticles()
      wasStolen.value = true
    } else {
      audio.playChampion()
      spawnParticles()
    }
    prizeAwarded.value = '状元'
  } else if (result.rank) {
    audio.playWin()
    spawnParticles()
    prizeAwarded.value = result.rankTitle
  } else {
    audio.playNoWin()
    prizeAwarded.value = ''
  }

  waitingNext.value = true
}

function handleNext() {
  showResult.value = false
  waitingNext.value = false
  wasStolen.value = false
  lastResult.value = null
  prizeAwarded.value = ''
  emit('next')
}

const shouldShowResultButton = computed(() => {
  if (props.endMode === 'all_prizes_distributed') {
    return totalPrizes.value <= 0
  }

  return props.currentRound >= props.totalRounds && props.currentPlayerIndex >= props.players.length - 1
})
</script>

<template>
  <div class="game-screen">
    <!-- 粒子效果 -->
    <div class="particles" v-if="particles.length">
      <div
        v-for="p in particles"
        :key="p.id"
        class="particle"
        :style="{
          left: p.x + '%',
          top: p.y + '%',
          backgroundColor: p.color,
          animationDelay: Math.random() * 0.5 + 's',
        }"
      />
    </div>

    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="round-info">
        第 <span class="highlight">{{ currentRound }}</span> / {{ totalRounds }} 轮
      </div>
      <div class="prize-remaining">
        剩余 <span class="highlight">{{ totalPrizes }}</span> 份
      </div>
    </div>

    <!-- 当前玩家 -->
    <div class="current-player bounce-in" :key="currentPlayerIndex">
      <div class="player-indicator">轮到</div>
      <div class="player-name">{{ currentPlayer?.name }}</div>
    </div>

    <!-- 骰子区域 -->
    <div class="dice-area">
      <div class="dice-grid">
        <Dice
          v-for="(d, i) in currentDice"
          :key="i"
          :value="d"
          :rolling="isRolling"
        />
      </div>

      <!-- 结果展示 -->
      <div v-if="showResult && lastResult" class="result-banner bounce-in">
        <template v-if="lastResult.rank">
          <div class="result-title" :class="lastResult.championLevel > 0 ? 'champion-result' : ''">
            {{ lastResult.rankTitle }}
          </div>
          <div class="result-name">{{ lastResult.rankName }}</div>
          <div v-if="wasStolen" class="stolen-text">抢夺状元！</div>
          <div v-if="prizeAwarded && prizePool[prizeAwarded] === 0 && lastResult.championLevel === 0" class="no-stock">
            该奖品已发完
          </div>
        </template>
        <template v-else>
          <div class="result-title no-prize">未中奖</div>
          <div class="result-name">再接再厉！</div>
        </template>
      </div>

      <!-- 操作按钮 -->
      <button
        v-if="!waitingNext"
        class="btn-primary roll-btn"
        :disabled="isRolling"
        @click="handleRoll"
      >
        {{ isRolling ? '投掷中...' : '掷骰子！' }}
      </button>

      <button
        v-else
        class="btn-gold roll-btn"
        @click="handleNext"
      >
        {{ shouldShowResultButton ? '查看结果' : '下一位' }}
      </button>
    </div>

    <!-- 奖品池 -->
    <div class="card prize-pool">
      <h3>奖品池</h3>
      <div class="prize-grid">
        <div
          v-for="p in prizeEntries"
          :key="p.name"
          class="prize-item"
          :class="{ empty: p.count === 0 }"
        >
          <span class="prize-name" :style="{ color: p.color }">{{ p.name }}</span>
          <span class="prize-count">{{ p.count }}</span>
        </div>
      </div>
      <div v-if="champion" class="champion-info">
        🏆 当前状元：{{ players[champion.playerIndex]?.name }}（{{ champion.rankName }}）
      </div>
    </div>

    <!-- 玩家列表 -->
    <div class="card player-list">
      <h3>玩家战绩</h3>
      <div
        v-for="(player, i) in players"
        :key="i"
        class="player-row"
        :class="{ active: i === currentPlayerIndex }"
      >
        <div class="player-info">
          <span class="player-num" :class="{ 'current': i === currentPlayerIndex }">{{ i + 1 }}</span>
          <span class="player-name-sm">{{ player.name }}</span>
        </div>
        <div class="player-prizes">
          <span
            v-for="(prize, j) in player.prizes"
            :key="j"
            class="prize-tag"
            :class="'tag-' + prize.rankTitle"
          >
            {{ prize.rankTitle }}
          </span>
          <span v-if="player.prizes.length === 0" class="no-prizes">暂无</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-screen {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 20px;
  position: relative;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-card);
  border-radius: 10px;
  border: 1px solid var(--border);
  font-size: 14px;
}

.highlight {
  color: var(--gold);
  font-weight: 700;
  font-size: 18px;
}

.current-player {
  text-align: center;
  padding: 16px;
}

.player-indicator {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.player-name {
  font-size: 28px;
  font-weight: 700;
  color: var(--gold);
}

.dice-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: var(--bg-card);
  border-radius: 16px;
  border: 1px solid var(--border);
  min-height: 280px;
}

.dice-grid {
  display: grid;
  grid-template-columns: repeat(3, 64px);
  gap: 12px;
  justify-content: center;
}

.result-banner {
  text-align: center;
  padding: 12px 24px;
}

.result-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--gold);
}

.champion-result {
  font-size: 40px;
  background: linear-gradient(135deg, var(--gold), var(--red), var(--gold));
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 2s linear infinite;
}

.result-name {
  font-size: 18px;
  color: var(--text-muted);
  margin-top: 4px;
}

.stolen-text {
  color: var(--red);
  font-weight: 700;
  font-size: 16px;
  margin-top: 4px;
  animation: pulse 0.5s ease-in-out 3;
}

.no-stock {
  color: var(--text-muted);
  font-size: 13px;
  margin-top: 4px;
}

.no-prize {
  color: var(--text-muted) !important;
  font-size: 24px !important;
}

.roll-btn {
  width: 200px;
  padding: 14px;
  font-size: 18px;
  letter-spacing: 2px;
}

.prize-pool h3 {
  text-align: center;
  margin-bottom: 10px;
  font-size: 15px;
}

.prize-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.prize-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--bg-card-light);
  border-radius: 6px;
  font-size: 14px;
  transition: opacity 0.3s;
}

.prize-item.empty {
  opacity: 0.35;
}

.prize-name {
  font-weight: 600;
}

.prize-count {
  color: var(--text-muted);
  font-weight: 700;
}

.champion-info {
  text-align: center;
  margin-top: 10px;
  padding: 8px;
  background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(220,38,38,0.1));
  border-radius: 8px;
  font-size: 14px;
  color: var(--gold);
}

.player-list h3 {
  text-align: center;
  margin-bottom: 10px;
  font-size: 15px;
}

.player-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: background 0.2s;
}

.player-row.active {
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.2);
}

.player-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--bg-card-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

.player-num.current {
  background: var(--gold);
  color: var(--bg);
}

.player-name-sm {
  font-size: 14px;
  font-weight: 500;
}

.player-prizes {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.prize-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.tag-状元 { background: rgba(245,158,11,0.2); color: #F59E0B; }
.tag-榜眼 { background: rgba(192,132,252,0.2); color: #C084FC; }
.tag-探花 { background: rgba(252,165,165,0.2); color: #FCA5A5; }
.tag-进士 { background: rgba(103,232,249,0.2); color: #67E8F9; }
.tag-举人 { background: rgba(134,239,172,0.2); color: #86EFAC; }
.tag-秀才 { background: rgba(212,160,160,0.2); color: #D4A0A0; }

.no-prizes {
  font-size: 12px;
  color: var(--text-muted);
  opacity: 0.5;
}
</style>
