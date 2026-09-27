// =========================================================
// 1. CONFIGURACIÓN
// =========================================================
const MODO_DEMO  = true;                 // false = llama a tu API real
const API_LOGIN  = "/api/auth/login";    // endpoint de Express
const DESTINO_OK = "/tablero";           // ruta tras iniciar sesión

// Credenciales válidas SOLO en modo demo
const DEMO = { correo: "demo@passione.mx", contrasena: "MissionControl2026" };

// =========================================================
// 2. REFERENCIAS AL DOM
// =========================================================
const form       = document.getElementById("formLogin");
const inCorreo   = document.getElementById("correo");
const inClave    = document.getElementById("contrasena");
const alerta     = document.getElementById("alerta");
const boton      = document.getElementById("btnEntrar");
const spinner    = document.getElementById("spinner");
const textoBoton = document.getElementById("textoBoton");

const campos = {
  correo:     { input: inCorreo, grupo: document.getElementById("grupoCorreo"),     error: document.getElementById("errorCorreo") },
  contrasena: { input: inClave,  grupo: document.getElementById("grupoContrasena"), error: document.getElementById("errorContrasena") }
};

// =========================================================
// 3. VALIDACIÓN DEL LADO DEL CLIENTE
// =========================================================
function validar() {
  const errores = {};
  const correo = inCorreo.value.trim();

  if (correo === "")                       errores.correo = "Escribe tu correo institucional.";
  else if (inCorreo.validity.typeMismatch) errores.correo = "El correo no tiene un formato válido.";

  if (inClave.value === "")                errores.contrasena = "Escribe tu contraseña.";

  return errores;
}

// =========================================================
// 4. PINTAR / LIMPIAR ERRORES
// =========================================================
function mostrarErrorCampo(nombre, mensaje) {
  const c = campos[nombre];
  c.grupo.classList.add("campo--error");
  c.input.setAttribute("aria-invalid", "true");
  c.error.textContent = mensaje;
}

function limpiarErrorCampo(nombre) {
  const c = campos[nombre];
  c.grupo.classList.remove("campo--error");
  c.input.removeAttribute("aria-invalid");
  c.error.textContent = "";
}

function mostrarAlerta(mensaje, tipo = "error") {
  alerta.textContent = mensaje;
  alerta.classList.toggle("alerta--exito", tipo === "exito");
  alerta.hidden = false;
}

function ocultarAlerta() {
  alerta.hidden = true;
  alerta.textContent = "";
}

// =========================================================
// 5. ESTADO DE CARGA
// =========================================================
function setCargando(cargando) {
  boton.disabled         = cargando;
  spinner.hidden         = !cargando;
  textoBoton.textContent = cargando ? "Verificando…" : "Iniciar sesión";
  inCorreo.readOnly      = cargando;
  inClave.readOnly       = cargando;
  form.setAttribute("aria-busy", String(cargando));
}

// =========================================================
// 6. PETICIÓN DE INICIO DE SESIÓN
// =========================================================
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

async function iniciarSesion(correo, contrasena) {
  if (MODO_DEMO) {
    await esperar(900); // simula la latencia de red
    if (correo === DEMO.correo && contrasena === DEMO.contrasena) {
      return { usuario: { nombre: "Usuario demo", rol: "editor" } };
    }
    throw new Error("Correo o contraseña incorrectos.");
  }

  const respuesta = await fetch(API_LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",            // envía/recibe la cookie con el JWT
    body: JSON.stringify({ correo, contrasena })
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    if (respuesta.status === 401) throw new Error("Correo o contraseña incorrectos.");
    if (respuesta.status === 403) throw new Error("Tu cuenta no tiene un rol asignado. Contacta al administrador.");
    throw new Error(datos.mensaje || `El servidor respondió ${respuesta.status}. Intenta de nuevo.`);
  }
  return datos;
}

// =========================================================
// 7. ENVÍO DEL FORMULARIO
// =========================================================
form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  ocultarAlerta();
  Object.keys(campos).forEach(limpiarErrorCampo);

  const errores = validar();
  const nombresConError = Object.keys(errores);

  if (nombresConError.length > 0) {
    nombresConError.forEach((n) => mostrarErrorCampo(n, errores[n]));
    campos[nombresConError[0]].input.focus();
    return;
  }

  setCargando(true);
  try {
    const datos = await iniciarSesion(inCorreo.value.trim(), inClave.value);
    if (MODO_DEMO) {
      mostrarAlerta(`Sesión iniciada como ${datos.usuario.nombre} (${datos.usuario.rol}). En producción irías a ${DESTINO_OK}.`, "exito");
    } else {
      window.location.assign(DESTINO_OK);
    }
  } catch (error) {
    const mensaje = error instanceof TypeError
      ? "No hay conexión con el servidor. Revisa tu red."
      : error.message;
    mostrarAlerta(mensaje);
    inClave.value = "";
    inClave.focus();
  } finally {
    setCargando(false);
  }
});

// =========================================================
// 8. QUITAR EL ERROR EN CUANTO EL USUARIO CORRIGE
// =========================================================
Object.keys(campos).forEach((nombre) => {
  campos[nombre].input.addEventListener("input", () => limpiarErrorCampo(nombre));
});
