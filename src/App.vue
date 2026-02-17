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
</template>
