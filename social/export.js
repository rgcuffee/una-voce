import { socialDesigns } from './designs.js';

const parameters = new URLSearchParams(window.location.search);
const designId = parameters.get('design');
const slideNumber = Number(parameters.get('slide') ?? '1');
const artboard = document.querySelector('[data-export-artboard]');
const design = socialDesigns.find((item) => item.id === designId);
const slideIndex = Number.isFinite(slideNumber) ? slideNumber - 1 : 0;
const slide = design?.slides?.[slideIndex];

if (!design || !slide) {
  artboard.innerHTML = '<div class="export-error">The requested social artwork could not be found.</div>';
  document.documentElement.dataset.exportState = 'error';
} else {
  artboard.innerHTML = slide.html;
  document.title = `${design.number} ${design.title} ${slideIndex + 1}`;
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  document.documentElement.dataset.exportState = 'ready';
}
