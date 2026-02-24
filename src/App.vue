<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  type GameEndMode,
  PRIZE_ORDER,
  RANK_SCORE,
  type RankType,
  type PrizeTier,
} from '../shared/game-types'
import { type Locale, setLocale, SUPPORTED_LOCALES } from './i18n'
import {
  i18nError,
  normalizeUnknownError,
  unwrapI18nErrorKey,
  useOnlineGame,
} from './composables/useOnlineGame'

const nickname = ref('')
const joinCodeInput = ref('')
const totalRounds = ref(10)
const endMode = ref<GameEndMode>('all_rounds_completed')
const isSubmitting = ref(false)

const { t, locale } = useI18n()

const {
  session,
  roomState,
  roomVersion,
  errorMessage,
  connectionStatus,
  joiningRoomCode,
  me,
  currentPlayer,
  isHost,
  isCurrentTurn,
  canRoll,
  canNext,
  createSession,
  createRoom,
  joinRoom,
  refreshRoomState,
  startRoom,
  rollTurn,
  nextTurn,
  leaveRoom,
  resetSession,
} = useOnlineGame()

const localeOptions = SUPPORTED_LOCALES
const selectedLocale = computed<Locale>({
  get: () => locale.value as Locale,
  set: value => setLocale(value),
})

const ranking = computed(() => {
  if (!roomState.value) return []
  return [...roomState.value.players]
    .map((player, index) => ({
      ...player,
      index,
      score: player.prizes.reduce((sum, prize) => sum + (RANK_SCORE[prize.rankTitle] ?? 0), 0),
    }))
    .sort((a, b) => b.score - a.score)
})

const totalPrizesLeft = computed(() => {
  if (!roomState.value) return 0
  return Object.values(roomState.value.prizePool).reduce((sum, count) => sum + count, 0)
})

const connectionStatusLabel = computed(() => t(`status.connection.${connectionStatus.value}`))
const localizedErrorMessage = computed(() => translateError(errorMessage.value))

async function handleCreateSession() {
  if (!nickname.value.trim()) return
  await submit(async () => createSession(nickname.value))
}

async function handleCreateRoom() {
  await submit(async () =>
    createRoom({
      totalRounds: totalRounds.value,
      endMode: endMode.value,
    }))
}

async function handleJoinRoom() {
  if (!joinCodeInput.value.trim()) return
  await submit(async () => joinRoom(joinCodeInput.value))
}

async function handleReconnect() {
  await submit(async () => refreshRoomState())
}

async function handleStartRoom() {
  await submit(async () => startRoom())
}

async function handleRoll() {
  await submit(async () => rollTurn())
}

async function handleNext() {
  await submit(async () => nextTurn())
}

function handleLeaveRoom() {
  leaveRoom()
}

function handleResetSession() {
  resetSession()
}

function prizeLabel(tier: PrizeTier) {
  return t(`prize.${tier}`)
}

function rankLabel(rank: RankType | null | undefined, fallbackName = '') {
  if (!rank) {
    return t('rank.no_rank')
  }
  const key = `rank.${rank}`
  const translated = t(key)
  if (translated === key) {
    return fallbackName || t('rank.no_rank')
  }
  return translated
}

function playerConnectionLabel(connected: boolean) {
  return connected ? t('status.player.online') : t('status.player.offline')
}

function translateError(message: string) {
  if (!message) {
    return ''
  }
  const key = unwrapI18nErrorKey(message)
  if (key) {
    return t(key)
  }
  return message
}

async function submit(task: () => Promise<void> | void) {
  isSubmitting.value = true
  try {
    await task()
  } catch (error) {
    errorMessage.value = normalizeUnknownError(error)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  if (session.value && joiningRoomCode.value) {
    try {
      await refreshRoomState()
    } catch {
      errorMessage.value = i18nError('error.reconnectFailed')
    }
  }
})
</script>

