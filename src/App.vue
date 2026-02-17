<script setup lang="ts">
import { computed } from 'vue'
import SetupScreen from './components/SetupScreen.vue'
import GameScreen from './components/GameScreen.vue'
import ResultScreen from './components/ResultScreen.vue'
import { useGameState } from './composables/useGameState'
import type { DiceResult } from './composables/useDiceRoll'
import type { GameEndMode } from './composables/useGameState'

const {
  state,
  startGame,
  awardPrize,
  nextTurn,
  resetGame,
  getPlayerRanking,
} = useGameState()

const ranking = computed(() => getPlayerRanking())

function handleStart(playerNames: string[], totalRounds: number, endMode: GameEndMode) {
  startGame(playerNames, totalRounds, endMode)
}

function handleRolled(result: DiceResult) {
  awardPrize(result)
}

function handleNext() {
  nextTurn()
}

function handleRestart() {
  resetGame()
}
</script>

<template>
  <main class="app-shell">
    <header class="brand-banner">
      <p class="banner-note">Mid-Autumn Dice Night</p>
      <h1>博饼夜宴</h1>
    </header>

    <section class="screen-host">
      <SetupScreen
        v-if="state.phase === 'setup'"
        @start="handleStart"
      />

      <GameScreen
        v-else-if="state.phase === 'playing'"
        :players="state.players"
        :currentPlayerIndex="state.currentPlayerIndex"
        :currentRound="state.currentRound"
        :totalRounds="state.totalRounds"
        :endMode="state.endMode"
        :prizePool="state.prizePool"
        :champion="state.champion"
        @rolled="handleRolled"
        @next="handleNext"
      />

      <ResultScreen
        v-else-if="state.phase === 'result'"
        :players="state.players"
        :champion="state.champion"
        :ranking="ranking"
        @restart="handleRestart"
      />
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  min-height: calc(100vh - 2rem);
}

.brand-banner {
  padding: 1rem 1.2rem;
  border: 1px solid rgba(246, 179, 67, 0.2);
  border-radius: 16px;
  background:
    linear-gradient(130deg, rgba(23, 11, 15, 0.86), rgba(41, 19, 27, 0.74)),
    radial-gradient(circle at 12% 12%, rgba(246, 179, 67, 0.28), transparent 42%);
  box-shadow: 0 18px 36px rgba(8, 2, 6, 0.45);
  backdrop-filter: blur(6px);
}

.banner-note {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(220, 200, 166, 0.8);
}

.brand-banner h1 {
  margin-top: 0.2rem;
  font-size: clamp(1.6rem, 2.3vw, 2.2rem);
  letter-spacing: 0.08em;
  color: #f9d489;
}

.screen-host {
  flex: 1;
  min-height: 0;
}

@media (max-width: 768px) {
  .app-shell {
    gap: 0.9rem;
  }

  .brand-banner {
    padding: 0.85rem 1rem;
    border-radius: 14px;
  }
}
</style>
