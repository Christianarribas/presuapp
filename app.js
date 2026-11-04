/* ============================================================
   PresuApp - Lógica de la aplicación
   Índice:
     1. Datos y almacenamiento (localStorage)
     2. Utilidades (precios, totales, números de presupuesto)
     3. Navegación entre vistas
     4. Vista Inicio: resumen y lista de presupuestos
     5. Vista Clientes: añadir, editar, listar y borrar
     6. Vista Presupuesto: crear uno nuevo o editar uno guardado
     7. Vista Detalle: hoja PDF, estados, enviar y eliminar
     8. Vista Ajustes: datos de la empresa
     9. Autocomprobación (?test=1)
    10. Arranque de la aplicación
   ============================================================ */

/* ===== 1. Datos y almacenamiento =====
   Todo se guarda en localStorage: un espacio del navegador
   que conserva los datos aunque se cierre la página.
   Si localStorage no está disponible (modo raro del navegador),
   se usa una variable en memoria como respaldo temporal. */
const CLAVE = "presuapp_datos";
let respaldoMemoria = null;

/* Datos de ejemplo con los que arranca la app la primera vez.
   Son claramente de demostración y se pueden borrar. */
function datosDeEjemplo() {
  return {
    clientes: [
      { id: "c1", nombre: "Cliente de ejemplo 1", contacto: "" },
      { id: "c2", nombre: "Cliente de ejemplo 2", contacto: "" },
      { id: "c3", nombre: "Cliente de ejemplo 3", contacto: "" },
      { id: "c4", nombre: "Cliente de ejemplo 4", contacto: "" }
    ],
    presupuestos: [
      { id: "p4", numero: "2026-015", fecha: "2026-11-04", clienteId: "c2", clienteNombre: "Cliente de ejemplo 2",
        partidas: [
          { concepto: "Panel LED 60x60", tipo: "material", cantidad: 6, precio: 35 },
          { concepto: "Mano de obra instalación", tipo: "servicio", cantidad: 4, precio: 30 },
          { concepto: "Desmontaje luminarias antiguas", tipo: "servicio", cantidad: 2, precio: 25 }
        ], iva: 21, estado: "pendiente" },
      { id: "p3", numero: "2026-016", fecha: "2026-11-02", clienteId: "c3", clienteNombre: "Cliente de ejemplo 3",
        partidas: [ { concepto: "Mantenimiento jardín (mes)", tipo: "servicio", cantidad: 1, precio: 300 } ],
        iva: 21, estado: "pendiente" },
      { id: "p2", numero: "2026-014", fecha: "2026-10-30", clienteId: "c1", clienteNombre: "Cliente de ejemplo 1",
        partidas: [
          { concepto: "Pintura plástica blanca", tipo: "material", cantidad: 8, precio: 35 },
          { concepto: "Mano de obra pintura", tipo: "servicio", cantidad: 23, precio: 40 }
        ], iva: 21, estado: "aceptado" },
      { id: "p1", numero: "2026-013", fecha: "2026-10-28", clienteId: "c4", clienteNombre: "Cliente de ejemplo 4",
        partidas: [ { concepto: "Reparación grifo cocina", tipo: "servicio", cantidad: 1, precio: 95 } ],
        iva: 21, estado: "rechazado" }
    ],
    siguienteNumero: 17,
    empresa: { nombre: "", direccion: "", nif: "", validez: "Presupuesto válido durante 30 días." }
  };
}

function cargarDatos() {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (texto) return JSON.parse(texto);
  } catch (error) {
    // localStorage no disponible: seguimos con el respaldo en memoria
  }
  return respaldoMemoria;
}

function guardarDatos() {
  respaldoMemoria = datos;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch (error) {
    // Sin localStorage los datos duran solo mientras la página esté abierta
  }
}

/* Comprueba de verdad si el navegador deja guardar: escribe y borra
   un valor de prueba. Si falla, la app funciona pero avisa de que los
   datos se perderán al cerrar. */
function comprobarPersistencia() {
  try {
    localStorage.setItem("presuapp_comprobacion", "1");
    localStorage.removeItem("presuapp_comprobacion");
    return true;
  } catch (error) {
    return false;
  }
}
const hayPersistencia = comprobarPersistencia();

/* La primera vez no hay nada guardado: se cargan los datos de ejemplo */
let datos = cargarDatos();
if (!datos) {
  datos = datosDeEjemplo();
  guardarDatos();
}

if (!hayPersistencia) {
  document.getElementById("aviso-sin-guardado").style.display = "block";
}

/* ===== 2. Utilidades ===== */

