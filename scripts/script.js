// alr i dont fucking care anymore, kill yourself

document.addEventListener("DOMContentLoaded", () => {
  //========================================================
  //  DOM SELECTORS
  // =======================================================
  const links = document.querySelectorAll("a");
  const hoverSound = document.getElementById("hoversound");
  const clickSound = document.getElementById("clicksound");
  const bg = document.getElementById("bg");
  const overlay = document.getElementById("overlay");
  const pageTitle = document.getElementById("page-name");
  const noiseSwitch = document.getElementById("noise-switch");
  const noteIcon = document.getElementById("icon");
  const musicTitleElem = document.getElementById("music-title");
  
  // FIXED: Select the initial audio track, but let it be a re-assignable variable
  let bgm = document.getElementById("bgm");

  //========================================================
  //  CONFIGS & PLAYLIST
  // =======================================================
  const strength = 20;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // playlist!
  const playlist = [
    { src: "assets/menu.ogg", title: "nico's nexbots ost: menu (in-game)" },
    { src: "assets/awake.mp3", title: "nico's nexbots ost: awake (boombox ver.)" },
    { src: "assets/stepback.mp3", title: "nico's nexbots ost: stepback (in-game)" },
    { src: "assets/domi.ogg", title: "nico's nexbots ost: dominic's nexbots" },
    { src: "assets/RAMBUNK!.mp3", title: "forsaken emote ost: rambunctious" },
  ];
  let currentTrackIndex = 0;
  const preloadedAudios = [];

  function logAudioStatus(track, eventName, extra) {
    console.info(`[audio] ${eventName}:`, track.src, extra || "");
  }

  function preloadPlaylist() {
    playlist.forEach((track) => {
      const audio = new Audio(track.src);
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      audio.addEventListener(
        "canplaythrough",
        () => logAudioStatus(track, "canplaythrough"),
        { once: true },
      );
      audio.addEventListener(
        "loadeddata",
        () => logAudioStatus(track, "loadeddata"),
        { once: true },
      );
      audio.addEventListener(
        "error",
        () => {
          const err = audio.error;
          logAudioStatus(
            track,
            "error",
            err ? `${err.code} (${err.message})` : "unknown",
          );
        },
        { once: true },
      );
      audio.load();
      preloadedAudios.push(audio);
    });
  }

  preloadPlaylist();

  //========================================================
  //  BEATSYNC CONFIGS
  // =======================================================
  let audioContext = null;
  let analyser = null;
  let dataArray = null;
  let source = null;
  let fftsize = 64;
  let currentScale = 1.0;

  //========================================================
  //  BEAT SETTINGS
  // =======================================================
  const amplitude = 0.23;
  const volume_multiplier = 0.9;
  const decayRate = 0.5;
  const bassThreshold = 105;
  let dynamicMaxBass = 180;

  //========================================================
  //  Master Volume Settings
  // =======================================================
  hoverSound.volume = 0.7;
  clickSound.volume = 1;
  if (bgm) bgm.volume = 0.5;

  //========================================================
  //  CORE ENGINES AREA
  // =======================================================

  // Typewriter Effect
  function typewritterEffect(elem, txt, speed = 30) {
    if (!elem) return;
    elem.innerHTML = "";
    let index = 0;
    function typeNextChar() {
      if (index < txt.length) {
        elem.innerHTML += txt.charAt(index);
        index++;
        setTimeout(typeNextChar, speed);
      }
    }
    typeNextChar();
  }

  // Secure Audio Pipeline System
  function setupAudioContext() {
    if (!bgm) return;
    bgm.crossOrigin = "anonymous";

    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (!analyser) {
      analyser = audioContext.createAnalyser();
      analyser.fftSize = fftsize;
      analyser.smoothingTimeConstant = 0.8;
    }

    if (source) {
      source.disconnect();
    }

    source = audioContext.createMediaElementSource(bgm);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
  }

  // Playlist navigation queue system
  function playTrack(index) {
    if (index >= playlist.length) {
      index = 0; // wrap back
    }
    currentTrackIndex = index;
    const currentTrack = playlist[currentTrackIndex];

    // Reset baseline threshold values
    dynamicMaxBass = 180;
    currentScale = 1.0;
    if (dataArray) dataArray.fill(0);

    // FIXED: HARD DESTRUCTION AND RE-CREATION LOCKS
    if (bgm) {
      bgm.pause();
      bgm.removeEventListener("ended", handleTrackEnded);
      bgm.removeEventListener("play", handleTrackPlay);
      bgm.remove(); 
    }

    bgm = document.createElement("audio");
    bgm.id = "bgm";
    bgm.crossOrigin = "anonymous";
    bgm.volume = 0.5;
    bgm.src = currentTrack.src;
    
    bgm.addEventListener("ended", handleTrackEnded);
    bgm.addEventListener("play", handleTrackPlay);
    bgm.addEventListener("canplaythrough", () => {
      console.info("[bgm] ready to play:", currentTrack.src);
    }, { once: true });
    bgm.addEventListener("stalled", () => {
      console.warn("[bgm] stalled while loading:", currentTrack.src);
    });
    bgm.addEventListener("error", () => {
      const err = bgm.error;
      console.error(
        "[bgm] failed to load/play:",
        currentTrack.src,
        err ? `${err.code} (${err.message})` : "unknown error",
      );
    });
    
    document.body.appendChild(bgm);

    // Auto name extractor
    let displayName = currentTrack.title;
    if (!displayName) {
      const filename = currentTrack.src.split("/").pop();
      displayName = filename.split(".")[0].replace(/_/g, " ");
    }

    typewritterEffect(musicTitleElem, displayName, 10);

    bgm.load();

    // Re-verify the node stream connection graph links
    setupAudioContext();

    bgm.play().catch((e) => console.log("got a problem!: ", e));
  }

  // Icon Beat System
  function animate() {
    if (!bgm || bgm.paused) {
      if (noteIcon) noteIcon.style.transform = "scale(1)";
      return;
    }
    requestAnimationFrame(animate);

    if (!dataArray || !analyser) return;
    analyser.getByteFrequencyData(dataArray);

    let bassVol = 0;
    const bassBins = Math.min(16, dataArray.length);
    for (let i = 0; i < bassBins; i += 1) {
      bassVol += dataArray[i];
    }
    bassVol /= bassBins;

    if (bassVol > dynamicMaxBass) {
      dynamicMaxBass = bassVol;
    } else {
      dynamicMaxBass = Math.max(dynamicMaxBass * 0.995, bassVol, bassThreshold + 1);
    }

    let processedBass = 0;
    if (bassVol >= bassThreshold) {
      const maxRange = Math.max(dynamicMaxBass - bassThreshold, 1);
      processedBass =
        (bassVol - bassThreshold) * (255 / maxRange);
    }

    let amplifiedVol = processedBass * volume_multiplier;
    let targetScale = 1.0 + (amplifiedVol / 128) * amplitude;

    if (targetScale > currentScale) {
      currentScale = targetScale;
    } else {
      currentScale = 1.0 + (currentScale - 1.0) * decayRate;
      if (currentScale < 1.0) currentScale = 1.0;
    }

    if (noteIcon) noteIcon.style.transform = `scale(${currentScale})`;
  }

  //========================================================
  //  GLOBAL EVENT HANDLER CODES (Isolated for easy recycling)
  //========================================================
  function handleTrackEnded() {
    const nextTrackIndex = currentTrackIndex + 1;
    playTrack(nextTrackIndex);
  }

  function handleTrackPlay() {
    animate();
  }

  // ==========================================
  //  BIND INITIAL EVENT HANDLERS
  // ==========================================
  if (bgm) {
    bgm.addEventListener("ended", handleTrackEnded);
    bgm.addEventListener("play", handleTrackPlay);
  }

  links.forEach((link) => {
    link.addEventListener("mouseenter", () => {
      hoverSound.currentTime = 0; // rewind
      hoverSound
        .play()
        .catch((error) => console.log("failed to play audio!: ", error));
    });
    link.addEventListener("mousedown", () => {
      clickSound.currentTime = 0;
      clickSound.play().catch((e) => console.log("cant play audio!: ", e));
    });
  });

  overlay.addEventListener("mousedown", () => {
    async function fadenDestroy() {
      overlay.style.opacity = 0;
      await new Promise((r) => setTimeout(r, 1200));

      playTrack(0);

      overlay.remove();
    }
    fadenDestroy();
  });

  window.addEventListener("mousemove", (e) => {
    const xVal = e.clientX / window.innerWidth - 0.5;
    const yVal = e.clientY / window.innerHeight - 0.5;

    const moveX = xVal * strength;
    const moveY = yVal * strength;

    bg.style.transform = `scale(1.1) translate(${moveX}px, ${moveY}px)`;
  });

  links.forEach((link) => {
    link.addEventListener("click", async (e) => {
      const targetPageName = link.getAttribute("data-page");
      if (!targetPageName) return;

      e.preventDefault();

      const targetPageElement = document.getElementById(
        `page-${targetPageName}`,
      );
      const currentPageElement = document.querySelector(".sub-page.active");
      if (currentPageElement === targetPageElement) return;
      if (currentPageElement) {
        currentPageElement.classList.remove("active");
        currentPageElement.style.position = "absolute";
      }

      await sleep(100);

      if (targetPageElement) {
        noiseSwitch.style.visibility = "visible";
        noiseSwitch.style.opacity = 0.18;

        await sleep(90);
        typewritterEffect(pageTitle, targetPageName, 50);

        noiseSwitch.style.opacity = 0;
        noiseSwitch.style.visibility = "hidden";

        targetPageElement.style.position = "";
        targetPageElement.classList.add("active");
      }
    });
  });
});