<template>
  <main class="app-shell">
    <header class="brand-banner">
      <div class="banner-top">
        <p class="banner-note">{{ t('banner.note') }}</p>
        <label class="locale-switch">
          <span>{{ t('language.label') }}</span>
          <select v-model="selectedLocale">
            <option v-for="code in localeOptions" :key="code" :value="code">
              {{ t(`language.${code}`) }}
            </option>
          </select>
        </label>
      </div>
      <h1>{{ t('banner.title') }}</h1>
      <p class="banner-sub">{{ t('banner.subtitle') }}</p>
    </header>

    <section v-if="localizedErrorMessage" class="panel error-banner">
      {{ localizedErrorMessage }}
    </section>

    <section v-if="!session" class="panel card-block">
      <h2>{{ t('session.createTitle') }}</h2>
      <p>{{ t('session.createDescription') }}</p>
      <div class="row">
        <input v-model="nickname" :placeholder="t('session.nicknamePlaceholder')">
        <button class="btn-primary" :disabled="isSubmitting || !nickname.trim()" @click="handleCreateSession">
          {{ t('session.continue') }}
        </button>
      </div>
    </section>

    <section v-else-if="!roomState" class="lobby-grid">
      <article class="panel card-block">
        <h2>{{ t('lobby.welcome', { name: session.nickname }) }}</h2>
        <p>{{ t('lobby.createRoomDescription') }}</p>

        <label class="field">
          <span>{{ t('lobby.endMode') }}</span>
          <select v-model="endMode">
            <option value="all_rounds_completed">{{ t('lobby.endModeAllRounds') }}</option>
            <option value="all_prizes_distributed">{{ t('lobby.endModeAllPrizes') }}</option>
          </select>
        </label>

        <label class="field" v-if="endMode === 'all_rounds_completed'">
          <span>{{ t('lobby.totalRounds') }}</span>
          <input v-model.number="totalRounds" type="number" min="1" max="30">
        </label>

        <button class="btn-primary" :disabled="isSubmitting" @click="handleCreateRoom">
          {{ t('lobby.createRoom') }}
        </button>
      </article>

      <article class="panel card-block">
        <h2>{{ t('lobby.joinRoomTitle') }}</h2>
        <p>{{ t('lobby.joinRoomDescription') }}</p>
        <div class="row">
          <input v-model="joinCodeInput" :placeholder="t('lobby.roomCodePlaceholder')" maxlength="8">
          <button class="btn-gold" :disabled="isSubmitting || !joinCodeInput.trim()" @click="handleJoinRoom">
            {{ t('lobby.join') }}
          </button>
        </div>

        <button
          v-if="joiningRoomCode"
          class="btn-secondary"
          :disabled="isSubmitting"
          @click="handleReconnect"
        >
          {{ t('lobby.reconnect', { roomCode: joiningRoomCode }) }}
        </button>

        <button class="btn-secondary" :disabled="isSubmitting" @click="handleResetSession">
          {{ t('lobby.changeNickname') }}
        </button>
      </article>
    </section>

    <section v-else class="room-grid">
      <article class="panel card-block room-head">
        <div>
          <h2>{{ t('room.title', { roomCode: roomState.roomCode }) }}</h2>
          <p>{{ t('room.versionAndUser', { version: roomVersion, name: me?.name ?? session.nickname }) }}</p>
        </div>
        <div class="status">
          <span>{{ t(`status.phase.${roomState.phase}`) }}</span>
          <small>{{ connectionStatusLabel }}</small>
        </div>
      </article>

      <article v-if="roomState.phase === 'waiting'" class="panel card-block">
        <h3>{{ t('room.waitingTitle') }}</h3>
        <p>{{ t('room.waitingDescription', { count: roomState.players.length }) }}</p>
        <ul class="player-list">
          <li v-for="player in roomState.players" :key="player.playerId">
            <span>{{ player.name }}</span>
            <small>{{ playerConnectionLabel(player.connected) }}</small>
          </li>
        </ul>
        <div class="actions">
          <button class="btn-primary" :disabled="!isHost || isSubmitting" @click="handleStartRoom">
            {{ t('room.startGame') }}
          </button>
          <button class="btn-secondary" :disabled="isSubmitting" @click="handleLeaveRoom">
            {{ t('room.leaveRoom') }}
          </button>
        </div>
      </article>

      <template v-else>
        <article class="panel card-block gameplay">
          <h3>{{ t('room.turnTitle') }}</h3>
          <p>{{ t('room.currentPlayer', { name: currentPlayer?.name ?? '-' }) }}</p>
          <p>{{ t('room.round', { current: roomState.currentRound, total: roomState.totalRounds }) }}</p>
          <p>{{ t('room.prizesLeft', { count: totalPrizesLeft }) }}</p>

          <div class="dice-row">
            <span v-for="(value, idx) in roomState.lastResult?.dice ?? [1, 1, 1, 1, 1, 1]" :key="idx" class="die">
              {{ value }}
            </span>
          </div>

          <p v-if="roomState.lastResult" class="roll-result">
            {{ rankLabel(roomState.lastResult.rank, roomState.lastResult.rankName) }}
            <span v-if="roomState.lastPrizeAwarded"> - {{ prizeLabel(roomState.lastPrizeAwarded) }}</span>
            <span v-if="roomState.championStolen"> - {{ t('room.championStolen') }}</span>
          </p>

          <div v-if="roomState.phase === 'playing'" class="actions">
            <button class="btn-primary" :disabled="!canRoll || isSubmitting" @click="handleRoll">
              {{ isCurrentTurn ? t('room.rollDice') : t('room.waitingTurn') }}
            </button>
            <button class="btn-gold" :disabled="!canNext || isSubmitting" @click="handleNext">
              {{ t('room.nextTurn') }}
            </button>
          </div>
        </article>

        <article class="panel card-block">
          <h3>{{ t('room.prizePoolTitle') }}</h3>
          <ul class="prize-list">
            <li v-for="tier in PRIZE_ORDER" :key="tier">
              <span>{{ prizeLabel(tier) }}</span>
              <strong>{{ roomState.prizePool[tier] }}</strong>
            </li>
          </ul>
        </article>

        <article class="panel card-block">
          <h3>{{ t('room.playersTitle') }}</h3>
          <ul class="player-list">
            <li
              v-for="(player, index) in roomState.players"
              :key="player.playerId"
              :class="{ active: roomState.currentPlayerIndex === index }"
            >
              <div>
                <strong>{{ player.name }}</strong>
                <small>{{ playerConnectionLabel(player.connected) }}</small>
              </div>
              <span>{{ t('room.playerPrizeCount', { count: player.prizes.length }) }}</span>
            </li>
          </ul>
        </article>

        <article v-if="roomState.phase === 'result'" class="panel card-block">
          <h3>{{ t('room.finalRankingTitle') }}</h3>
          <ol class="ranking-list">
            <li v-for="player in ranking" :key="player.playerId">
              <span>{{ player.name }}</span>
              <strong>{{ player.score }}</strong>
            </li>
          </ol>
          <button class="btn-secondary" :disabled="isSubmitting" @click="handleLeaveRoom">
            {{ t('room.backToLobby') }}
          </button>
        </article>
      </template>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
}

