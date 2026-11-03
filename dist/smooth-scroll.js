import Lenis from './vendor/lenis/lenis.mjs';

// Local, pinned Lenis 1.3.27. One scroll interpolator for the entire page.
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let lenis;
function setupScroll() {
  lenis?.destroy();
  lenis = undefined;
  if (motionPreference.matches) return;
  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.065,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.9,
    anchors: { offset: -24 },
    stopInertiaOnNavigate: true,
    respectReducedMotion: true,
    // Horizontal gallery gestures remain in the spatial header's own hands.
    virtualScroll: ({event}) => Math.abs(event.deltaX) <= Math.abs(event.deltaY),
  });
}
setupScroll();
motionPreference.addEventListener('change', setupScroll);
