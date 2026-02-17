<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  start: [playerNames: string[], totalRounds: number]
}>()

const playerCount = ref(4)
const playerNames = ref<string[]>(['', '', '', ''])
const totalRounds = ref(10)

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
  const names = playerNames.value.map((n, i) => n.trim() || `玩家${i + 1}`)
  emit('start', names, totalRounds.value)
}
</script>

<template>
  <div class="setup fade-in">
    <div class="header">
      <h1>🎲 博饼</h1>
      <p class="subtitle">马年春节家庭聚会</p>
    </div>

    <div class="card form-section">
      <div class="form-group">
        <label>玩家人数</label>
        <div class="counter">
          <button class="btn-secondary counter-btn" @click="playerCount = Math.max(2, playerCount - 1); updatePlayerCount()">−</button>
          <span class="counter-value">{{ playerCount }}</span>
          <button class="btn-secondary counter-btn" @click="playerCount = Math.min(10, playerCount + 1); updatePlayerCount()">+</button>
        </div>
      </div>

      <div class="form-group">
        <label>每人轮数</label>
        <div class="counter">
          <button class="btn-secondary counter-btn" @click="totalRounds = Math.max(1, totalRounds - 1)">−</button>
          <span class="counter-value">{{ totalRounds }}</span>
          <button class="btn-secondary counter-btn" @click="totalRounds = Math.min(30, totalRounds + 1)">+</button>
        </div>
      </div>

      <div class="form-group">
        <label>玩家名字</label>
        <div class="name-list">
          <div v-for="(_, i) in playerNames" :key="i" class="name-input-row">
            <span class="name-index">{{ i + 1 }}</span>
            <input
              v-model="playerNames[i]"
              :placeholder="`玩家${i + 1}`"
              @keydown.enter="startGame"
            />
          </div>
        </div>
      </div>
    </div>

    <button class="btn-primary start-btn" @click="startGame">
      开始博饼！
    </button>

    <div class="rules-summary card">
      <h3>奖品一览</h3>
      <div class="rules-grid">
        <div class="rule-item"><span class="rank champion">状元</span><span class="count">×1</span></div>
        <div class="rule-item"><span class="rank bangyan">榜眼</span><span class="count">×2</span></div>
        <div class="rule-item"><span class="rank tanhua">探花</span><span class="count">×4</span></div>
        <div class="rule-item"><span class="rank jinshi">进士</span><span class="count">×8</span></div>
        <div class="rule-item"><span class="rank juren">举人</span><span class="count">×16</span></div>
        <div class="rule-item"><span class="rank xiucai">秀才</span><span class="count">×32</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setup {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 0;
}

.header {
  text-align: center;
  padding: 20px 0;
}

.header h1 {
  font-size: 2.5em;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--text-muted);
  font-size: 1.1em;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  color: var(--gold);
  font-weight: 600;
}

.counter {
  display: flex;
  align-items: center;
  gap: 16px;
}

.counter-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.counter-value {
  font-size: 24px;
  font-weight: 700;
  min-width: 40px;
  text-align: center;
  color: var(--gold);
}

.name-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.name-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name-index {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--red-dark);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.start-btn {
  width: 100%;
  padding: 16px;
  font-size: 20px;
  letter-spacing: 2px;
}

.rules-summary h3 {
  text-align: center;
  margin-bottom: 12px;
  font-size: 16px;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--bg-card-light);
  border-radius: 6px;
  font-size: 14px;
}

.rank {
  font-weight: 600;
}

.champion { color: var(--gold); }
.bangyan { color: #C084FC; }
.tanhua { color: var(--red-light); }
.jinshi { color: #67E8F9; }
.juren { color: #86EFAC; }
.xiucai { color: var(--text-muted); }

.count {
  color: var(--text-muted);
  font-size: 12px;
}
</style>
