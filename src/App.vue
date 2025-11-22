<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const videos = ref([])
const currentVideo = ref(null)
const videoPlayer = ref(null) // Ref for the video element
const progressData = ref({}) // To store watch progress { videoName: time }

const STORAGE_KEY = 'video-progress';

// --- Helper Functions ---
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 1) return '';
  const floorSeconds = Math.floor(seconds);
  const min = Math.floor(floorSeconds / 60);
  const sec = floorSeconds % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// --- Progress Management ---
function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData.value));
}

function loadProgress() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    progressData.value = JSON.parse(data);
  }
}

function handleTimeUpdate(event) {
  const currentTime = event.target.currentTime;
  if (currentVideo.value) {
    // Update reactive ref frequently, but save to localStorage less often (on pause/switch)
    progressData.value[currentVideo.value] = currentTime;
  }
}

function handlePause() {
  // Save progress when video is paused
  saveProgress();
}

// --- Core Functions ---
onMounted(async () => {
  loadProgress(); // Load saved progress on start
  try {
    const response = await fetch('/api/videos');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    videos.value = await response.json();
    if (videos.value.length > 0) {
      playVideo(videos.value[0]);
    }
  } catch (error) {
    console.error('Failed to fetch videos:', error);
  }

  // Save progress when user closes the tab
  window.addEventListener('beforeunload', saveProgress);
});

onUnmounted(() => {
  // Clean up the event listener
  window.removeEventListener('beforeunload', saveProgress);
  saveProgress(); // Final save
});


function playVideo(videoName) {
  // Jika video yang sama diklik, jangan lakukan apa-apa agar tidak memulai ulang.
  if (videoName === currentVideo.value) {
    return;
  }

  // Simpan progres video saat ini sebelum beralih.
  // `progressData` sudah diperbarui oleh event `timeupdate`.
  // Kita hanya perlu menyimpan status terakhir ke localStorage sebelum beralih.
  if (currentVideo.value) {
    saveProgress();
  }

  // Beralih ke video baru.
  currentVideo.value = videoName;
}

function getVideoUrl(videoName) {
  return `/videos/${videoName}`;
}
</script>

<template>
  <div class="flex flex-col h-screen bg-slate-800 text-slate-200 font-sans">
    <header class="p-4 lg:px-8 border-b">
      <h1 class="m-0 text-2x">Intranet Video Streamer</h1>
    </header>
    <main class="flex-1 overflow-hidden flex flex-col lg:flex-row">
      <div class="flex-auto lg:flex-3 flex justify-center items-center bg-black p-4">
        <video
          v-if="currentVideo"
          :key="currentVideo"
          ref="videoPlayer"
          :src="getVideoUrl(currentVideo)"
          controls
          autoplay
          class="w-full h-full max-w-full max-h-full object-contain"
          @timeupdate="handleTimeUpdate"
          @pause="handlePause"
        >
          Your browser does not support the video tag.
        </video>
        <div v-else class="text-center text-on-surface-secondary">
          <p>Please select a video from the list or add videos to the 'assets' folder.</p>
        </div>
      </div>
      <aside class="flex-auto lg:flex-1 bg-surface p-4 overflow-y-auto border-t lg:border-t-0 lg:border-l border-border">
        <h2 class="mt-0 pb-2 border-b border-border">Playlist</h2>
        <ul v-if="videos.length > 0" class="list-none p-0 m-0">
          <li
            v-for="video in videos"
            :key="video"
            @click="playVideo(video)"
            :class="{ 'bg-primary font-bold': video === currentVideo, 'hover:bg-border': video !== currentVideo }"
            class="p-3 cursor-pointer rounded-md transition-colors duration-200 ease-in-out break-all flex flex-col leading-tight mb-2"
          >
            <span class="text-sm">{{ video }}</span>
            <span v-if="progressData[video]" :class="{'text-on-surface-secondary': video !== currentVideo}" class="text-xs italic">
              (watched {{ formatTime(progressData[video]) }})
            </span>
          </li>
        </ul>
        <p v-else class="text-on-surface-secondary">No videos found in the 'assets' folder.</p>
      </aside>
    </main>
  </div>
</template>
