<template>
  <div class="inline-block">
    <!-- Volume Button (Triggers Modal) -->
    <button 
      class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-slate-700 hover:-translate-y-px text-gray-900 dark:text-white font-semibold text-sm min-w-[90px] justify-center" 
      @click="openModal"
      :class="{ 'opacity-70 bg-gray-100 dark:bg-slate-800': muted }"
    >
      <span class="text-lg">{{ volumeIcon }}</span>
      <span class="font-semibold">{{ volume }}%</span>
    </button>

    <!-- Modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click="closeModal">
        <div class="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden transform transition-all" @click.stop>
          <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Volume Control</h3>
            <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" @click="closeModal">
              <span class="mdi mdi-close text-xl"></span>
            </button>
          </div>
          
          <div class="p-8 flex flex-col items-center gap-6">
            <div class="text-5xl transition-transform duration-200" :class="{ 'opacity-50': muted }">
              {{ volumeIcon }}
            </div>
            
            <div class="w-full px-2">
              <div class="relative w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full">
                <div 
                  class="absolute left-0 top-0 bottom-0 bg-blue-600 rounded-full pointer-events-none" 
                  :style="{ width: `${volume}%` }"
                ></div>
                <input
                  type="range"
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  :value="volume"
                  @input="handleVolumeChange"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="muted"
                />
              </div>
            </div>
            
            <div class="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{{ volume }}%</div>
            
            <button 
              class="w-full py-3 rounded-lg border font-semibold text-base transition-all" 
              @click="toggleMute"
              :class="muted ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700'"
            >
              {{ muted ? 'Unmute' : 'Mute' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps<{
  volume: number
  muted: boolean
}>()

const emit = defineEmits<{
  'update:volume': [value: number]
  'update:muted': [value: boolean]
}>()

const isOpen = ref(false)

const volumeIcon = computed(() => {
  if (props.muted) return '🔇'
  if (props.volume === 0) return '🔈'
  if (props.volume < 50) return '🔉'
  return '🔊'
})

function openModal() {
  isOpen.value = true
}

function closeModal() {
  isOpen.value = false
}

function handleVolumeChange(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:volume', parseInt(target.value))
}

function toggleMute() {
  emit('update:muted', !props.muted)
}

// Close on Escape key
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    closeModal()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
</script>

<style scoped>
/* Scoped styles removed in favor of Tailwind CSS */
</style>
