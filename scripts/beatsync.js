// UNUSED

// document.addEventListener("DOMContentLoaded", () => {
 
  // vars
  

  // another configs
 

  // global bridge function
  // window.resetBeatSync = function() {
  //   console.log('resetting freq buffer...')
  //   if (dataArray) {
  //     dataArray.fill(0); // flush out old trailing freqs
  //   }

  //   if (audioContext && audioContext.state === "suspended") {
  //     audioContext.resume()
  //   }
  // }

  // // Huge Fix: force reconnect when queue system switches track
  // // listens for source layout then repairs the node pipeline
  // bgm.addEventListener("emptied", () => {
  //   console.log("Track source changed. Keeping AudioContext active...")
  //   if (audioContext && audioContext.state === "suspended") {
  //     audioContext.resume()
  //   }
  // })

  


//   bgm.addEventListener("play", async () => {
//     if (audioContext && audioContext.state === "suspended") {
//       await audioContext.resume();
//     }
//     setupAudioContext();
//     animate();
//   });
// });
