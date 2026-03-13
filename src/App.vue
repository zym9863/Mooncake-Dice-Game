<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Dice from './components/Dice.vue'
import { getPrizeColor, getPrizeSurface } from './constants/prizeMeta'
import {
  type GameEndMode,
  PRIZE_ORDER,
  RANK_SCORE,
  type RankType,
  type PrizeTier,
  type PlayerState,
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
  errorMessage,
  connectionStatus,
  joiningRoomCode,
  currentPlayer,
  isHost,
  isCurrentTurn,
  canRoll,
  createSession,
  createRoom,
  joinRoom,
  refreshRoomState,
  startRoom,
  rollTurn,
  nextTurn,
  restartGame,
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
  await submit(async () => {
    await rollTurn()
    await nextTurn()
  })
}

function handleLeaveRoom() {
  leaveRoom()
}

async function handleBackToWaitingRoom() {
  await submit(async () => restartGame())
}

function handleResetSession() {
  resetSession()
}

function summarizePlayerPrizes(player: PlayerState) {
  const summary: { key: PrizeTier; desc: string; count: number }[] = []
  for (const tier of PRIZE_ORDER) {
    const tierPrizes = player.prizes.filter(p => p.rankTitle === tier)
    if (tierPrizes.length === 0) continue

    if (tier === 'zhuangyuan') {
      const zPrizes: Record<string, number> = {}
      for (const p of tierPrizes) {
        const desc = `${prizeLabel(tier)}(${rankLabel(p.rank, p.rankName)})`
        if (!zPrizes[desc]) zPrizes[desc] = 0
        zPrizes[desc]++
      }
      for (const [desc, count] of Object.entries(zPrizes)) {
        summary.push({ key: tier, desc, count })
      }
    } else {
      summary.push({
        key: tier,
        desc: prizeLabel(tier),
        count: tierPrizes.length,
      })
    }
  }
  return summary
}