.banner-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.banner-note {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(220, 200, 166, 0.8);
}

.locale-switch {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.locale-switch span {
  font-size: 0.8rem;
  color: rgba(220, 200, 166, 0.85);
}

.locale-switch select {
  width: auto;
  min-width: 108px;
  padding: 0.32rem 0.55rem;
}

.brand-banner h1 {
  margin-top: 0.2rem;
  color: #f9d489;
  font-size: clamp(1.5rem, 2.5vw, 2.1rem);
}

.banner-sub {
  margin-top: 0.2rem;
  color: var(--text-soft);
}

.card-block {
  padding: 1rem;
  display: grid;
  gap: 0.7rem;
}

.error-banner {
  padding: 0.8rem 1rem;
  border-color: rgba(255, 140, 140, 0.4);
  color: #ffd9d9;
}

.row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.6rem;
}

.field {
  display: grid;
  gap: 0.35rem;
}

.field span {
  color: var(--text-soft);
  font-size: 0.84rem;
}

select {
  border-radius: 10px;
  border: 1px solid rgba(246, 179, 67, 0.2);
  padding: 0.62rem 0.8rem;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text-main);
  background: rgba(23, 12, 18, 0.72);
}

.lobby-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.room-grid {
  display: grid;
  gap: 0.9rem;
}

.room-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status {
  text-align: right;
}

.status span {
  font-size: 0.8rem;
  color: #f7d48d;
  letter-spacing: 0.08em;
}

.status small {
  display: block;
  color: var(--text-soft);
}

.player-list,
.prize-list,
.ranking-list {
  list-style: none;
  display: grid;
  gap: 0.45rem;
}

.player-list li,
.prize-list li,
.ranking-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(246, 179, 67, 0.18);
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  background: rgba(28, 14, 22, 0.55);
}

.player-list li.active {
  border-color: rgba(246, 179, 67, 0.5);
  box-shadow: inset 0 0 0 1px rgba(246, 179, 67, 0.2);
}

.player-list small {
  margin-left: 0.4rem;
  color: rgba(217, 190, 163, 0.75);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.gameplay strong {
  color: #f9d489;
}

.dice-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(32px, 40px));
  gap: 0.45rem;
  justify-content: flex-start;
}

.die {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(246, 179, 67, 0.4);
  background: rgba(255, 242, 228, 0.9);
  color: #421d12;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.roll-result {
  color: #f7d48d;
}

@media (max-width: 860px) {
  .lobby-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .row {
    grid-template-columns: 1fr;
  }

  .room-head {
    display: grid;
    gap: 0.5rem;
  }

  .status {
    text-align: left;
  }

  .banner-top {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
