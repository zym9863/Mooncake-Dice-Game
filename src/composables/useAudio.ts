let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function playNoise(duration: number, volume = 0.15) {
  const ctx = getAudioCtx()
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize)
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.setValueAtTime(2000, ctx.currentTime)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start()
}

export function useAudio() {
  function playDiceRoll() {
    // 多个短促碰撞声
    for (let i = 0; i < 5; i++) {
      setTimeout(() => playNoise(0.08, 0.1), i * 60)
    }
  }

  function playDiceLand() {
    playNoise(0.15, 0.2)
    playTone(200, 0.1, 'triangle', 0.15)
  }

  function playWin() {
    // 上升音阶
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'sine', 0.25), i * 120)
    })
  }

  function playChampion() {
    // 喜庆的上升+下降音阶
    const notes = [523, 659, 784, 1047, 1319, 1047, 1319, 1568]
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.25, 'sine', 0.3), i * 100)
    })
  }

  function playSteal() {
    // 紧张+喜庆
    const notes = [392, 440, 494, 523, 659, 784, 1047, 1319]
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'square', 0.15), i * 80)
    })
  }

  function playNoWin() {
    playTone(300, 0.15, 'triangle', 0.1)
    setTimeout(() => playTone(250, 0.2, 'triangle', 0.1), 150)
  }

  return { playDiceRoll, playDiceLand, playWin, playChampion, playSteal, playNoWin }
}
