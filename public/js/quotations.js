let quotationCounter = 0;

function addTireToQuotation(tireType) {
  const selectId = tireType === 'new' ? 'newTireSelector' : 'usedTireSelector';
  const select = document.getElementById(selectId);
  const selected = select.options[select.selectedIndex];
  const value = selected.value;

  if (!value) return;

  const [type, id] = value.split('-');
  const brand = selected.getAttribute('data-brand');
  const size = selected.getAttribute('data-description');
  const price = parseFloat(selected.getAttribute('data-price')).toFixed(2);
  const weight = parseFloat(selected.getAttribute('data-weight')) || 0;
  const stock = selected.getAttribute('data-stock');

  const table = document.getElementById('quotation-items').querySelector('tbody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${brand}</td>
    <td>${size}</td>
    <td>
      <input type="number" name="items[${quotationCounter}][quantity]" value="1" min="1" max="${stock}"
             class="quantity-input" onchange="updateSubtotal(this)">
    </td>
    <td>
      <span class="weight-display">${weight.toFixed(2)} kg</span>
      <input type="hidden" class="weight-input" value="${weight.toFixed(2)}">
      <input type="hidden" name="items[${quotationCounter}][weight]" value="${weight.toFixed(2)}">
    </td>

    <td>
      <input type="number" name="items[${quotationCounter}][unitPrice]" value="${price}" step="0.01"
             class="price-input" readonly>
    </td>
    <td>
      <span class="subtotal">$${price}</span>
    </td>
    <td>
      <input type="hidden" name="items[${quotationCounter}][tireType]" value="${type}">
      <input type="hidden" name="items[${quotationCounter}][tireId]" value="${id}">
      <button type="button" onclick="removeRow(this)">❌</button>
    </td>
  `;

  table.appendChild(row);
  quotationCounter++;
  updateTotal();
  select.selectedIndex = 0;
}

function updateSubtotal(input) {
  const row = input.closest('tr');
  const quantity = parseInt(input.value) || 0;
  const price = parseFloat(row.querySelector('.price-input').value) || 0;
  const weightPerItem = parseFloat(row.querySelector('.weight-input').value) || 0;

  const subtotal = (quantity * price).toFixed(2);
  const totalWeight = (quantity * weightPerItem).toFixed(2);

  row.querySelector('.subtotal').textContent = `$${subtotal}`;
  row.querySelector('.weight-display').textContent = `${totalWeight} kg`;

  updateTotal();
}

function removeRow(button) {
  const row = button.closest('tr');
  row.remove();
  updateTotal();
}

function updateTotal() {
  const rows = document.querySelectorAll('#quotation-items tbody tr');
  let subtotal = 0;
  let totalQuantity = 0;
  let totalWeight = 0;

  rows.forEach(row => {
    const quantity = parseInt(row.querySelector('.quantity-input').value) || 0;
    const unitPrice = parseFloat(row.querySelector('.price-input').value) || 0;
    const weightPerItem = parseFloat(row.querySelector('.weight-input').value) || 0;

    subtotal += quantity * unitPrice;
    totalQuantity += quantity;
    totalWeight += quantity * weightPerItem;
  });

  // Mostrar subtotal monetario
  document.getElementById('quotation-subtotal').textContent = `$${subtotal.toFixed(2)}`;

  // Mostrar total de llantas (si quieres)
  const quantityDisplay = document.getElementById('total-quantity');
  if (quantityDisplay) {
    quantityDisplay.textContent = `${totalQuantity} llantas`;
  }

  // Mostrar peso total
  document.getElementById('total-weight').textContent = `${totalWeight.toFixed(2)} kg`;

  // Obtener valores adicionales
  const traspaso = parseFloat(document.getElementById('traspaso')?.value) || 0;
  const cbm = parseFloat(document.getElementById('cbm')?.value) || 0;

  // Mostrar valores
  document.getElementById('traspaso-display').textContent = `$${traspaso.toFixed(2)}`;
  document.getElementById('cbm-display').textContent = `$${cbm.toFixed(2)}`;

  // Mostrar total final
  const totalFinal = subtotal + traspaso + cbm;
  document.getElementById('total-final').textContent = `$${totalFinal.toFixed(2)}`;
}

// Detectar cambios en traspaso y shipping
document.addEventListener('DOMContentLoaded', function () {
  const traspasoInput = document.getElementById('traspaso');
  const cbmInput = document.getElementById('cbm');

  if (traspasoInput) {
    traspasoInput.addEventListener('input', updateTotal);
  }

  if (cbmInput) {
    cbmInput.addEventListener('input', updateTotal);
  }
});