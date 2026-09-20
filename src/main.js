// Dynamic import keeps CDN/WebGL failures visible instead of leaving a blank canvas.
import('./core/game.js').then(({ Game }) => {
  const game = new Game(document.getElementById('game'));
  window.addEventListener('pagehide', event => { if (!event.persisted) game.destroy(); });
}).catch(error => {
  console.error(error);
  document.getElementById('overlay').hidden = true;
  const message = document.getElementById('error');
  message.hidden = false;
  message.textContent = 'The meadow could not load. Use a local HTTP server, check your connection to cdn.jsdelivr.net, and ensure WebGL is enabled. ' + error.message;
});
