function positionJournalTimelineOnLatestEvent() {
  const track = document.querySelector<HTMLElement>('.journal-priority-timeline');
  if (!track || track.dataset.initialLatestPositioned === 'true') return;

  const activeCard = track.querySelector<HTMLElement>('.journal-priority-timeline__card.is-active');
  if (!activeCard) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      track.scrollTo({
        left: Math.max(0, track.scrollWidth - track.clientWidth),
        behavior: 'auto',
      });
      track.dataset.initialLatestPositioned = 'true';
    });
  });
}

const observer = new MutationObserver(positionJournalTimelineOnLatestEvent);
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

window.addEventListener('load', positionJournalTimelineOnLatestEvent, { once: true });
positionJournalTimelineOnLatestEvent();
