<script setup lang="ts">
import { computed } from 'vue'
import type { Player, Champion } from '../composables/useGameState'

const props = defineProps<{
  players: Player[]
  champion: Champion | null
  ranking: Array<Player & { index: number; score: number }>
}>()

const emit = defineEmits<{
  restart: []
}>()

const medals = ['🥇', '🥈', '🥉']

const winner = computed(() => props.ranking[0])

function getPrizeCount(player: Player, title: string): number {
  return player.prizes.filter(p => p.rankTitle === title).length
}
</script>

<template>
  <div class="result-screen fade-in">
    <div class="header">
      <h1>🎊 博饼结束 🎊</h1>
      <p class="subtitle">恭喜各位！</p>
    </div>

    <!-- 冠军展示 -->
    <div v-if="winner" class="winner-card card">
      <div class="winner-medal">🏆</div>
      <div class="winner-name">{{ winner.name }}</div>
      <div class="winner-score">总分：{{ winner.score }}</div>
      <div class="winner-prizes">
        <span
          v-for="(prize, j) in winner.prizes"
          :key="j"
          class="prize-tag"
          :class="'tag-' + prize.rankTitle"
        >
          {{ prize.rankTitle }}
        </span>
      </div>
    </div>

    <!-- 排行榜 -->
    <div class="card ranking-card">
      <h3>最终排名</h3>
      <div class="ranking-list">
        <div
          v-for="(player, i) in ranking"
          :key="player.index"
          class="ranking-row"
          :class="{ 'top-3': i < 3 }"
        >
          <div class="rank-info">
            <span class="rank-pos">{{ i < 3 ? medals[i] : `${i + 1}` }}</span>
            <span class="rank-name">{{ player.name }}</span>
          </div>
          <div class="rank-details">
            <div class="rank-prizes">
              <span v-if="getPrizeCount(player, '状元')">状元×{{ getPrizeCount(player, '状元') }}</span>
              <span v-if="getPrizeCount(player, '榜眼')">榜眼×{{ getPrizeCount(player, '榜眼') }}</span>
              <span v-if="getPrizeCount(player, '探花')">探花×{{ getPrizeCount(player, '探花') }}</span>
              <span v-if="getPrizeCount(player, '进士')">进士×{{ getPrizeCount(player, '进士') }}</span>
              <span v-if="getPrizeCount(player, '举人')">举人×{{ getPrizeCount(player, '举人') }}</span>
              <span v-if="getPrizeCount(player, '秀才')">秀才×{{ getPrizeCount(player, '秀才') }}</span>
              <span v-if="player.prizes.length === 0" class="no-prizes">无奖品</span>
            </div>
            <div class="rank-score">{{ player.score }}分</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 状元信息 -->
    <div v-if="champion" class="card champion-card">
      <div class="champion-title">🏆 状元</div>
      <div class="champion-name">{{ players[champion.playerIndex]?.name }}</div>
      <div class="champion-detail">{{ champion.rankName }}</div>
    </div>

    <button class="btn-primary restart-btn" @click="emit('restart')">
      再来一局！
    </button>
  </div>
</template>

<style scoped>
.result-screen {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 0;
}

.header {
  text-align: center;
  padding: 16px 0;
}

.header h1 {
  font-size: 2em;
  background: linear-gradient(135deg, var(--gold), var(--red), var(--gold));
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 3s linear infinite;
}

.subtitle {
  color: var(--text-muted);
  margin-top: 4px;
}

.winner-card {
  text-align: center;
  padding: 24px;
  background: linear-gradient(135deg, var(--bg-card), rgba(245,158,11,0.08));
  border-color: var(--gold-dark);
}

.winner-medal {
  font-size: 48px;
  margin-bottom: 8px;
}

.winner-name {
  font-size: 28px;
  font-weight: 700;
  color: var(--gold);
}

.winner-score {
  color: var(--text-muted);
  margin: 4px 0 12px;
}

.winner-prizes {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.prize-tag {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.tag-状元 { background: rgba(245,158,11,0.2); color: #F59E0B; }
.tag-榜眼 { background: rgba(192,132,252,0.2); color: #C084FC; }
.tag-探花 { background: rgba(252,165,165,0.2); color: #FCA5A5; }
.tag-进士 { background: rgba(103,232,249,0.2); color: #67E8F9; }
.tag-举人 { background: rgba(134,239,172,0.2); color: #86EFAC; }
.tag-秀才 { background: rgba(212,160,160,0.2); color: #D4A0A0; }

.ranking-card h3 {
  text-align: center;
  margin-bottom: 12px;
  font-size: 16px;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranking-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--bg-card-light);
  border-radius: 8px;
}

.ranking-row.top-3 {
  border: 1px solid rgba(245,158,11,0.2);
}

.rank-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rank-pos {
  font-size: 18px;
  min-width: 28px;
  text-align: center;
  font-weight: 700;
  color: var(--text-muted);
}

.rank-name {
  font-weight: 600;
  font-size: 15px;
}

.rank-details {
  text-align: right;
}

.rank-prizes {
  display: flex;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.rank-score {
  font-size: 13px;
  color: var(--gold);
  font-weight: 600;
  margin-top: 2px;
}

.no-prizes {
  color: var(--text-muted);
  opacity: 0.5;
}

.champion-card {
  text-align: center;
  padding: 16px;
  border-color: var(--gold-dark);
  background: linear-gradient(135deg, rgba(245,158,11,0.05), rgba(220,38,38,0.05));
}

.champion-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--gold);
}

.champion-name {
  font-size: 22px;
  font-weight: 700;
  margin: 4px 0;
}

.champion-detail {
  font-size: 14px;
  color: var(--text-muted);
}

.restart-btn {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  letter-spacing: 2px;
  margin-top: 8px;
}
</style>
