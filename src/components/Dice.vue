<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  rolling?: boolean
}>()

const isRed = computed(() => props.value === 4)

// 骰子点位布局
const dotPositions: Record<number, [number, number][]> = {
  1: [[25, 25]],
  2: [[12, 12], [38, 38]],
  3: [[12, 12], [25, 25], [38, 38]],
  4: [[12, 12], [38, 12], [12, 38], [38, 38]],
  5: [[12, 12], [38, 12], [25, 25], [12, 38], [38, 38]],
  6: [[12, 12], [38, 12], [12, 25], [38, 25], [12, 38], [38, 38]],
}
</script>

<template>
  <div class="dice" :class="{ rolling, 'dice-red': isRed }">
    <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="50" height="50" rx="8" ry="8" fill="#FFF8F0" stroke="#D4A574" stroke-width="1.5"/>
      <circle
        v-for="(pos, i) in dotPositions[value] || []"
        :key="i"
        :cx="pos[0]"
        :cy="pos[1]"
        r="4.5"
        :class="isRed ? 'dot-red' : 'dot-black'"
      />
    </svg>
  </div>
</template>

<style scoped>
.dice {
  width: 64px;
  height: 64px;
  transition: transform 0.15s;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.dice-red {
  filter: drop-shadow(0 2px 8px rgba(220,38,38,0.4));
}

.rolling {
  animation: diceShake 0.1s infinite alternate;
}

@keyframes diceShake {
  0% { transform: rotate(-8deg) scale(1.05); }
  25% { transform: rotate(5deg) scale(0.95); }
  50% { transform: rotate(-3deg) scale(1.02); }
  75% { transform: rotate(7deg) scale(0.98); }
  100% { transform: rotate(-5deg) scale(1.03); }
}

svg {
  width: 100%;
  height: 100%;
}
</style>