/* Formatea un número como precio en euros: 459.8 → "459,80 €" */
function formatoEuros(cantidad) {
  return cantidad.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

/* Calcula base, IVA y total de una lista de partidas */
function calcularTotales(partidas, porcentajeIva) {
  const base = partidas.reduce((suma, p) => suma + p.cantidad * p.precio, 0);
  const iva = base * porcentajeIva / 100;
  return { base: base, iva: iva, total: base + iva };
}

function totalPresupuesto(p) {
  return calcularTotales(p.partidas, p.iva).total;
}

/* Genera el siguiente número de presupuesto, p. ej. "2026-017" */
function nuevoNumero() {
  const anio = new Date().getFullYear();
  const numero = anio + "-" + String(datos.siguienteNumero).padStart(3, "0");
  datos.siguienteNumero++;
  return numero;
}

/* Fecha de hoy en formato ISO (aaaa-mm-dd), para el campo de fecha */
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

/* Fecha legible: "2026-11-04" → "04/11/2026" */
function fechaBonita(iso) {
  const partes = iso.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

/* ===== 3. Navegación entre vistas =====
   La vista inicial puede llegar en la dirección: ?vista=clientes
   Los enlaces del menú cambian de vista sin recargar la página. */
let presupuestoActual = null; // el presupuesto abierto en la vista detalle

function mostrarVista(nombre) {
  document.querySelectorAll(".vista").forEach(v => v.classList.remove("activa"));
  const vista = document.getElementById("vista-" + nombre);
  if (vista) vista.classList.add("activa");

  document.querySelectorAll("nav a").forEach(enlace => {
    enlace.classList.toggle("activo", enlace.dataset.vista === nombre);
  });

  // Al entrar en "nuevo" hay que tener el selector de clientes al día
  if (nombre === "nuevo") prepararFormulario();
}

/* Los enlaces del menú no recargan la página: cambian la vista aquí */
document.querySelectorAll("nav a").forEach(enlace => {
  enlace.addEventListener("click", evento => {
    evento.preventDefault();
    // Entrar en «Nuevo» desde el menú siempre es crear uno nuevo:
    // se abandona cualquier edición que estuviera a medias
    if (enlace.dataset.vista === "nuevo") editandoPresupuestoId = null;
    mostrarVista(enlace.dataset.vista);
  });
});

/* ===== 4. Vista Inicio ===== */
function pintarInicio() {
  const lista = document.getElementById("lista-presupuestos");

  // Un presupuesto por elemento; el texto del trabajo es la primera partida
  lista.innerHTML = datos.presupuestos.map(p => `
    <li>
      <a class="item-presupuesto" data-id="${p.id}">
        <span class="cliente">${p.clienteNombre}</span>
        <span class="importe">${formatoEuros(totalPresupuesto(p))}</span>
        <span class="trabajo">${p.numero} · ${p.partidas[0] ? p.partidas[0].concepto : "Sin partidas"}</span>
        <span class="estado ${p.estado}">${p.estado}</span>
      </a>
    </li>
  `).join("");

  // Tocar un presupuesto abre su detalle
  lista.querySelectorAll(".item-presupuesto").forEach(item => {
    item.addEventListener("click", () => {
      presupuestoActual = datos.presupuestos.find(p => p.id === item.dataset.id);
      pintarDetalle();
      mostrarVista("detalle");
    });
  });

  // La lista vacía muestra un mensaje en vez de quedarse en blanco
  document.getElementById("vacio-presupuestos").style.display =
    datos.presupuestos.length === 0 ? "block" : "none";

  // Tarjetas de resumen, calculadas a partir de los datos reales
  const pendientes = datos.presupuestos.filter(p => p.estado === "pendiente").length;
  const aceptados = datos.presupuestos.filter(p => p.estado === "aceptado");
  const importeAceptado = aceptados.reduce((suma, p) => suma + totalPresupuesto(p), 0);

  document.getElementById("total-pendientes").textContent = pendientes;
  document.getElementById("total-aceptados").textContent = aceptados.length;
  document.getElementById("total-mes").textContent = formatoEuros(importeAceptado);
}

/* ===== 5. Vista Clientes ===== */
function pintarClientes() {
  const lista = document.getElementById("lista-clientes");

  lista.innerHTML = datos.clientes.map((c, i) => `
    <li class="item-cliente">
      <span class="avatar">${i + 1}</span>
      <div>
        <div class="nombre">${c.nombre}</div>
        <div class="dato">${c.contacto || "Sin contacto guardado"}</div>
      </div>
      <button type="button" class="editar-cliente" data-id="${c.id}" title="Editar cliente">✎</button>
      <button type="button" class="borrar-cliente" data-id="${c.id}" title="Borrar cliente">✕</button>
    </li>
  `).join("");

  lista.querySelectorAll(".borrar-cliente").forEach(boton => {
    boton.addEventListener("click", () => {
      const cliente = datos.clientes.find(c => c.id === boton.dataset.id);
      if (confirm("¿Borrar a «" + cliente.nombre + "»? Sus presupuestos ya creados no se tocan.")) {
        datos.clientes = datos.clientes.filter(c => c.id !== boton.dataset.id);
        guardarDatos();
        pintarClientes();
      }
    });
  });

  lista.querySelectorAll(".editar-cliente").forEach(boton => {
    boton.addEventListener("click", () => empezarEdicionCliente(boton.dataset.id));
  });

  document.getElementById("vacio-clientes").style.display =
    datos.clientes.length === 0 ? "block" : "none";
}

/* --- Editar un cliente ---
   El lápiz de una ficha rellena el formulario con sus datos; al
   guardar se actualiza esa ficha en vez de crear un cliente nuevo. */
let editandoClienteId = null; // id del cliente que se está editando, o null

function empezarEdicionCliente(id) {
  const cliente = datos.clientes.find(c => c.id === id);
  if (!cliente) return;
  editandoClienteId = id;
  document.getElementById("nuevo-cliente-nombre").value = cliente.nombre;
  document.getElementById("nuevo-cliente-contacto").value = cliente.contacto;
  document.getElementById("boton-guardar-cliente").textContent = "Guardar cambios";
  document.getElementById("boton-cancelar-cliente").hidden = false;
  document.getElementById("nuevo-cliente-nombre").focus();
}

/* Sale del modo edición y deja el formulario listo para añadir */
function salirEdicionCliente() {
  editandoClienteId = null;
  document.getElementById("formulario-cliente").reset();
  document.getElementById("boton-guardar-cliente").textContent = "Añadir cliente";
  document.getElementById("boton-cancelar-cliente").hidden = true;
}

document.getElementById("boton-cancelar-cliente").addEventListener("click", salirEdicionCliente);

/* Guardar el formulario de cliente: crea uno nuevo o actualiza el
   que se está editando */
document.getElementById("formulario-cliente").addEventListener("submit", evento => {
  evento.preventDefault();
  const nombre = document.getElementById("nuevo-cliente-nombre").value.trim();
  const contacto = document.getElementById("nuevo-cliente-contacto").value.trim();
  if (!nombre) return;

  if (editandoClienteId) {
    // Edición: solo se actualiza la ficha. Los presupuestos ya creados
    // conservan el nombre con el que se hicieron (copia histórica);
    // para cambiarlo en uno concreto se edita ese presupuesto
    const cliente = datos.clientes.find(c => c.id === editandoClienteId);
    if (cliente) {
      cliente.nombre = nombre;
      cliente.contacto = contacto;
      guardarDatos();
    }
    salirEdicionCliente();
    pintarClientes();
    return;
  }

  datos.clientes.push({
    id: "c" + Date.now(), // id único a partir de la hora actual
    nombre: nombre,
    contacto: contacto
  });
  guardarDatos();
  evento.target.reset();
  pintarClientes();
});

/* ===== 6. Vista Presupuesto: nuevo y editar =====
   El mismo formulario sirve para crear un presupuesto nuevo y para
   editar uno guardado. Cuando editandoPresupuestoId tiene un id, el
   formulario trabaja sobre ese presupuesto; cuando es null, crea uno. */
let editandoPresupuestoId = null; // id del presupuesto que se edita, o null

/* Crea una fila de partida en el formulario. Si recibe una partida
   guardada (al editar), la fila nace rellena con sus datos. */
function anadirFilaPartida(partida) {
  const contenedor = document.getElementById("partidas");
  const fila = document.createElement("div");
  fila.className = "partida";
  fila.innerHTML = `
    <input type="text" class="concepto" placeholder="Concepto (ej. Mano de obra)">
    <select class="tipo">
      <option value="servicio">Servicio</option>
      <option value="material">Material</option>
    </select>
    <input type="number" class="cantidad" value="1" min="0" step="0.01">
    <input type="number" class="precio" value="0" min="0" step="0.01">
    <span class="subtotal">0,00 €</span>
    <button type="button" class="quitar-partida" title="Quitar partida">✕</button>
  `;
  contenedor.appendChild(fila);

  if (partida) {
    fila.querySelector(".concepto").value = partida.concepto;
    fila.querySelector(".tipo").value = partida.tipo;
    fila.querySelector(".cantidad").value = partida.cantidad;
    fila.querySelector(".precio").value = partida.precio;
  }
}

/* Lee las filas del formulario y devuelve las partidas con datos */
function leerPartidasDelFormulario() {
  const partidas = [];
  document.querySelectorAll("#partidas .partida").forEach(fila => {
    const concepto = fila.querySelector(".concepto").value.trim();
    const cantidad = parseFloat(fila.querySelector(".cantidad").value) || 0;
    const precio = parseFloat(fila.querySelector(".precio").value) || 0;
    if (concepto) {
      partidas.push({
        concepto: concepto,
        tipo: fila.querySelector(".tipo").value,
        cantidad: cantidad,
        precio: precio
      });
    }
  });
  return partidas;
}

/* Recalcula subtotales de cada fila y el total del formulario */
function recalcularFormulario() {
  let base = 0;
  document.querySelectorAll("#partidas .partida").forEach(fila => {
    const cantidad = parseFloat(fila.querySelector(".cantidad").value) || 0;
    const precio = parseFloat(fila.querySelector(".precio").value) || 0;
    const subtotal = cantidad * precio;
    fila.querySelector(".subtotal").textContent = formatoEuros(subtotal);
    base += subtotal;
  });

  const porcentajeIva = parseFloat(document.getElementById("campo-iva").value) || 0;
  const iva = base * porcentajeIva / 100;

  document.getElementById("base-form").textContent = formatoEuros(base);
  document.getElementById("iva-form").textContent = formatoEuros(iva) + " (" + porcentajeIva + " %)";
  document.getElementById("total-form").textContent = formatoEuros(base + iva);
}

/* Prepara el formulario. En modo nuevo: clientes al día, fecha de hoy
   y una fila vacía. En modo edición: todo relleno con lo que tiene
   guardado el presupuesto que se está editando. */
function prepararFormulario() {
  const selector = document.getElementById("campo-cliente");
  selector.innerHTML = datos.clientes
    .map(c => `<option value="${c.id}">${c.nombre}</option>`)
    .join("");

  const editando = editandoPresupuestoId
    ? datos.presupuestos.find(p => p.id === editandoPresupuestoId)
    : null;

  // Título, texto del botón y botón de cancelar según el modo
  document.getElementById("titulo-formulario").textContent =
    editando ? "Editar presupuesto " + editando.numero : "Nuevo presupuesto";
  document.getElementById("boton-guardar-presupuesto").textContent =
    editando ? "Guardar cambios" : "Guardar presupuesto";
  document.getElementById("boton-cancelar-edicion").hidden = !editando;

  document.getElementById("partidas").innerHTML = "";

  if (editando) {
    if (datos.clientes.some(c => c.id === editando.clienteId)) {
      selector.value = editando.clienteId;
    } else {
      // El cliente se borró de la lista: opción temporal con el nombre
      // guardado, para no reasignarlo a otro cliente por accidente
      const opcionBorrado = document.createElement("option");
      opcionBorrado.value = editando.clienteId;
      opcionBorrado.textContent = editando.clienteNombre + " (cliente borrado)";
      selector.appendChild(opcionBorrado);
      selector.value = editando.clienteId;
    }
    document.getElementById("campo-fecha").value = editando.fecha;
    editando.partidas.forEach(partida => anadirFilaPartida(partida));
    document.getElementById("campo-iva").value = editando.iva;
  } else {
    document.getElementById("campo-fecha").value = hoyISO();
    anadirFilaPartida();
  }
  recalcularFormulario();
}

/* Empieza la edición de un presupuesto: guarda su id y abre el
   formulario, que se rellena solo con sus datos */
function empezarEdicionPresupuesto(id) {
  editandoPresupuestoId = id;
  mostrarVista("nuevo");
}

/* Cancelar la edición: vuelve al detalle sin guardar ningún cambio */
document.getElementById("boton-cancelar-edicion").addEventListener("click", () => {
  editandoPresupuestoId = null;
  pintarDetalle();
  mostrarVista("detalle");
});

/* Botón "+ Añadir partida" */
document.getElementById("boton-anadir-partida").addEventListener("click", anadirFilaPartida);

/* Cualquier cambio en una partida o en el IVA recalcula los totales.
   Se escucha en el contenedor entero para cubrir las filas nuevas. */
document.getElementById("partidas").addEventListener("input", recalcularFormulario);
document.getElementById("campo-iva").addEventListener("input", recalcularFormulario);

/* El botón ✕ de una fila la quita (también con escucha en el contenedor) */
document.getElementById("partidas").addEventListener("click", evento => {
  if (evento.target.classList.contains("quitar-partida")) {
    evento.target.closest(".partida").remove();
    recalcularFormulario();
  }
});

/* Guardar el presupuesto: crea uno nuevo o actualiza el que se edita */
document.getElementById("formulario-nuevo").addEventListener("submit", evento => {
  evento.preventDefault();

  const clienteId = document.getElementById("campo-cliente").value;

  // Modo edición: se actualiza el presupuesto guardado conservando
  // su número, su estado y su sitio en la lista
  const existente = editandoPresupuestoId
    ? datos.presupuestos.find(p => p.id === editandoPresupuestoId)
    : null;

  let cliente = datos.clientes.find(c => c.id === clienteId);
  if (!cliente && existente && clienteId === existente.clienteId) {
    // Su cliente se borró de la lista y no se eligió otro:
    // se conservan el id y el nombre guardados en el presupuesto
    cliente = { id: existente.clienteId, nombre: existente.clienteNombre };
  }
  if (!cliente) {
    alert("Primero añade un cliente en la pantalla Clientes.");
    return;
  }

  const partidas = leerPartidasDelFormulario();
  if (partidas.length === 0) {
    alert("Añade al menos una partida con su concepto.");
    return;
  }

  editandoPresupuestoId = null;
  if (existente) {
    existente.fecha = document.getElementById("campo-fecha").value || hoyISO();
    existente.clienteId = cliente.id;
    existente.clienteNombre = cliente.nombre;
    existente.partidas = partidas;
    existente.iva = parseFloat(document.getElementById("campo-iva").value) || 0;
    guardarDatos();
    presupuestoActual = existente;
    pintarInicio();
    pintarDetalle();
    mostrarVista("detalle");
    return;
  }

  const presupuesto = {
    id: "p" + Date.now(),
    numero: nuevoNumero(),
    fecha: document.getElementById("campo-fecha").value || hoyISO(),
    clienteId: cliente.id,
    clienteNombre: cliente.nombre, // copia del nombre por si luego se borra el cliente
    partidas: partidas,
    iva: parseFloat(document.getElementById("campo-iva").value) || 0,
    estado: "pendiente"
  };

  datos.presupuestos.unshift(presupuesto); // los nuevos aparecen arriba
  guardarDatos();

  presupuestoActual = presupuesto;
  pintarInicio();
  pintarDetalle();
  mostrarVista("detalle");
});

/* ===== 7. Vista Detalle ===== */
function pintarDetalle() {
  const p = presupuestoActual;
  if (!p) return;

  const totales = calcularTotales(p.partidas, p.iva);
  const empresa = datos.empresa;
  const cliente = datos.clientes.find(c => c.id === p.clienteId);

  // Título y etiqueta de estado
  document.getElementById("detalle-titulo").textContent = "Presupuesto " + p.numero;
  const etiqueta = document.getElementById("detalle-estado");
  etiqueta.textContent = p.estado;
  etiqueta.className = "estado " + p.estado;

  // La hoja tipo PDF con los datos reales; si falta un dato de la
  // empresa se muestra un hueco marcado entre corchetes
  const hoja = document.getElementById("hoja-pdf");
  hoja.innerHTML = `
    <div class="pdf-cabecera">
      <div>
        <strong>${empresa.nombre || "[Nombre de tu empresa]"}</strong>
        <p>${empresa.direccion || "[Dirección]"}<br>${empresa.nif || "[NIF]"}</p>
      </div>
      <div class="pdf-numero">
        <strong>PRESUPUESTO</strong>
        <p>Nº ${p.numero}<br>${fechaBonita(p.fecha)}</p>
      </div>
    </div>

    <div class="pdf-cliente">
      <span>Cliente</span>
      <strong>${p.clienteNombre}</strong>
      <p>${cliente && cliente.contacto ? cliente.contacto : ""}</p>
    </div>

    <table class="pdf-tabla">
      <thead>
        <tr><th>Concepto</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr>
      </thead>
      <tbody>
        ${p.partidas.map(partida => `
          <tr>
            <td>${partida.concepto} (${partida.tipo})</td>
            <td>${partida.cantidad}</td>
            <td>${formatoEuros(partida.precio)}</td>
            <td>${formatoEuros(partida.cantidad * partida.precio)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="pdf-totales">
      <div><span>Base imponible</span><span>${formatoEuros(totales.base)}</span></div>
      <div><span>IVA (${p.iva} %)</span><span>${formatoEuros(totales.iva)}</span></div>
      <div class="total-final"><span>Total</span><span>${formatoEuros(totales.total)}</span></div>
    </div>

    <p class="pdf-validez">${empresa.validez || "Presupuesto válido durante 30 días."}</p>
  `;

  // Marcar en el selector el estado actual
  document.querySelectorAll("#selector-estado button").forEach(boton => {
    boton.classList.toggle("elegido", boton.dataset.estado === p.estado);
  });

  // El botón de enviar prepara un correo con el asunto y el texto.
  // Si el cliente no tiene correo guardado, el botón no se muestra.
  const botonEnviar = document.getElementById("boton-enviar");
  if (cliente && cliente.contacto.includes("@")) {
    const asunto = "Presupuesto " + p.numero;
    const cuerpo = "Hola,\n\nTe envío el presupuesto " + p.numero +
      " por un total de " + formatoEuros(totales.total) + ".\n\nUn saludo";
    botonEnviar.href = "mailto:" + cliente.contacto +
      "?subject=" + encodeURIComponent(asunto) +
      "&body=" + encodeURIComponent(cuerpo);
    botonEnviar.style.display = "";
  } else {
    botonEnviar.style.display = "none";
  }
}

/* Cambiar el estado desde los botones del detalle */
document.getElementById("selector-estado").addEventListener("click", evento => {
  const boton = evento.target.closest("button");
  if (!boton || !presupuestoActual) return;
  presupuestoActual.estado = boton.dataset.estado;
  guardarDatos();
  pintarDetalle();
  pintarInicio();
});

/* Descargar PDF: abre el diálogo de impresión, donde se elige
   "Guardar como PDF". Los estilos de impresión enseñan solo la hoja. */
document.getElementById("boton-pdf").addEventListener("click", () => {
  window.print();
});

/* Editar: carga el presupuesto en el formulario para cambiarlo */
document.getElementById("boton-editar").addEventListener("click", () => {
  if (!presupuestoActual) return;
  empezarEdicionPresupuesto(presupuestoActual.id);
});

/* Eliminar el presupuesto, con confirmación */
document.getElementById("boton-eliminar").addEventListener("click", () => {
  if (!presupuestoActual) return;
  if (confirm("¿Eliminar el presupuesto " + presupuestoActual.numero + "? No se puede deshacer.")) {
    datos.presupuestos = datos.presupuestos.filter(p => p.id !== presupuestoActual.id);
    guardarDatos();
    presupuestoActual = null;
    pintarInicio();
    mostrarVista("inicio");
  }
});

/* ===== 8. Vista Ajustes ===== */
function pintarAjustes() {
  document.getElementById("ajustes-nombre").value = datos.empresa.nombre;
  document.getElementById("ajustes-direccion").value = datos.empresa.direccion;
  document.getElementById("ajustes-nif").value = datos.empresa.nif;
  document.getElementById("ajustes-validez").value = datos.empresa.validez || "";
}

document.getElementById("formulario-ajustes").addEventListener("submit", evento => {
  evento.preventDefault();
  datos.empresa.nombre = document.getElementById("ajustes-nombre").value.trim();
  datos.empresa.direccion = document.getElementById("ajustes-direccion").value.trim();
  datos.empresa.nif = document.getElementById("ajustes-nif").value.trim();
  datos.empresa.validez = document.getElementById("ajustes-validez").value.trim();
  guardarDatos();
  alert("Ajustes guardados.");
});

/* ===== 9. Autocomprobación =====
   Abriendo la página con ?test=1 se ejecutan estas pruebas y el
   resultado aparece en la página. Sirve para comprobar que los
   cálculos y el guardado funcionan sin tener que probar a mano.
   Usa una clave distinta para no tocar los datos reales. */
function autocomprobacion() {
  const resultados = [];
  const prueba = (nombre, condicion) => resultados.push((condicion ? "OK" : "FALLO") + " " + nombre);

  // Prueba 1: cálculo de totales (380 de base + 21 % = 459,80)
  const t = calcularTotales([
    { concepto: "a", tipo: "material", cantidad: 6, precio: 35 },
    { concepto: "b", tipo: "servicio", cantidad: 4, precio: 30 },
    { concepto: "c", tipo: "servicio", cantidad: 2, precio: 25 }
  ], 21);
  prueba("totales", t.base === 380 && Math.abs(t.total - 459.80) < 0.001);

  // Prueba 2: guardar y cargar en localStorage con clave de prueba
  let guardadoOk = false;
  try {
    localStorage.setItem("presuapp_test", JSON.stringify({ valor: 42 }));
    guardadoOk = JSON.parse(localStorage.getItem("presuapp_test")).valor === 42;
    localStorage.removeItem("presuapp_test");
  } catch (error) {}
  prueba("guardar y cargar", guardadoOk);

  // Prueba 3: los números de presupuesto van subiendo
  const n1 = nuevoNumero();
  const n2 = nuevoNumero();
  datos.siguienteNumero -= 2; // se deshace para no gastar números reales
  prueba("numeración", n1 < n2);

  // Prueba 4: la lista de inicio pinta todos los presupuestos
  pintarInicio();
  prueba("pintar lista", document.querySelectorAll("#lista-presupuestos .item-presupuesto").length === datos.presupuestos.length);

  // Prueba 5: crear un cliente y un presupuesto usando los
  // formularios de verdad, como haría el usuario
  const clientesAntes = datos.clientes.length;
  const presupuestosAntes = datos.presupuestos.length;
  document.getElementById("nuevo-cliente-nombre").value = "Cliente de prueba";
  document.getElementById("nuevo-cliente-contacto").value = "prueba@email.es";
  document.getElementById("formulario-cliente").dispatchEvent(new Event("submit"));

  prepararFormulario();
  const selectorPrueba = document.getElementById("campo-cliente");
  selectorPrueba.value = selectorPrueba.options[selectorPrueba.options.length - 1].value;
  const fila = document.querySelector("#partidas .partida");
  fila.querySelector(".concepto").value = "Trabajo de prueba";
  fila.querySelector(".cantidad").value = "2";
  fila.querySelector(".precio").value = "50";
  document.getElementById("formulario-nuevo").dispatchEvent(new Event("submit"));

  const creadoOk = datos.clientes.length === clientesAntes + 1 &&
    datos.presupuestos.length === presupuestosAntes + 1 &&
    Math.abs(totalPresupuesto(datos.presupuestos[0]) - 121) < 0.001;
  prueba("crear cliente y presupuesto", creadoOk);

  // Prueba 6: cambiar el estado del presupuesto recién creado
  presupuestoActual = datos.presupuestos[0];
  pintarDetalle();
  document.querySelector('#selector-estado button[data-estado="aceptado"]').click();
  prueba("cambiar estado", datos.presupuestos[0].estado === "aceptado");

  // Prueba 7: editar el cliente actualiza solo su ficha, sin duplicarlo;
  // los presupuestos ya creados conservan el nombre con el que se hicieron
  const clientePrueba = datos.clientes[datos.clientes.length - 1];
  empezarEdicionCliente(clientePrueba.id);
  document.getElementById("nuevo-cliente-nombre").value = "Cliente corregido";
  document.getElementById("formulario-cliente").dispatchEvent(new Event("submit"));
  prueba("editar cliente", datos.clientes.length === clientesAntes + 1 &&
    datos.clientes[datos.clientes.length - 1].id === clientePrueba.id &&
    datos.clientes[datos.clientes.length - 1].nombre === "Cliente corregido" &&
    datos.presupuestos[0].clienteNombre === "Cliente de prueba");

  // Prueba 8: editar el presupuesto conserva número, estado y fecha, no
  // gasta numeración, recalcula el total (2 x 60 = 120, con IVA 21 %
  // = 145,20) y sí actualiza el nombre del cliente, porque se está
  // editando ese presupuesto a propósito
  const numeroAntes = datos.presupuestos[0].numero;
  const fechaAntes = datos.presupuestos[0].fecha;
  const numeracionAntes = datos.siguienteNumero;
  empezarEdicionPresupuesto(datos.presupuestos[0].id);
  // El campo de fecha guarda siempre el valor ISO (aaaa-mm-dd); cómo se
  // muestra por pantalla depende del idioma del navegador
  const fechaISOenFormulario = document.getElementById("campo-fecha").value === fechaAntes;
  const filaEditar = document.querySelector("#partidas .partida");
  filaEditar.querySelector(".precio").value = "60";
  document.getElementById("formulario-nuevo").dispatchEvent(new Event("submit"));
  prueba("editar presupuesto", datos.presupuestos.length === presupuestosAntes + 1 &&
    fechaISOenFormulario &&
    datos.presupuestos[0].fecha === fechaAntes &&
    datos.presupuestos[0].numero === numeroAntes &&
    datos.presupuestos[0].estado === "aceptado" &&
    datos.presupuestos[0].clienteNombre === "Cliente corregido" &&
    datos.siguienteNumero === numeracionAntes &&
    Math.abs(totalPresupuesto(datos.presupuestos[0]) - 145.20) < 0.001);

  // Prueba 9: editar un presupuesto cuyo cliente se borró conserva el
  // nombre guardado y no lo reasigna a otro cliente
  datos.clientes = datos.clientes.filter(c => c.id !== clientePrueba.id);
  empezarEdicionPresupuesto(datos.presupuestos[0].id);
  const selectorEdicion = document.getElementById("campo-cliente");
  const opcionMarcada = selectorEdicion.value === datos.presupuestos[0].clienteId &&
    selectorEdicion.options[selectorEdicion.selectedIndex].textContent.includes("(cliente borrado)");
  document.getElementById("formulario-nuevo").dispatchEvent(new Event("submit"));
  prueba("cliente borrado se conserva", opcionMarcada &&
    datos.presupuestos[0].clienteId === clientePrueba.id &&
    datos.presupuestos[0].clienteNombre === "Cliente corregido");
  datos.clientes.push(clientePrueba); // se repone para la limpieza final

  // Prueba 10: cancelar la edición de un cliente no cambia nada
  empezarEdicionCliente(clientePrueba.id);
  document.getElementById("nuevo-cliente-nombre").value = "Nombre que no se guarda";
  document.getElementById("boton-cancelar-cliente").click();
  prueba("cancelar edición", datos.clientes[datos.clientes.length - 1].nombre === "Cliente corregido" &&
    document.getElementById("boton-guardar-cliente").textContent === "Añadir cliente");

  // Limpieza: se borran los datos de las pruebas 5 a 10
  datos.presupuestos = datos.presupuestos.slice(1);
  datos.clientes = datos.clientes.slice(0, clientesAntes);
  datos.siguienteNumero--;
  guardarDatos();
  presupuestoActual = null;

  // Prueba 11: persistencia entre visitas (hay que recargar para verla)
  let marca = null;
  try { marca = localStorage.getItem("presuapp_marca_recarga"); } catch (error) {}
  if (marca === "puesta") {
    try { localStorage.removeItem("presuapp_marca_recarga"); } catch (error) {}
    prueba("persistencia entre visitas", true);
  } else {
    try { localStorage.setItem("presuapp_marca_recarga", "puesta"); } catch (error) {}
    resultados.push("PENDIENTE persistencia entre visitas (recarga con ?test=1 para comprobarla)");
  }

  // Prueba 12: la copia de seguridad exporta e importa sin perder datos
  const copiaTexto = generarCopiaJSON();
  const clientesOriginales = JSON.stringify(datos.clientes);
  aplicarCopia(leerCopiaJSON(copiaTexto));
  prueba("copia de seguridad", JSON.stringify(datos.clientes) === clientesOriginales);

  // Prueba 13: un archivo que no es una copia se rechaza sin tocar los datos
  let copiaRechazada = false;
  try { leerCopiaJSON("{\"otraCosa\": 1}"); } catch (error) { copiaRechazada = true; }
  prueba("copia rechaza archivo inválido", copiaRechazada && JSON.stringify(datos.clientes) === clientesOriginales);

  // Prueba 14: pluralización del resumen
  prueba("pluralización", plural(1, "cliente", "clientes") === "1 cliente" && plural(2, "cliente", "clientes") === "2 clientes");

  const caja = document.createElement("div");
  caja.id = "resultado-test";
  caja.textContent = "TEST: " + resultados.join(" | ");
  caja.style.cssText = "position:fixed;top:0;left:0;background:#000;color:#0f0;padding:4px;font-size:12px;z-index:99";
  document.body.appendChild(caja);
}


/* ===== Copia de seguridad: exportar e importar los datos en un archivo JSON ===== */

/* Convierte los datos actuales en el texto JSON de la copia */
function generarCopiaJSON() {
  return JSON.stringify({
    aplicacion: "PresuApp",
    version: 1,
    exportadoEl: new Date().toISOString(),
    datos: datos
  }, null, 2);
}

/* Exportar: descarga la copia como archivo .json */
function exportarDatos() {
  const blob = new Blob([generarCopiaJSON()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "presuapp-copia-" + hoyISO() + ".json";
  enlace.click();
  URL.revokeObjectURL(url);
}

/* "1 cliente", "2 clientes": elige la palabra según la cantidad */
function plural(cantidad, singular, plural) {
  return cantidad + " " + (cantidad === 1 ? singular : plural);
}

/* Lee y comprueba el texto de una copia. Si no es válido, lanza un
   error con el motivo; si lo es, devuelve los datos listos para usar
   SIN tocar todavía los datos actuales. */
function leerCopiaJSON(texto) {
  const paquete = JSON.parse(texto); // si no es JSON válido, aquí salta el error
  const nuevos = paquete.datos || paquete; // admite también los datos sueltos
  if (!nuevos || !Array.isArray(nuevos.clientes) || !Array.isArray(nuevos.presupuestos)) {
    throw new Error("Ese archivo no parece una copia de PresuApp.");
  }
  return {
    clientes: nuevos.clientes,
    presupuestos: nuevos.presupuestos,
    empresa: nuevos.empresa || { nombre: "", direccion: "", nif: "", validez: "Presupuesto válido durante 30 días." },
    siguienteNumero: nuevos.siguienteNumero || datos.siguienteNumero || 1
  };
}

/* Resumen legible de una copia: "3 clientes y 5 presupuestos" */
function resumenCopia(copia) {
  return plural(copia.clientes.length, "cliente", "clientes") +
    " y " + plural(copia.presupuestos.length, "presupuesto", "presupuestos");
}

/* Aplica una copia ya validada: reemplaza los datos y repinta la app */
function aplicarCopia(copia) {
  datos = copia;
  guardarDatos();
  pintarInicio();
  pintarClientes();
  pintarAjustes();
}

/* Importar: lee el archivo elegido y, DESPUÉS DE PEDIR CONFIRMACIÓN,
   reemplaza los datos actuales por los de la copia */
function importarDatos(archivo) {
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const copia = leerCopiaJSON(lector.result);
      const mensaje = "La copia trae " + resumenCopia(copia) +
        " y REEMPLAZARÁ los " + resumenCopia(datos) + " que hay ahora. ¿Importar?";
      if (confirm(mensaje)) {
        aplicarCopia(copia);
        alert("Copia importada: " + resumenCopia(copia) + ".");
      }
    } catch (error) {
      alert("No se pudo importar: " + error.message);
    }
  };
  lector.readAsText(archivo);
}

document.getElementById("boton-exportar").addEventListener("click", exportarDatos);
document.getElementById("boton-importar").addEventListener("click", () => {
  document.getElementById("archivo-importar").click();
});
document.getElementById("archivo-importar").addEventListener("change", evento => {
  const archivo = evento.target.files[0];
  if (archivo) importarDatos(archivo);
  evento.target.value = ""; // permite elegir el mismo archivo otra vez
});

/* ===== 10. Arranque ===== */
const parametros = new URLSearchParams(location.search);
const vistaInicial = parametros.get("vista") || "inicio";

pintarInicio();
pintarClientes();
pintarAjustes();

// Si se abre la vista detalle directamente (para capturas), se muestra
// el primer presupuesto de la lista
if (vistaInicial === "detalle" && datos.presupuestos.length > 0) {
  presupuestoActual = datos.presupuestos[0];
  pintarDetalle();
}

// Abrir con ?vista=editar carga el primer presupuesto en el formulario
// de edición (pensado para pruebas y capturas)
if (vistaInicial === "editar" && datos.presupuestos.length > 0) {
  empezarEdicionPresupuesto(datos.presupuestos[0].id);
} else {
  mostrarVista(vistaInicial);
}

if (parametros.get("test") === "1") autocomprobacion();
