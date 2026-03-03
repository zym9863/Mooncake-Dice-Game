<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  rolling?: boolean
}>()

const isFour = computed(() => props.value === 4)

const dotPositions: Record<number, [number, number][]> = {
  1: [[25, 25]],
  2: [[14, 14], [36, 36]],
  3: [[13, 13], [25, 25], [37, 37]],
  4: [[14, 14], [36, 14], [14, 36], [36, 36]],
  5: [[13, 13], [37, 13], [25, 25], [13, 37], [37, 37]],
  6: [[14, 11], [36, 11], [14, 25], [36, 25], [14, 39], [36, 39]],
}
</script>

<template>
  <div class="dice" :class="{ rolling, 'dice-red': isFour }">
    <div class="dice-shell">
      <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="0"
          y="0"
          width="50"
          height="50"
          rx="10"
          ry="10"
          fill="#FFF7EE"
          stroke="#D39C63"
          stroke-width="1"
        />
        <circle
          v-for="(pos, index) in dotPositions[value] || []"
          :key="index"
          :cx="pos[0]"
          :cy="pos[1]"
          :r="value === 1 ? 8.5 : 4.4"
          :class="(value === 1 || value === 4) ? 'dot-red' : 'dot-black'"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.dice {
  width: clamp(58px, 9vw, 72px);
  aspect-ratio: 1;
  perspective: 360px;
}

.dice-shell {
  width: 100%;
  height: 100%;
  border-radius: 14px;
  overflow: hidden;
  transform: rotateX(8deg) rotateY(-8deg);
  box-shadow:
    0 6px 16px rgba(8, 4, 6, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.dice:hover .dice-shell {
  transform: rotateX(5deg) rotateY(-5deg) translateY(-1px);
}

.dice-red .dice-shell {
  box-shadow:
    0 6px 16px rgba(8, 4, 6, 0.42),
    0 0 0 1px rgba(201, 62, 47, 0.34),
    0 0 16px rgba(201, 62, 47, 0.25);
}

.rolling .dice-shell {
  animation: diceShake 0.11s infinite alternate;
}

@keyframes diceShake {
  0% {
    transform: rotateX(11deg) rotateY(-12deg) rotateZ(-5deg) scale(1.02);
  }
  25% {
    transform: rotateX(6deg) rotateY(8deg) rotateZ(4deg) scale(0.97);
  }
  50% {
    transform: rotateX(12deg) rotateY(-6deg) rotateZ(-2deg) scale(1.03);
  }
  75% {
    transform: rotateX(4deg) rotateY(10deg) rotateZ(5deg) scale(0.96);
  }
  100% {
    transform: rotateX(10deg) rotateY(-10deg) rotateZ(-4deg) scale(1.01);
  }
}

svg {
  width: 100%;
  height: 100%;
}

.dot-red {
  fill: #D73C3E;
}

.dot-black {
  fill: #161B33;
}
</style>
