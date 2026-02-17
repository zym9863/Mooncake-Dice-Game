<script setup lang="ts">
import { computed, ref } from 'vue'
import Dice from './Dice.vue'
import { PRIZE_META, getPrizeColor, getPrizeSurface } from '../constants/prizeMeta'
import { useDiceRoll, type DiceResult } from '../composables/useDiceRoll'
import { useAudio } from '../composables/useAudio'
import type { Champion, GameEndMode, Player } from '../composables/useGameState'

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

const particles = ref<{ id: number; x: number; y: number; color: string }[]>([])
let particleId = 0

const currentPlayer = computed(() => props.players[props.currentPlayerIndex])

const totalPrizes = computed(() =>
  Object.values(props.prizePool).reduce((sum, count) => sum + count, 0),
)

const currentPlayerPrizeCount = computed(() => currentPlayer.value?.prizes.length ?? 0)

const prizeEntries = computed(() =>
  PRIZE_META.map((item) => ({
    ...item,
    count: props.prizePool[item.title] ?? 0,
  })),
)

const showRoundCard = computed(() => props.endMode !== 'all_prizes_distributed')

const shouldShowResultButton = computed(() => {
  if (totalPrizes.value <= 0) {
    return totalPrizes.value <= 0
  }

  return props.currentRound >= props.totalRounds && props.currentPlayerIndex >= props.players.length - 1
})

function spawnParticles() {
  const colors = ['#f6b343', '#ea633f', '#f7d48d', '#f26f6a', '#d68d3d']
  const next = Array.from({ length: 22 }, () => ({
    id: particleId++,
    x: Math.random() * 100,
    y: Math.random() * 28,
    color: colors[Math.floor(Math.random() * colors.length)] ?? '#f6b343',
  }))

  particles.value = next
  setTimeout(() => {
    particles.value = []
  }, 1600)
}

function getPrizeStyle(title: string) {
  return {
    '--tone': getPrizeColor(title),
    '--surface': getPrizeSurface(title),
  }
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

  await new Promise((resolve) => setTimeout(resolve, 300))

  if (result.championLevel > 0) {
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
</script>

<template>
  <div class="game-page">
    <div v-if="particles.length" class="particles">
      <div
        v-for="item in particles"
        :key="item.id"
        class="particle"
        :style="{
          left: `${item.x}%`,
          top: `${item.y}%`,
          backgroundColor: item.color,
          animationDelay: `${Math.random() * 0.5}s`,
        }"
      />
    </div>

    <section class="status-grid" :class="{ compact: !showRoundCard }">
      <article v-if="showRoundCard" class="panel status-card">
        <span class="label">轮次</span>
        <strong>{{ currentRound }} / {{ totalRounds }}</strong>
      </article>
      <article class="panel status-card">
        <span class="label">剩余奖品</span>
        <strong>{{ totalPrizes }}</strong>
      </article>
      <article class="panel status-card">
        <span class="label">当前玩家奖项</span>
        <strong>{{ currentPlayerPrizeCount }}</strong>
      </article>
    </section>

    <section class="arena-grid">
      <article class="panel dice-panel">
        <p class="turn-note">当前出手</p>
        <h2 class="turn-name bounce-in" :key="currentPlayerIndex">{{ currentPlayer?.name }}</h2>

        <div class="dice-grid">
          <Dice
            v-for="(dice, index) in currentDice"
            :key="index"
            :value="dice"
            :rolling="isRolling"
          />
        </div>

        <div v-if="showResult && lastResult" class="result-banner bounce-in">
          <template v-if="lastResult.rank">
            <div class="result-title" :class="{ champion: lastResult.championLevel > 0 }">
              {{ lastResult.rankTitle }}
            </div>
            <div class="result-name">{{ lastResult.rankName }}</div>
            <div v-if="wasStolen" class="stolen-text">抢夺状元成功</div>
            <div v-if="prizeAwarded && prizePool[prizeAwarded] === 0 && lastResult.championLevel === 0" class="stock-tip">
              该奖项已被领完
            </div>
          </template>
          <template v-else>
            <div class="result-title no-hit">未中奖</div>
            <div class="result-name">再掷一次，运气会更好。</div>
          </template>
        </div>

        <button
          v-if="!waitingNext"
          class="btn-primary action-btn"
          :disabled="isRolling"
          @click="handleRoll"
        >
          {{ isRolling ? '投掷中...' : '掷骰子' }}
        </button>

        <button
          v-else
          class="btn-gold action-btn"
          @click="handleNext"
        >
          {{ shouldShowResultButton ? '查看结果' : '下一位' }}
        </button>
      </article>

      <aside class="side-column">
        <article class="panel prize-panel">
          <div class="panel-head">
            <h3>奖池</h3>
            <span>{{ totalPrizes }} 份</span>
          </div>
          <div class="prize-grid">
            <div
              v-for="item in prizeEntries"
              :key="item.title"
              class="prize-item"
              :class="{ empty: item.count === 0 }"
              :style="{ '--tone': item.color, '--surface': item.surface }"
            >
              <span class="name">{{ item.title }}</span>
              <span class="count">{{ item.count }}</span>
            </div>
          </div>
          <div v-if="champion" class="champion-card">
            <span>状元</span>
            <strong>{{ players[champion.playerIndex]?.name }}</strong>
            <small>{{ champion.rankName }}</small>
          </div>
        </article>

        <article class="panel roster-panel">
          <div class="panel-head">
            <h3>玩家战绩</h3>
            <span>{{ players.length }} 人</span>
          </div>
          <div class="roster-list">
            <article
              v-for="(player, index) in players"
              :key="index"
              class="player-row"
              :class="{ active: index === currentPlayerIndex }"
            >
              <div class="player-main">
                <span class="player-index">{{ index + 1 }}</span>
                <strong>{{ player.name }}</strong>
              </div>
              <div class="player-prizes">
                <span
                  v-for="(prize, prizeIndex) in player.prizes"
                  :key="prizeIndex"
                  class="prize-chip"
                  :style="getPrizeStyle(prize.rankTitle)"
                >
                  {{ prize.rankTitle }}
                </span>
                <small v-if="player.prizes.length === 0">暂无奖项</small>
              </div>
            </article>
          </div>
        </article>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.game-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.status-grid.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.status-card {
  padding: 0.75rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.status-card .label {
  color: rgba(217, 190, 163, 0.82);
  font-size: 0.75rem;
}

.status-card strong {
  color: #f8d391;
  font-size: 1.35rem;
  line-height: 1;
}

.arena-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 0.9rem;
}

.dice-panel {
  padding: 1rem 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
}

.turn-note {
  color: rgba(217, 190, 163, 0.86);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.turn-name {
  font-size: clamp(1.55rem, 4.8vw, 2.2rem);
  color: #f9d489;
}

.dice-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(62px, 72px));
  gap: 0.65rem;
  justify-content: center;
}

