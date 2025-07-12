document.addEventListener('DOMContentLoaded', function () {
  const toggles = document.querySelectorAll('.accordion-toggle');

  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
    });
  });
});