function getPrizeStyle(tier: PrizeTier) {
  return {
    '--tone': getPrizeColor(tier),
    '--surface': getPrizeSurface(tier),
  }
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
  <div class="app-bg-texture"></div>
  <main class="app-shell">
    <header class="brand-banner fade-in">
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
      <div class="title-container">
        <h1>{{ t('banner.title') }}</h1>
        <div class="title-decoration"></div>
      </div>
      <p class="banner-sub">{{ t('banner.subtitle') }}</p>
    </header>

    <section v-if="localizedErrorMessage" class="panel error-banner fade-in" style="animation-delay: 0.1s;">
      {{ localizedErrorMessage }}
    </section>

    <!-- SESSION CREATION -->
    <section v-if="!session" class="panel card-block fade-in" style="animation-delay: 0.2s;">
      <div class="card-header">
        <h2>{{ t('session.createTitle') }}</h2>
        <div class="header-line"></div>
      </div>
      <p class="card-desc">{{ t('session.createDescription') }}</p>
      <div class="row">
        <div class="input-container">
          <input v-model="nickname" :placeholder="t('session.nicknamePlaceholder')">
          <div class="input-ring"></div>
        </div>
        <button class="btn-primary" :disabled="isSubmitting || !nickname.trim()" @click="handleCreateSession">
          {{ t('session.continue') }}
        </button>
      </div>
    </section>

    <!-- LOBBY -->
    <section v-else-if="!roomState" class="lobby-grid fade-in" style="animation-delay: 0.2s;">
      <article class="panel card-block">
        <div class="card-header">
          <h2>{{ t('lobby.welcome', { name: session.nickname }) }}</h2>
          <div class="header-line"></div>
        </div>
        <p class="card-desc">{{ t('lobby.createRoomDescription') }}</p>

        <label class="field">
          <span>{{ t('lobby.endMode') }}</span>
          <div class="input-container">
            <select v-model="endMode">
              <option value="all_rounds_completed">{{ t('lobby.endModeAllRounds') }}</option>
              <option value="all_prizes_distributed">{{ t('lobby.endModeAllPrizes') }}</option>
            </select>
            <div class="input-ring"></div>
          </div>
        </label>

        <label class="field" v-if="endMode === 'all_rounds_completed'">
          <span>{{ t('lobby.totalRounds') }}</span>
          <div class="input-container">
            <input v-model.number="totalRounds" type="number" min="1" max="30">
            <div class="input-ring"></div>
          </div>
        </label>

        <button class="btn-primary full-width mt-4" :disabled="isSubmitting" @click="handleCreateRoom">
          {{ t('lobby.createRoom') }}
        </button>
      </article>

      <article class="panel card-block">
        <div class="card-header">
          <h2>{{ t('lobby.joinRoomTitle') }}</h2>
          <div class="header-line"></div>
        </div>
        <p class="card-desc">{{ t('lobby.joinRoomDescription') }}</p>
        <div class="row">
          <div class="input-container">
            <input v-model="joinCodeInput" :placeholder="t('lobby.roomCodePlaceholder')" maxlength="8">
            <div class="input-ring"></div>
          </div>
          <button class="btn-gold" :disabled="isSubmitting || !joinCodeInput.trim()" @click="handleJoinRoom">
            {{ t('lobby.join') }}
          </button>
        </div>

        <div class="actions-stack mt-4">
          <button v-if="joiningRoomCode" class="btn-secondary full-width" :disabled="isSubmitting" @click="handleReconnect">
            {{ t('lobby.reconnect', { roomCode: joiningRoomCode }) }}
          </button>
          <button class="btn-secondary full-width" :disabled="isSubmitting" @click="handleResetSession">
            {{ t('lobby.changeNickname') }}
          </button>
        </div>
      </article>
    </section>

    <!-- ROOM -->
    <section v-else class="room-grid fade-in" style="animation-delay: 0.2s;">
      <article class="panel room-head">
        <div class="room-title-area">
          <h2>{{ t('room.title', { roomCode: roomState.roomCode }) }}</h2>
          <div class="room-code-ring"></div>
        </div>
        <div class="status">
          <span class="phase-badge">{{ t(`status.phase.${roomState.phase}`) }}</span>
          <small class="conn-status">{{ connectionStatusLabel }}</small>
        </div>
      </article>

      <!-- WAITING PHASE -->
      <article v-if="roomState.phase === 'waiting'" class="panel card-block">
        <div class="card-header">
          <h3>{{ t('room.waitingTitle') }}</h3>
          <div class="header-line"></div>
        </div>
        <p class="card-desc">{{ t('room.waitingDescription', { count: roomState.players.length }) }}</p>
        <ul class="player-list">
          <li v-for="player in roomState.players" :key="player.playerId" class="player-item">
            <span class="player-name">{{ player.name }}</span>
            <span class="status-dot" :class="{ online: player.connected }"></span>
          </li>
        </ul>
        <div class="actions mt-4">
          <button class="btn-primary" :disabled="!isHost || isSubmitting" @click="handleStartRoom">
            {{ t('room.startGame') }}
          </button>
          <button class="btn-secondary" :disabled="isSubmitting" @click="handleLeaveRoom">
            {{ t('room.leaveRoom') }}
          </button>
        </div>
      </article>

      <!-- PLAYING / RESULT PHASE -->
      <template v-else>
        <div class="game-layout">
          <div class="game-main-col">
            <article class="panel gameplay-stage">
              <div class="turn-header">
                <h3>{{ t('room.turnTitle') }}</h3>
                <div class="round-info">{{ t('room.round', { current: roomState.currentRound, total: roomState.totalRounds }) }}</div>
              </div>
              
              <div class="current-player-display">
                <div class="cp-label">{{ t('room.currentPlayer', { name: '' }) }}</div>
                <div class="cp-name">{{ currentPlayer?.name ?? '-' }}</div>
              </div>

              <div class="dice-stage">
                <div class="dice-row">
                  <Dice v-for="(value, idx) in roomState.lastResult?.dice ?? [1, 2, 3, 4, 5, 6]" :key="idx" 
                        :value="value" :rolling="isSubmitting" />
                </div>
              </div>

              <div class="roll-result-area" v-if="roomState.lastResult">
                <div class="result-rank">{{ rankLabel(roomState.lastResult.rank, roomState.lastResult.rankName) }}</div>
                <div class="result-prize" v-if="roomState.lastPrizeAwarded">
                  {{ prizeLabel(roomState.lastPrizeAwarded) }} 
                  <span class="stolen-tag" v-if="roomState.championStolen">{{ t('room.championStolen') }}</span>
                </div>
              </div>

              <div v-if="roomState.phase === 'playing'" class="actions center mt-6">
                <button class="btn-gold massive-btn" :disabled="!canRoll || isSubmitting" @click="handleRoll">
                  {{ isCurrentTurn ? t('room.rollDice') : t('room.waitingTurn') }}
                </button>
              </div>
            </article>

            <!-- FINAL RANKING -->
            <article v-if="roomState.phase === 'result'" class="panel card-block mt-4">
              <div class="card-header">
                <h3>{{ t('room.finalRankingTitle') }}</h3>
                <div class="header-line"></div>
              </div>
              <ol class="ranking-list">
                <li v-for="(player, idx) in ranking" :key="player.playerId" :class="idx < 3 ? 'rank-' + (idx+1) : 'rank-other'">
                  <div class="rank-pos">{{ idx + 1 }}</div>
                  <span class="rank-name">{{ player.name }}</span>
                  <strong class="rank-score">{{ player.score }}</strong>
                </li>
              </ol>
              <div class="actions center mt-4">
                <button class="btn-primary" :disabled="isSubmitting" @click="handleBackToWaitingRoom">
                  {{ t('room.backToWaiting') }}
                </button>
                <button class="btn-secondary" :disabled="isSubmitting" @click="handleLeaveRoom">
                  {{ t('room.backToLobby') }}
                </button>
              </div>
            </article>
          </div>

          <div class="game-side-col">
            <article class="panel card-block compact-panel">
              <div class="card-header small">
                <h3>{{ t('room.prizePoolTitle') }}</h3>
                <div class="sub-desc">{{ t('room.prizesLeft', { count: totalPrizesLeft }) }}</div>
              </div>
              <ul class="prize-list">
                <li v-for="tier in PRIZE_ORDER" :key="tier" :class="{ 'empty': roomState.prizePool[tier] === 0 }">
                  <span class="prize-name">{{ prizeLabel(tier) }}</span>
                  <strong class="prize-count">{{ roomState.prizePool[tier] }}</strong>
                </li>
              </ul>
            </article>

            <article class="panel card-block compact-panel">
              <div class="card-header small">
                <h3>{{ t('room.playersTitle') }}</h3>
              </div>
              <ul class="side-player-list">
                <li v-for="(player, index) in roomState.players" :key="player.playerId"
                    :class="{ active: roomState.currentPlayerIndex === index }">
                  <div class="sp-row">
                    <div class="sp-info">
                      <span class="status-dot small" :class="{ online: player.connected }"></span>
                      <strong>{{ player.name }}</strong>
                    </div>
                    <span class="sp-prizes">{{ t('room.playerPrizeCount', { count: player.prizes.length }) }}</span>
                  </div>
                  <div class="sp-prize-tags" v-if="player.prizes.length > 0">
                    <span v-for="prize in summarizePlayerPrizes(player)" :key="prize.desc" class="sp-prize-chip" :style="getPrizeStyle(prize.key)">
                      {{ prize.desc }}<template v-if="prize.count > 1"> × {{ prize.count }}</template>
                    </span>
                  </div>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.app-shell { display: flex; flex-direction: column; gap: 1.5rem; }
.brand-banner {
  text-align: center; padding: 2.5rem 2rem; border-radius: 12px;
  background: linear-gradient(180deg, rgba(20,25,40,0.8) 0%, rgba(5,8,20,0.2) 100%);
  border: 1px solid var(--border-panel); box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  position: relative; overflow: hidden; backdrop-filter: blur(10px);
}
.brand-banner::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at 50% -20%, rgba(232, 185, 90, 0.15) 0%, transparent 60%);
  pointer-events: none;
}
.banner-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; position: relative; z-index: 2; }
.banner-note { font-size: 0.8rem; letter-spacing: 0.2em; color: var(--primary-gold-dim); text-transform: uppercase; }
.locale-switch { display: flex; align-items: center; gap: 0.8rem; }
.locale-switch span { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
.locale-switch select {
  width: auto; padding: 0.4rem 0.8rem; background: rgba(0,0,0,0.4);
  border: 1px solid var(--primary-gold-dim); border-radius: 4px; color: var(--primary-gold-bright);
}
.title-container { position: relative; display: inline-block; margin-bottom: 0.5rem; z-index: 2; }
.title-container h1 { font-size: clamp(2.5rem, 5vw, 4rem); text-shadow: 0 0 20px rgba(232,185,90,0.2); }
.title-decoration {
  position: absolute; bottom: -5px; left: 10%; right: 10%; height: 2px;
  background: linear-gradient(90deg, transparent, var(--primary-gold), transparent);
}
.banner-sub { margin-top: 1rem; color: var(--text-muted); font-size: 1rem; letter-spacing: 0.3em; z-index: 2; position: relative; }
.error-banner { background: rgba(215, 60, 62, 0.15); border-color: rgba(215, 60, 62, 0.4); color: #FFA3A3; text-align: center; }
.card-block { display: flex; flex-direction: column; gap: 1.2rem; }
.card-header { position: relative; padding-bottom: 0.8rem; margin-bottom: 0.5rem; }
.card-header h2 { font-size: 1.8rem; }
.card-header h3 { font-size: 1.4rem; }
.header-line { position: absolute; bottom: 0; left: 0; width: 60px; height: 2px; background: var(--primary-gold); }
.card-desc { color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; }
.row { display: grid; grid-template-columns: 1fr auto; gap: 1rem; }
.actions-stack { display: flex; flex-direction: column; gap: 0.8rem; margin-top: 0.5rem; }
.actions { display: flex; flex-wrap: wrap; gap: 1rem; }
.actions.center { justify-content: center; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 2rem; }
.full-width { width: 100%; }
.input-container { position: relative; width: 100%; }
.input-ring {
  position: absolute; inset: -2px; border-radius: 6px;
  background: linear-gradient(45deg, var(--primary-gold-dim), transparent, var(--primary-gold-dim));
  z-index: -1; opacity: 0; transition: opacity 0.3s;
}
input:focus + .input-ring, select:focus + .input-ring { opacity: 1; }
.field { display: flex; flex-direction: column; gap: 0.5rem; }
.field span { color: var(--primary-gold-dim); font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; }
.lobby-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
.room-grid { display: flex; flex-direction: column; gap: 1.5rem; }
.room-head { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; }
.room-title-area h2 { font-size: 1.8rem; color: var(--primary-gold-bright); font-family: 'Cinzel', 'Noto Serif SC', serif; letter-spacing: 0.1em; }
.status { text-align: right; display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-end; }
.phase-badge {
  background: rgba(232, 185, 90, 0.15); border: 1px solid var(--primary-gold-dim);
  padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; letter-spacing: 0.1em;
  color: var(--primary-gold); text-transform: uppercase;
}
.conn-status { color: var(--text-muted); font-size: 0.75rem; letter-spacing: 0.05em; }
.player-list { list-style: none; display: flex; flex-direction: column; gap: 0.8rem; }
.player-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 1.5rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-panel);
  border-radius: 6px; transition: all 0.3s ease;
}
.player-item:hover { border-color: var(--primary-gold-dim); background: rgba(232, 185, 90, 0.05); }
.player-name { font-weight: 500; font-size: 1.1rem; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; background: #555; box-shadow: 0 0 5px rgba(0,0,0,0.5); }
.status-dot.online { background: #00E676; box-shadow: 0 0 10px rgba(0, 230, 118, 0.5); }
.status-dot.small { width: 8px; height: 8px; }
.game-layout { display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; align-items: start; }
@media (max-width: 860px) { .game-layout { grid-template-columns: 1fr; } }
.game-main-col { display: flex; flex-direction: column; gap: 1.5rem; }
.game-side-col { display: flex; flex-direction: column; gap: 1.5rem; }
.gameplay-stage { padding: 3rem 2rem; background: radial-gradient(circle at 50% 50%, rgba(20,25,40,0.9) 0%, rgba(10,13,25,0.95) 100%); text-align: center; }
.turn-header { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-bottom: 2rem; }
.turn-header h3 { font-size: 2rem; margin: 0; }
.round-info { background: rgba(232, 185, 90, 0.1); padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.9rem; color: var(--primary-gold); border: 1px solid var(--primary-gold-dim); }
.current-player-display { margin-bottom: 3rem; }
.cp-label { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 0.5rem; }
.cp-name { font-size: 2.5rem; color: #fff; font-family: 'Ma Shan Zheng', cursive; letter-spacing: 0.05em; text-shadow: 0 0 15px rgba(255,255,255,0.3); }
.dice-stage { background: rgba(0,0,0,0.4); border: 1px solid var(--border-panel); border-radius: 12px; padding: 3rem 1rem; margin-bottom: 2.5rem; box-shadow: inset 0 0 40px rgba(0,0,0,0.8); }
.dice-row { display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; }
.die {
  width: 70px; height: 70px;
  background: radial-gradient(circle at 30% 30%, #FFF, #E2E8DF);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 2px 2px 5px rgba(255,255,255,0.9), inset -4px -5px 10px rgba(160,175,160,0.6), 0 15px 25px rgba(0,0,0,0.6);
  transform: perspective(400px) rotateX(10deg);
  position: relative;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.die:hover { transform: perspective(400px) rotateX(0deg) translateY(-8px) scale(1.05); }
.die-value { font-size: 2.5rem; font-weight: 900; color: #161B33; font-family: 'Arial', sans-serif; text-shadow: inset 1px 1px 1px rgba(0,0,0,0.2); }
.die-1 .die-value, .die-4 .die-value { color: var(--accent-red); }
.roll-result-area { display: flex; flex-direction: column; gap: 0.8rem; }
.result-rank { font-size: 3rem; font-family: 'Ma Shan Zheng', cursive; color: var(--primary-gold-bright); text-shadow: 0 0 25px rgba(232, 185, 90, 0.4); }
.result-prize { font-size: 1.3rem; color: #fff; opacity: 0.9; }
.stolen-tag { background: linear-gradient(135deg, var(--accent-red), #911417); color: #fff; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.85rem; margin-left: 0.5rem; vertical-align: middle; box-shadow: 0 0 10px rgba(215, 60, 62, 0.5); }
.massive-btn { font-size: 1.3rem; padding: 1.2rem 4rem; letter-spacing: 0.15em; }
.compact-panel { padding: 1.5rem; }
.card-header.small h3 { font-size: 1.2rem; }
.sub-desc { color: var(--primary-gold-dim); font-size: 0.85rem; margin-top: 0.3rem; }
.prize-list, .side-player-list { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; }
.prize-list li { display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px dashed rgba(255,255,255,0.08); }
.prize-list li.empty { opacity: 0.3; }
.prize-name { color: #ddd; font-size: 1rem; }
.prize-count { color: var(--primary-gold); font-family: monospace; font-size: 1.2rem; }
.side-player-list li { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.8rem; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid transparent; transition: all 0.3s; }
.side-player-list li.active { background: rgba(232, 185, 90, 0.1); border-color: var(--primary-gold-dim); box-shadow: inset 0 0 15px rgba(232, 185, 90, 0.1); transform: translateX(5px); }
.sp-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.sp-info { display: flex; align-items: center; gap: 0.8rem; }
.sp-info strong { font-size: 1.05rem; }
.sp-prizes { font-size: 0.85rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 0.2rem 0.6rem; border-radius: 20px; }
.sp-prize-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; padding-left: 1.3rem; }
.sp-prize-chip { padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem; border: 1px solid color-mix(in srgb, var(--tone) 40%, transparent); color: var(--tone); background: color-mix(in srgb, var(--surface) 60%, rgba(0,0,0,0.4)); font-weight: 500; }
.ranking-list { list-style: none; display: flex; flex-direction: column; gap: 1rem; counter-reset: rank; }
.ranking-list li { display: flex; align-items: center; background: rgba(0,0,0,0.3); padding: 1.2rem; border-radius: 8px; border: 1px solid var(--border-panel); position: relative; overflow: hidden; transition: transform 0.3s; }
.ranking-list li:hover { transform: translateY(-2px); }
.rank-pos { width: 45px; height: 45px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Ma Shan Zheng'; font-size: 1.6rem; color: var(--text-muted); margin-right: 1.5rem; }
.rank-name { font-size: 1.3rem; flex: 1; font-weight: 500; }
.rank-score { font-size: 1.6rem; color: var(--primary-gold-bright); font-family: monospace; }
.rank-1 { border-color: var(--primary-gold); background: linear-gradient(90deg, rgba(232, 185, 90, 0.15), rgba(0,0,0,0.3)); }
.rank-1 .rank-pos { background: linear-gradient(135deg, var(--primary-gold-bright), var(--primary-gold)); color: #000; box-shadow: 0 0 20px rgba(232, 185, 90, 0.6); }
.rank-2 { border-color: #C0C0C0; background: linear-gradient(90deg, rgba(192, 192, 192, 0.1), rgba(0,0,0,0.3)); }
.rank-2 .rank-pos { background: linear-gradient(135deg, #E0E0E0, #A0A0A0); color: #000; box-shadow: 0 0 15px rgba(192, 192, 192, 0.4); }
.rank-3 { border-color: #CD7F32; background: linear-gradient(90deg, rgba(205, 127, 50, 0.15), rgba(0,0,0,0.3)); }
.rank-3 .rank-pos { background: linear-gradient(135deg, #E3A869, #B87333); color: #000; box-shadow: 0 0 15px rgba(205, 127, 50, 0.4); }
@media (max-width: 640px) {
  .row { grid-template-columns: 1fr; }
  .room-head { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .status { text-align: left; align-items: flex-start; }
  .banner-top { flex-direction: column; gap: 1rem; align-items: flex-start; }
  .die { width: 55px; height: 55px; }
  .die-value { font-size: 1.8rem; }
}
</style>