.result-banner {
  min-height: 92px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.2rem;
}

.result-title {
  font-size: clamp(1.85rem, 5vw, 2.55rem);
  color: #f8d391;
  line-height: 1.08;
}

.result-title.champion {
  background: linear-gradient(120deg, #ffcb73, #ea633f, #ffe2a8);
  background-size: 240% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 2.2s linear infinite;
}

.result-title.no-hit {
  color: rgba(217, 190, 163, 0.8);
}

.result-name {
  color: rgba(249, 239, 226, 0.76);
  font-size: 0.9rem;
}

.stolen-text {
  color: #f26f6a;
  font-weight: 700;
  animation: pulse 0.6s ease-in-out 3;
}

.stock-tip {
  color: rgba(217, 190, 163, 0.72);
  font-size: 0.76rem;
}

.action-btn {
  width: min(240px, 100%);
  font-size: 1rem;
}

.side-column {
  display: grid;
  gap: 0.9rem;
}

.prize-panel,
.roster-panel {
  padding: 0.9rem;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
}

.panel-head span {
  color: rgba(217, 190, 163, 0.84);
  font-size: 0.75rem;
}

.prize-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.prize-item {
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--tone) 40%, transparent);
  background: linear-gradient(140deg, var(--surface), rgba(17, 9, 14, 0.5));
  padding: 0.45rem 0.55rem;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.prize-item .name {
  color: var(--tone);
  font-weight: 700;
}

.prize-item .count {
  color: rgba(249, 239, 226, 0.82);
  font-size: 0.84rem;
}

.prize-item.empty {
  opacity: 0.35;
}

.champion-card {
  margin-top: 0.7rem;
  padding: 0.6rem;
  border-radius: 10px;
  border: 1px solid rgba(246, 179, 67, 0.35);
  background: linear-gradient(130deg, rgba(246, 179, 67, 0.17), rgba(36, 20, 27, 0.8));
  display: grid;
  gap: 0.1rem;
}

.champion-card span {
  font-size: 0.76rem;
  color: rgba(217, 190, 163, 0.82);
}

.champion-card strong {
  color: #f8d391;
  font-size: 1.05rem;
}

.champion-card small {
  color: rgba(249, 239, 226, 0.75);
}

.roster-list {
  display: grid;
  gap: 0.45rem;
}

.player-row {
  border: 1px solid rgba(246, 179, 67, 0.1);
  border-radius: 10px;
  padding: 0.55rem 0.6rem;
  background: rgba(28, 14, 22, 0.62);
  display: grid;
  gap: 0.35rem;
}

.player-row.active {
  border-color: rgba(246, 179, 67, 0.48);
  box-shadow: inset 0 0 0 1px rgba(246, 179, 67, 0.24);
}

.player-main {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.player-index {
  width: 22px;
  aspect-ratio: 1;
  border-radius: 999px;
  background: rgba(246, 179, 67, 0.2);
  color: #f8d391;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
}

.player-prizes {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.prize-chip {
  padding: 0.14rem 0.44rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--tone) 38%, transparent);
  color: var(--tone);
  background: color-mix(in srgb, var(--surface) 70%, rgba(12, 7, 11, 0.6));
}

.player-prizes small {
  color: rgba(217, 190, 163, 0.72);
  font-size: 0.74rem;
}

@media (max-width: 980px) {
  .arena-grid {
    grid-template-columns: 1fr;
  }

  .side-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .status-grid {
    grid-template-columns: 1fr;
  }

  .side-column {
    grid-template-columns: 1fr;
  }

  .dice-panel {
    padding: 0.9rem;
  }

  .dice-grid {
    grid-template-columns: repeat(3, minmax(58px, 68px));
  }
}
</style>
