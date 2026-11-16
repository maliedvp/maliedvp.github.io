// Venn diagram in the About section: the circle under the pointer is moved to the end of its group, so the whole
// circle, enlarged and highlighted (css/styles.css, .venn-circle:hover), is drawn on top of the other two.
// While the pointer stays inside it, that circle remains on top, also over the overlaps.
document.querySelectorAll('.venn-circles').forEach((group) => {
  group.addEventListener('pointerover', (event) => {
    const circle = event.target.closest('.venn-circle');
    if (circle && circle !== group.lastElementChild) group.append(circle);
  });
});
