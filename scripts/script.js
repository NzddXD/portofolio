// alr i dont fucking care anymore, kill yourself

console.log("Yes, call me stupid idiot cus i wrote all of this in a vanilla JS.")

document.addEventListener("DOMContentLoaded", () => {
  //========================================================
  //  DOM SELECTORS
  // =======================================================
  const links = document.querySelectorAll("a");
  const extras = document.querySelectorAll(".extras-menu");
  const hoverSound = document.getElementById("hoversound");
  const hoverSoundExtra = document.getElementById("hoversound-extra");
  const clickSound = document.getElementById("clicksound");
  const clickSoundExtra = document.getElementById("clicksound-extra");
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
  const overlayOriginalHTML = overlay.innerHTML;
  const overlayLoadingHTML = `
    <p>loading... please wait</p>
    <p>preparing audio and visuals</p>
  `;

  // playlist system!
  const playlist = [
    { 
      src: "assets/menu.ogg",
      title: "nico's nexbots ost: menu (in-game)",
      volume: 0.6,
    },
    {
      src: "assets/awake.mp3",
      title: "nico's nexbots ost: awake (boombox ver.)",
      volume: 0.6,
    },
    {
      src: "assets/stepback.mp3",
      title: "nico's nexbots ost: stepback (in-game)",
      volume: 0.6,
    },
    {
      src: "assets/domi.ogg",
      title: "nico's nexbots ost: dominic's nexbots",
      volume: 0.6,
    },
    // {
    //   src: "assets/RAMBUNK!.mp3",
    //   title: "forsaken emote ost: rambunctious",
    // },
  ];
  
  let currentTrackIndex = 0;
  const preloadedAudios = [];
  let isStarting = false;

  async function waitForAudioReady(audio, timeout = 12000) {
    if (!audio) {
      throw new Error("waitForAudioReady: no audio element provided");
    }
    if (audio.readyState >= 4) {
      return;
    }

    return new Promise((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(audio.error || new Error("audio failed to load"));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("audio ready timeout"));
      }, timeout);

      function cleanup() {
        clearTimeout(timer);
        audio.removeEventListener("canplaythrough", onReady);
        audio.removeEventListener("loadeddata", onReady);
        audio.removeEventListener("error", onError);
      }

      audio.addEventListener("canplaythrough", onReady, { once: true });
      audio.addEventListener("loadeddata", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });
    });
  }

  function logAudioStatus(track, eventName, extra) {
    console.info(`[audio] ${eventName}:`, track.src, extra || "");
  }

  function preloadPlaylist() {
    playlist.forEach((track) => {
      const resolvedURL = new URL(track.src, window.location.href).href;
      console.info("[audio] resolve track URL:", track.src, "=>", resolvedURL);

      const audio = new Audio(resolvedURL);
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
  hoverSoundExtra.volume = 0.5
  clickSoundExtra.volume = 0.3
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
  async function playTrack(index) {
    if (index >= playlist.length) {
      index = 0; // wrap back
    }
    currentTrackIndex = index;
    const currentTrack = playlist[currentTrackIndex];

    // Reset baseline threshold values
    dynamicMaxBass = 180;
    currentScale = 1.0;
    if (dataArray) dataArray.fill(0);

    if (bgm) {
      bgm.pause();
      bgm.removeEventListener("ended", handleTrackEnded);
      bgm.removeEventListener("play", handleTrackPlay);
      bgm.remove();
    }

    bgm = document.createElement("audio");
    bgm.id = "bgm";
    bgm.crossOrigin = "anonymous";
    bgm.volume = currentTrack.volume;
    bgm.src = currentTrack.src;
    bgm.preload = "auto";

    bgm.addEventListener("ended", handleTrackEnded);
    bgm.addEventListener("play", handleTrackPlay);

    bgm.addEventListener(
      "canplaythrough",
      () => {
        // console.info("[bgm] ready to play:", currentTrack.src);
      },
      { once: true },
    );

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
    setupAudioContext();

    try {
      await waitForAudioReady(bgm, 12000);
      await bgm.play();
    } catch (error) {
      console.warn("[bgm] initial play failed, retrying:", error);

      try {
        await waitForAudioReady(bgm, 12000);
        await bgm.play();
      } catch (retryError) {
        console.error("[bgm] unable to start playback:", retryError);
      }
    }
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
      dynamicMaxBass = Math.max(
        dynamicMaxBass * 0.995,
        bassVol,
        bassThreshold + 1,
      );
    }

    let processedBass = 0;
    if (bassVol >= bassThreshold) {
      const maxRange = Math.max(dynamicMaxBass - bassThreshold, 1);
      processedBass = (bassVol - bassThreshold) * (255 / maxRange);
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

  extras.forEach((extra) => {
    extra.addEventListener("mouseenter", () => {
      hoverSoundExtra.currentTime = 0;
      clickSoundExtra.currentTime = 0;
      hoverSoundExtra.play().catch((e) => console.log("failed to play audio!: ", e));
      clickSoundExtra.play().catch((e) => console.log("cant play audio!: ", e));
    });
    extra.addEventListener("mousedown", () => {
      clickSound.currentTime = 0;
      clickSound.play().catch((e) => console.log(e));
    });
  });

  overlay.addEventListener("mousedown", async () => {
    if (isStarting) return;
    isStarting = true;

    // overlay.style.pointerEvents = "none";
    overlay.innerHTML = overlayLoadingHTML;
    overlay.style.opacity = 1;

    try {
      await playTrack(0);
    } finally {
      overlay.innerHTML = overlayOriginalHTML;
      overlay.style.opacity = 0;
      await sleep(1200);
      overlay.remove();
    }
  });

  // BG Parallax System ===================================================
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
      const targetLink = document.getElementById(targetPageName)

      const currentPageElement = document.querySelector(".sub-page.active");
      const currentLink = document.querySelector(".menu-link.active")

      if (currentPageElement === targetPageElement && currentLink === targetLink) return;

      if (currentPageElement) {
        currentPageElement.classList.remove("active");
        currentPageElement.style.position = "absolute";

        currentLink.classList.remove("active")
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

        targetLink.classList.add("active")
      }

      if (targetPageName == 'extras') {
        console.log("In an, EXTRAS page!")
      }
    });
  });
});
