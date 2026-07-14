function positionJournalTimelineOnLatestEvent() {
  const track = document.querySelector<HTMLElement>('.journey-timeline-track');
  if (!track || track.dataset.initialLatestPositioned === 'true') return;

  const activeCard = track.querySelector<HTMLElement>('button.is-active[data-journey-id]');
  if (!activeCard) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      track.scrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
      track.dataset.initialLatestPositioned = 'true';
    });
  });
}

const observer = new MutationObserver(positionJournalTimelineOnLatestEvent);
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

window.addEventListener('load', positionJournalTimelineOnLatestEvent, { once: true });
positionJournalTimelineOnLatestEvent();
