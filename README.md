# CBB Evolution Tour 2026 – band app

A private day-by-day itinerary for the band, built to be saved to phones' home screens.

- The itinerary inside `index.html` is **encrypted** (AES-256-GCM, key derived with PBKDF2-SHA256, 600,000 rounds, from the band PIN **plus** a long random code that only exists in the link sent to the band). Neither the PIN nor the link code is stored in this repository. Without both, the page shows only a lock screen.
- The readable itinerary (`private/itinerary.json`) and the tourbook PDF are **never committed** (see `.gitignore`).
- Works offline once opened (service worker), and is hidden from search engines (`robots.txt`, `noindex`).

## Updating the itinerary
1. Edit `private/itinerary.json`.
2. `TOUR_PIN=<pin> TOUR_LINK_KEY=<the part after #k= in the band link> node build.mjs`
3. Commit `index.html` and `sw.js`, then push. Phones pick up the change next time the app is opened with signal.

Changing the PIN works the same way. Leaving out `TOUR_LINK_KEY` creates a new link code, so everyone needs the new link.
