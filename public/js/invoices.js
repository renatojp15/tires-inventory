document.addEventListener('DOMContentLoaded', function () {
  const toggles = document.querySelectorAll('.accordion-toggle');

  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
    });
  });
});

function toggleQuantity(checkbox) {
    const quantityInput = checkbox.closest('.tire-item').querySelector('.quantity-input');
    if (checkbox.checked) {
      quantityInput.disabled = false;
      quantityInput.focus();
    } else {
      quantityInput.disabled = true;
      quantityInput.value = '';
    }
  }