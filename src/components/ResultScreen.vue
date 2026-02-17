<script setup lang="ts">
import { computed } from 'vue'
import { PRIZE_META, getPrizeColor, getPrizeSurface } from '../constants/prizeMeta'
import type { Champion, Player } from '../composables/useGameState'

const props = defineProps<{
  players: Player[]
  champion: Champion | null
  ranking: Array<Player & { index: number; score: number }>
}>()

const emit = defineEmits<{
  restart: []
}>()

const topThree = computed(() => props.ranking.slice(0, 3))
const medalTitle = ['冠席', '次席', '三席']

function summarizePrizes(player: Player) {
  return PRIZE_META.map((item) => ({
    title: item.title,
    count: player.prizes.filter((prize) => prize.rankTitle === item.title).length,
  })).filter((item) => item.count > 0)
}

function prizeStyle(title: string) {
  return {
    '--tone': getPrizeColor(title),
    '--surface': getPrizeSurface(title),
  }
}
</script>

<template>
  <div class="result-page fade-in">
    <section class="panel hero-panel">
      <p class="hero-note">Final Result</p>
      <h2>博饼结算</h2>
      <p class="hero-subtitle">按奖项权重计算总分，恭喜所有参与者。</p>
    </section>

    <section class="podium-grid">
      <article
        v-for="(player, index) in topThree"
        :key="player.index"
        class="panel podium-card"
        :class="`podium-${index + 1}`"
      >
        <span class="podium-rank">{{ medalTitle[index] }}</span>
        <h3>{{ player.name }}</h3>
        <strong>{{ player.score }} 分</strong>
        <div class="podium-prizes">
          <span
            v-for="item in summarizePrizes(player)"
            :key="item.title"
            class="prize-pill"
            :style="prizeStyle(item.title)"
          >
            {{ item.title }} × {{ item.count }}
          </span>
          <small v-if="summarizePrizes(player).length === 0">无奖项</small>
        </div>
      </article>
    </section>

    <section class="panel ranking-panel">
      <div class="panel-head">
        <h3>完整排名</h3>
        <span>{{ ranking.length }} 位玩家</span>
      </div>
      <div class="ranking-list">
        <article
          v-for="(player, index) in ranking"
          :key="player.index"
          class="rank-row"
        >
          <div class="rank-main">
            <span class="rank-number">{{ index + 1 }}</span>
            <strong>{{ player.name }}</strong>
          </div>
          <div class="rank-meta">
            <div class="rank-prizes">
              <span
                v-for="item in summarizePrizes(player)"
                :key="item.title"
                class="mini-pill"
                :style="prizeStyle(item.title)"
              >
                {{ item.title }} × {{ item.count }}
              </span>
              <small v-if="summarizePrizes(player).length === 0">无奖项</small>
            </div>
            <strong class="rank-score">{{ player.score }} 分</strong>
          </div>
        </article>
      </div>
    </section>

    <section v-if="champion" class="panel champion-panel">
      <span>本局状元</span>
      <h3>{{ players[champion.playerIndex]?.name }}</h3>
      <p>{{ champion.rankName }}</p>
    </section>

    <button class="btn-primary restart-btn" @click="emit('restart')">
      再来一局
    </button>
  </div>
</template>

<style scoped>
.result-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hero-panel {
  padding: 0.95rem 1.1rem;
}

.hero-note {
  color: rgba(217, 190, 163, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
}

.hero-panel h2 {
  margin-top: 0.25rem;
  color: #f8d391;
  font-size: clamp(1.6rem, 3.4vw, 2.1rem);
}

.hero-subtitle {
  margin-top: 0.4rem;
  color: var(--text-soft);
  font-size: 0.9rem;
}

.podium-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.podium-card {
  padding: 0.95rem 0.9rem;
  display: grid;
  gap: 0.35rem;
}

.podium-rank {
  font-size: 0.74rem;
  color: rgba(217, 190, 163, 0.82);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.podium-card h3 {
  color: #f9d489;
  font-size: 1.2rem;
}

.podium-card strong {
  color: #fff2de;
  font-size: 1.05rem;
}

.podium-prizes {
  margin-top: 0.15rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.podium-1 {
  border-color: rgba(246, 179, 67, 0.54);
}

.podium-2 {
  border-color: rgba(142, 197, 255, 0.45);
}

.podium-3 {
  border-color: rgba(255, 159, 126, 0.45);
}

.prize-pill,
.mini-pill {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--tone) 40%, transparent);
  color: var(--tone);
  background: color-mix(in srgb, var(--surface) 68%, rgba(15, 9, 13, 0.56));
  font-weight: 700;
}

.prize-pill {
  font-size: 0.72rem;
  padding: 0.14rem 0.45rem;
}

.mini-pill {
  font-size: 0.69rem;
  padding: 0.1rem 0.4rem;
}

.podium-prizes small,
.rank-prizes small {
  color: rgba(217, 190, 163, 0.74);
  font-size: 0.72rem;
}

.ranking-panel {
  padding: 0.9rem;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-head span {
  color: rgba(217, 190, 163, 0.8);
  font-size: 0.75rem;
}

.ranking-list {
  margin-top: 0.65rem;
  display: grid;
  gap: 0.45rem;
}

.rank-row {
  border-radius: 10px;
  border: 1px solid rgba(246, 179, 67, 0.12);
  background: rgba(29, 14, 22, 0.66);
  padding: 0.58rem 0.65rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.rank-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rank-number {
  width: 22px;
  aspect-ratio: 1;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: #f8d391;
  background: rgba(246, 179, 67, 0.18);
}

.rank-meta {
  text-align: right;
  display: grid;
  gap: 0.25rem;
}

.rank-prizes {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.26rem;
}

.rank-score {
  color: #f9d489;
  font-size: 0.92rem;
}

.champion-panel {
  padding: 0.85rem 1rem;
  text-align: center;
  border-color: rgba(246, 179, 67, 0.46);
  background:
    linear-gradient(130deg, rgba(246, 179, 67, 0.14), rgba(22, 12, 18, 0.76)),
    linear-gradient(145deg, rgba(39, 19, 28, 0.8), rgba(28, 14, 22, 0.86));
}

.champion-panel span {
  color: rgba(217, 190, 163, 0.88);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.champion-panel h3 {
  margin-top: 0.2rem;
  color: #f8d391;
  font-size: 1.35rem;
}

.champion-panel p {
  margin-top: 0.15rem;
  color: rgba(249, 239, 226, 0.82);
}

.restart-btn {
  width: 100%;
  font-size: 1.02rem;
}

@media (max-width: 920px) {
  .podium-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .rank-row {
    flex-direction: column;
    align-items: stretch;
  }

  .rank-meta {
    text-align: left;
  }

  .rank-prizes {
    justify-content: flex-start;
  }
}
</style>
