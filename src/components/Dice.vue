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

const faces = [
  { val: 1, class: 'face-1' },
  { val: 2, class: 'face-2' },
  { val: 3, class: 'face-3' },
  { val: 4, class: 'face-4' },
  { val: 5, class: 'face-5' },
  { val: 6, class: 'face-6' },
]

// 根据最终数值计算停止时的旋转角度，以展示对应的面
const cubeStyle = computed(() => {
  if (props.rolling) return {} // 滚动的动画交给 CSS
  
  // 以轻微倾斜角度为基正确展示对应的面
  // 1=前, 2=右(面在右，所以向左转显示它就是-90), 3=下(面上，向下转-90), 4=上(面下，向上转90), 5=左(90), 6=后(180)
  let rx = 10
  let ry = -10
  
  switch (props.value) {
    case 1: rx += 0; ry += 0; break;
    case 2: rx += 0; ry += -90; break;
    case 3: rx += 90; ry += 0; break;
    case 4: rx += -90; ry += 0; break;
    case 5: rx += 0; ry += 90; break;
    case 6: rx += 0; ry += 180; break;
  }
  
  return {
    transform: `rotateX(${rx}deg) rotateY(${ry}deg)`
  }
})
</script>

<template>
  <div class="dice" :class="{ rolling, 'dice-red': isFour }">
    <div class="dice-cube" :style="cubeStyle">
      <div v-for="face in faces" :key="face.class" class="face" :class="face.class">
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
            v-for="(pos, index) in dotPositions[face.val] || []"
            :key="index"
            :cx="pos[0]"
            :cy="pos[1]"
            :r="face.val === 1 ? 8.5 : 4.4"
            :class="(face.val === 1 || face.val === 4) ? 'dot-red' : 'dot-black'"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dice {
  width: clamp(58px, 9vw, 72px);
  aspect-ratio: 1;
  perspective: 800px;
  position: relative;
}

.dice-cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  /* 加入缓动效果，模拟停止 */
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  transform: rotateX(10deg) rotateY(-10deg);
}

.dice-cube::after {
  content: "";
  position: absolute;
  top: 10%;
  left: 10%;
  width: 80%;
  height: 80%;
  box-shadow: 0 0 20px 8px rgba(0,0,0,0.3);
  transform: translateZ(-20px);
  border-radius: 50%;
  z-index: -1;
  pointer-events: none;
}

.rolling .dice-cube {
  animation: diceTumble 0.3s linear infinite;
  transition: none; /* 滚动时不做过渡 */
}

@keyframes diceTumble {
  0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
  100% { transform: rotateX(360deg) rotateY(720deg) rotateZ(180deg); }
}

.face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 10px;
  background-color: #FFF7EE;
  /* 给每个面加入内部阴影增强立体感 */
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);
}

.dice-red .face {
  box-shadow: inset 0 0 10px rgba(201, 62, 47, 0.2);
}

/* 根据骰子宽度动态计算位移：推到外表面 */
.face-1 { transform: translateZ(calc(clamp(58px, 9vw, 72px) / 2)); }
.face-6 { transform: rotateY(180deg) translateZ(calc(clamp(58px, 9vw, 72px) / 2)); }
.face-2 { transform: rotateY(90deg) translateZ(calc(clamp(58px, 9vw, 72px) / 2)); }
.face-5 { transform: rotateY(-90deg) translateZ(calc(clamp(58px, 9vw, 72px) / 2)); }
.face-3 { transform: rotateX(-90deg) translateZ(calc(clamp(58px, 9vw, 72px) / 2)); }
.face-4 { transform: rotateX(90deg) translateZ(calc(clamp(58px, 9vw, 72px) / 2)); }

svg {
  width: 100%;
  height: 100%;
  display: block;
}

.dot-red {
  fill: #D73C3E;
}

.dot-black {
  fill: #161B33;
}
</style>
