<script setup lang="ts">
import { ref } from 'vue'
import { PRIZE_META } from '../constants/prizeMeta'
import type { GameEndMode } from '../composables/useGameState'

const emit = defineEmits<{
  start: [playerNames: string[], totalRounds: number, endMode: GameEndMode]
}>()

const playerCount = ref(5)
const playerNames = ref<string[]>(['', '', '', '', ''])
const totalRounds = ref(10)
const endMode = ref<GameEndMode>('all_rounds_completed')

function updatePlayerCount() {
  const count = Math.max(2, Math.min(10, playerCount.value))
  playerCount.value = count

  while (playerNames.value.length < count) {
    playerNames.value.push('')
  }

  while (playerNames.value.length > count) {
    playerNames.value.pop()
  }
}

function startGame() {
  const names = playerNames.value.map((name, index) => name.trim() || `玩家${index + 1}`)
  emit('start', names, totalRounds.value, endMode.value)
}
</script>

<template>
  <div class="setup-page fade-in">
    <section class="panel hero-panel">
      <p class="hero-note">Mooncake Dice Game</p>
      <h2>席开博饼</h2>
      <p class="hero-subtitle">
        配置玩家与局数后开局，按传统奖项顺序角逐。
      </p>
    </section>

    <section class="setup-grid">
      <article class="panel control-panel">
        <div class="group">
          <label>玩家人数</label>
          <div class="counter">
            <button
              type="button"
              class="btn-secondary counter-btn"
              @click="playerCount = Math.max(2, playerCount - 1); updatePlayerCount()"
            >
              −
            </button>
            <span class="counter-value">{{ playerCount }}</span>
            <button
              type="button"
              class="btn-secondary counter-btn"
              @click="playerCount = Math.min(10, playerCount + 1); updatePlayerCount()"
            >
              +
            </button>
          </div>
        </div>

        <div class="group">
          <label>结束模式</label>
          <div class="mode-switch">
            <button
              type="button"
              class="btn-secondary mode-btn"
              :class="{ active: endMode === 'all_rounds_completed' }"
              @click="endMode = 'all_rounds_completed'"
            >
              所有轮次完成
            </button>
            <button
              type="button"
              class="btn-secondary mode-btn"
              :class="{ active: endMode === 'all_prizes_distributed' }"
              @click="endMode = 'all_prizes_distributed'"
            >
              奖品全部发完
            </button>
          </div>
        </div>

        <div v-if="endMode === 'all_rounds_completed'" class="group">
          <label>每人轮数</label>
          <div class="counter">
            <button
              type="button"
              class="btn-secondary counter-btn"
              @click="totalRounds = Math.max(1, totalRounds - 1)"
            >
              −
            </button>
            <span class="counter-value">{{ totalRounds }}</span>
            <button
              type="button"
              class="btn-secondary counter-btn"
              @click="totalRounds = Math.min(30, totalRounds + 1)"
            >
              +
            </button>
          </div>
        </div>

        <p v-else class="mode-tip">奖品发完即结束，不限制轮数。</p>
      </article>

      <article class="panel names-panel">
        <div class="panel-head">
          <h3>玩家名单</h3>
          <span>{{ playerCount }} 位</span>
        </div>
        <div class="name-list">
          <label v-for="(_, index) in playerNames" :key="index" class="name-row">
            <span class="name-index">{{ index + 1 }}</span>
            <input
              v-model="playerNames[index]"
              :placeholder="`玩家${index + 1}`"
              @keydown.enter="startGame"
            >
          </label>
        </div>
      </article>
    </section>

    <section class="panel prize-panel">
      <div class="panel-head">
        <h3>奖池总览</h3>
        <span>共 63 份</span>
      </div>
      <div class="prize-grid">
        <article
          v-for="item in PRIZE_META"
          :key="item.title"
          class="prize-card"
          :style="{ '--tone': item.color, '--surface': item.surface }"
        >
          <div class="prize-title">{{ item.title }}</div>
          <div class="prize-count">× {{ item.count }}</div>
        </article>
      </div>
    </section>

    <button class="btn-primary start-btn" @click="startGame">
      开始博饼
    </button>
  </div>
</template>

<style scoped>
.setup-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hero-panel,
.control-panel,
.names-panel,
.prize-panel {
  padding: 1rem 1.15rem;
}

.hero-note {
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(217, 190, 163, 0.8);
}

.hero-panel h2 {
  margin-top: 0.25rem;
  font-size: clamp(1.65rem, 3.3vw, 2.2rem);
  color: #f8d391;
}

.hero-subtitle {
  margin-top: 0.45rem;
  color: var(--text-soft);
  font-size: 0.94rem;
}

.setup-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 1rem;
}

.control-panel,
.names-panel {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.group label {
  font-size: 0.82rem;
  color: var(--text-soft);
  font-weight: 600;
}

.counter {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.counter-btn {
  width: 42px;
  aspect-ratio: 1;
  border-radius: 999px;
  padding: 0;
  font-size: 1.2rem;
}

.counter-value {
  min-width: 42px;
  text-align: center;
  font-size: 1.3rem;
  color: #f8d391;
  font-weight: 700;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.mode-btn {
  font-size: 0.83rem;
}

.mode-btn.active {
  border: 1px solid rgba(247, 212, 141, 0.66);
  color: #f7d48d;
  box-shadow: inset 0 0 0 1px rgba(247, 212, 141, 0.2);
}

.mode-tip {
  color: rgba(217, 190, 163, 0.88);
  font-size: 0.82rem;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.panel-head h3 {
  color: #f8d391;
}

.panel-head span {
  color: rgba(217, 190, 163, 0.92);
  font-size: 0.78rem;
}

.name-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.name-index {
  width: 24px;
  aspect-ratio: 1;
  border-radius: 999px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff8ef;
  background: linear-gradient(140deg, rgba(234, 99, 63, 0.9), rgba(169, 49, 27, 0.9));
}

.prize-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.prize-card {
  border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent);
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
  background: linear-gradient(130deg, var(--surface), rgba(14, 8, 13, 0.35));
}

.prize-title {
  color: var(--tone);
  font-weight: 700;
}

.prize-count {
  margin-top: 0.15rem;
  color: rgba(249, 239, 226, 0.86);
  font-size: 0.83rem;
}

.start-btn {
  width: 100%;
  font-size: 1.05rem;
}

@media (max-width: 900px) {
  .setup-grid {
    grid-template-columns: 1fr;
  }

  .name-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero-panel,
  .control-panel,
  .names-panel,
  .prize-panel {
    padding: 0.9rem 0.9rem;
  }

  .prize-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
