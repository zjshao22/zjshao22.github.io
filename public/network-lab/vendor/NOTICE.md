# Bundled animation tools

`simulator.bundle.js` includes the editable network model, local capture parser, user interface and GSAP 3.15.1. Its bundled license comments are preserved.

- GSAP: https://gsap.com/ — Standard license: https://gsap.com/standard-license/.
- GSAP is bundled locally; the application does not load a CDN at runtime.
- Editable source: `../src/simulator-app.js`. Rebuild with `npm ci` then `npm run build` from `public/network-lab/`.

The runtime no longer uses or bundles Three.js. `THREE-LICENSE.txt` is retained from the source distribution for historical attribution. The retired guide renderer is not deployed.
