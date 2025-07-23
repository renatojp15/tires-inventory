document.addEventListener('DOMContentLoaded', () => {
  const tireSelect = document.getElementById('tireSelect');
  const quantityInput = document.getElementById('quantity');
  const weightInput = document.getElementById('weight');
  const cbmInput = document.getElementById('cbm');
  const addButton = document.getElementById('addTireBtn');
  const tableBody = document.querySelector('#tireTable tbody');
  const totalQuantityDisplay = document.getElementById('totalQuantity');
  const totalWeightDisplay = document.getElementById('totalWeight');
  const totalCbmDisplay = document.getElementById('totalCbm');
  const tireInputsContainer = document.getElementById('tireInputsContainer');

  let totalQuantity = 0;
  let totalWeight = 0;
  let totalCbm = 0;

  function updateTotals() {
    totalQuantity = 0;
    totalWeight = 0;
    totalCbm = 0;

    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
      totalQuantity += parseInt(row.dataset.quantity);
      totalWeight += parseFloat(row.dataset.weight);
      totalCbm += parseFloat(row.dataset.cbm);
    });

    totalQuantityDisplay.textContent = totalQuantity;
    totalWeightDisplay.textContent = totalWeight.toFixed(2);
    totalCbmDisplay.textContent = totalCbm.toFixed(2);
  }

  function createHiddenInputs(index, tireId, type, quantity, weight, cbm) {
    // Crea inputs ocultos para enviar al backend
    const fragment = document.createDocumentFragment();

    const fields = { tireId, type, quantity, weight, cbm };
    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = `tires[${index}][${key}]`; // nombre como tires[0][tireId], etc
      input.value = value;
      fragment.appendChild(input);
    }
    return fragment;
  }

  addButton.addEventListener('click', (e) => {
    e.preventDefault();

    const selectedValue = tireSelect.value;
    if (!selectedValue) {
      alert('Por favor seleccione una llanta');
      return;
    }

    const [type, tireId] = selectedValue.split('-'); // ej: "new-5"
    const quantity = parseInt(quantityInput.value);
    const weight = parseFloat(weightInput.value);
    const cbm = parseFloat(cbmInput.value);

    if (!quantity || isNaN(weight) || isNaN(cbm)) {
      alert('Por favor complete todos los campos obligatorios correctamente.');
      return;
    }

    const totalItemWeight = weight * quantity;
    const totalItemCbm = cbm * quantity;

    const row = document.createElement('tr');
    row.dataset.quantity = quantity;
    row.dataset.weight = totalItemWeight;
    row.dataset.cbm = totalItemCbm;

    // Mostrar tipo capitalizado
    const typeText = type === 'new' ? 'Nueva' : 'Usada';

    // El texto visible de la llanta es el option seleccionado
    const tireText = tireSelect.options[tireSelect.selectedIndex].text;

    row.innerHTML = `
      <td>${tireText}</td>
      <td>${typeText}</td>
      <td>${quantity}</td>
      <td>${weight.toFixed(2)} kg</td>
      <td>${cbm.toFixed(2)} m³</td>
      <td><button type="button" class="delete-row">🗑️</button></td>
    `;

    // Agregar inputs ocultos para enviar los datos
    const currentIndex = tireInputsContainer.children.length / 5; // 5 inputs por ítem
    const hiddenInputs = createHiddenInputs(currentIndex, tireId, type, quantity, weight, cbm);
    tireInputsContainer.appendChild(hiddenInputs);

    tableBody.appendChild(row);
    updateTotals();

    // Limpiar inputs
    quantityInput.value = '';
    weightInput.value = '';
    cbmInput.value = '';
    tireSelect.selectedIndex = 0;
  });

  // Manejar borrar fila y eliminar inputs ocultos correspondientes
  tableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-row')) {
      const row = e.target.closest('tr');
      const index = Array.from(tableBody.children).indexOf(row);

      // Remover fila
      row.remove();

      // Remover inputs ocultos correspondientes (5 inputs por ítem)
      for (let i = 0; i < 5; i++) {
        const inputIndex = index * 5;
        if (tireInputsContainer.children[inputIndex]) {
          tireInputsContainer.children[inputIndex].remove();
        }
      }

      // Actualizar índices inputs ocultos restantes
      const inputs = Array.from(tireInputsContainer.children);
      for (let i = 0; i < inputs.length; i += 5) {
        const itemIndex = i / 5;
        for (let j = 0; j < 5; j++) {
          const input = inputs[i + j];
          const key = input.name.match(/\[(\w+)\]$/)[1];
          input.name = `tires[${itemIndex}][${key}]`;
        }
      }

      updateTotals();
    }
  });
});