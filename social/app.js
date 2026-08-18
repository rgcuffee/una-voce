import { socialDesigns } from './designs.js';

const parameters = new URLSearchParams(window.location.search);
const designGrid = document.querySelector('[data-design-grid]');
const emptyState = document.querySelector('[data-empty-state]');
const collectionCount = document.querySelector('[data-collection-count]');
const viewButtons = [...document.querySelectorAll('[data-set-view]')];
const dialog = document.querySelector('[data-preview-dialog]');
const previewTitle = document.querySelector('[data-preview-title]');
const previewLabel = document.querySelector('[data-preview-label]');
const previewCanvas = document.querySelector('[data-preview-canvas]');
const previewCrop = document.querySelector('[data-preview-crop]');
const previewPosition = document.querySelector('[data-preview-position]');
const previewDots = document.querySelector('[data-preview-dots]');
const previewCaption = document.querySelector('[data-preview-caption]');
const modalViewButtons = [...document.querySelectorAll('[data-modal-view]')];

let activeDesign = null;
let activeSlideIndex = 0;

function updatePreviewUrl() {
  const nextUrl = new URL(window.location.href);
  if (activeDesign) {
    nextUrl.searchParams.set('design', activeDesign.id);
    nextUrl.searchParams.set('slide', String(activeSlideIndex + 1));
  } else {
    nextUrl.searchParams.delete('design');
    nextUrl.searchParams.delete('slide');
  }
  window.history.replaceState({}, '', nextUrl);
}

function setPressed(buttons, activeButton) {
  buttons.forEach((button) => {
    const isActive = button === activeButton;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function setCollectionView(view) {
  const resolvedView = view === 'grid' ? 'grid' : 'covers';
  document.body.dataset.view = resolvedView;
  const activeButton = viewButtons.find((button) => button.dataset.setView === resolvedView);
  if (activeButton) setPressed(viewButtons, activeButton);

  const nextUrl = new URL(window.location.href);
  if (resolvedView === 'grid') nextUrl.searchParams.set('view', 'grid');
  else nextUrl.searchParams.delete('view');
  window.history.replaceState({}, '', nextUrl);
}

function setModalView(view) {
  const resolvedView = view === 'grid' ? 'grid' : 'covers';
  previewCrop.dataset.view = resolvedView;
  const activeButton = modalViewButtons.find((button) => button.dataset.modalView === resolvedView);
  if (activeButton) setPressed(modalViewButtons, activeButton);
}

function designCard(design) {
  const card = document.createElement('article');
  card.className = 'mockup-card';
  card.tabIndex = 0;
  card.dataset.designId = design.id;

  const viewport = document.createElement('div');
  viewport.className = 'post-viewport';
  const artwork = document.createElement('div');
  artwork.className = 'post';
  artwork.innerHTML = design.slides?.[0]?.html ?? '';
  viewport.append(artwork);

  const caption = document.createElement('footer');
  caption.className = 'mockup-caption';
  const title = document.createElement('strong');
  title.textContent = `${design.number ?? ''}${design.number ? ' · ' : ''}${design.title}`;
  const meta = document.createElement('span');
  meta.textContent = `${design.label ?? 'Social post'} · ${design.slides?.length ?? 0} slide${design.slides?.length === 1 ? '' : 's'}`;
  caption.append(title, meta);
  card.append(viewport, caption);

  card.addEventListener('click', () => openPreview(design.id));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPreview(design.id);
    }
  });

  return card;
}

function renderCollection() {
  const instagramOrder = [...socialDesigns].sort(
    (a, b) => Number(b.number) - Number(a.number),
  );
  designGrid.replaceChildren(...instagramOrder.map(designCard));
  emptyState.hidden = socialDesigns.length > 0;
  designGrid.hidden = socialDesigns.length === 0;
  collectionCount.textContent = socialDesigns.length
    ? `Instagram order · ${instagramOrder[0].number} → ${instagramOrder.at(-1).number}`
    : '0 designs';
}

function renderActiveSlide() {
  if (!activeDesign) return;

  const slides = activeDesign.slides ?? [];
  const slide = slides[activeSlideIndex];
  if (!slide) return;

  previewCanvas.innerHTML = slide.html ?? '';
  previewPosition.textContent = `Slide ${activeSlideIndex + 1} of ${slides.length}`;
  previewDots.replaceChildren(
    ...slides.map((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = index === activeSlideIndex ? 'is-active' : '';
      button.setAttribute('aria-label', `Show ${item.label ?? `slide ${index + 1}`}`);
      button.addEventListener('click', () => {
        activeSlideIndex = index;
        renderActiveSlide();
        updatePreviewUrl();
      });
      return button;
    }),
  );
}

function renderCaption(caption) {
  const content = caption ?? 'Caption copy has not been added yet.';
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  const nodes = parts.filter(Boolean).map((part) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const strong = document.createElement('strong');
      strong.textContent = part.slice(2, -2);
      return strong;
    }
    return document.createTextNode(part);
  });
  previewCaption.replaceChildren(...nodes);
}

function openPreview(designId, slideIndex = 0) {
  const design = socialDesigns.find((item) => item.id === designId);
  if (!design || !design.slides?.length) return;

  activeDesign = design;
  activeSlideIndex = Math.max(0, Math.min(slideIndex, design.slides.length - 1));
  previewTitle.textContent = design.title;
  previewLabel.textContent = `${design.number ? `Design ${design.number}` : 'Design'} · ${design.label ?? 'Social post'}`;
  renderCaption(design.caption);
  setModalView('covers');
  renderActiveSlide();
  dialog.showModal();
  updatePreviewUrl();
}

function moveSlide(direction) {
  if (!activeDesign?.slides?.length) return;
  activeSlideIndex = (activeSlideIndex + direction + activeDesign.slides.length) % activeDesign.slides.length;
  renderActiveSlide();
  updatePreviewUrl();
}

function closePreview() {
  dialog.close();
}

function openLinkedDesign() {
  const designId = parameters.get('design');
  const slide = Number(parameters.get('slide') ?? '1') - 1;
  if (designId) openPreview(designId, Number.isFinite(slide) ? slide : 0);
}

viewButtons.forEach((button) => {
  button.addEventListener('click', () => setCollectionView(button.dataset.setView));
});

modalViewButtons.forEach((button) => {
  button.addEventListener('click', () => setModalView(button.dataset.modalView));
});

document.querySelector('[data-preview-close]').addEventListener('click', closePreview);
document.querySelector('[data-preview-previous]').addEventListener('click', () => moveSlide(-1));
document.querySelector('[data-preview-next]').addEventListener('click', () => moveSlide(1));

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closePreview();
});

dialog.addEventListener('close', () => {
  activeDesign = null;
  activeSlideIndex = 0;
  updatePreviewUrl();
});

document.addEventListener('keydown', (event) => {
  if (!dialog.open) return;
  if (event.key === 'ArrowLeft') moveSlide(-1);
  if (event.key === 'ArrowRight') moveSlide(1);
});

setCollectionView(parameters.get('view'));
renderCollection();
openLinkedDesign();
