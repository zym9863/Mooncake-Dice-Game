<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  rolling?: boolean
}>()

const isRed = computed(() => props.value === 4)

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
    <div class="dice-shell">
      <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="0"
          y="0"
          width="50"
          height="50"
          rx="8"
          ry="8"
          fill="#FFF7EE"
          stroke="#D39C63"
          stroke-width="1.3"
        />
        <circle
          v-for="(pos, index) in dotPositions[value] || []"
          :key="index"
          :cx="pos[0]"
          :cy="pos[1]"
          r="4.4"
          :class="isRed ? 'dot-red' : 'dot-black'"
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
</style>
