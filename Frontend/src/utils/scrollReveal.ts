// Aplica la clase "is-visible" a elementos .reveal-on-scroll cuando entran en viewport.
// Uso: useScrollReveal() dentro de un useEffect del screen, sin dependencias externas.
export function initScrollReveal(root: ParentNode = document): () => void {
  const targets = root.querySelectorAll<HTMLElement>('.reveal-on-scroll:not(.is-visible)');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}
