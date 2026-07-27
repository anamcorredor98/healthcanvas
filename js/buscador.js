// ===========================================================
// BUSCADOR DE PALABRAS — buscador.js
// Lógica del buscador de texto completo entre páginas.
// Requiere que indice-busqueda.js esté cargado antes que este
// archivo (define window.HC_INDICE_BUSQUEDA).
// ===========================================================

(function () {
  'use strict';

  var MIN_CARACTERES = 2;
  var HISTORIAL_KEY = 'hcBuscadorHistorial';
  var HISTORIAL_MAX_HORAS = 24;
  var HISTORIAL_MAX_ITEMS = 8;
  var ESTADO_KEY = 'hcBuscadorEstado';

  var indiceData = window.HC_INDICE_BUSQUEDA;
  if (!indiceData) return; // si no cargó el índice, no se activa el buscador

  var ORDEN = indiceData.orden;
  var PAGINAS = indiceData.paginas;

  // ── Utilidades de normalización de texto ────────────────────────────────

  // Para el conteo por página (coincide con la lógica del script Node).
  function normalizarNFD(texto) {
    return texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  // Para resaltar en el DOM en vivo: mapea 1 a 1 sin cambiar longitud,
  // así el índice de un match en el texto normalizado corresponde
  // exactamente al mismo índice en el texto original.
  var MAPA_TILDES = {
    á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u',
    Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ü: 'u'
  };
  function normalizarPreservandoLongitud(texto) {
    var out = '';
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      out += (MAPA_TILDES[c] || c.toLowerCase());
    }
    return out;
  }

  // Extrae las "palabras" (letras/números) de un texto ya normalizado.
  var PATRON_PALABRA = /[a-z0-9ñ]+/g;

  function extraerPalabras(textoNormalizado) {
    return textoNormalizado.match(PATRON_PALABRA) || [];
  }

  // Cuenta coincidencias por PALABRA (o frase de varias palabras), donde
  // cada palabra del texto debe EMPEZAR con la palabra correspondiente de
  // la búsqueda. Así "ana" encuentra "Ana" pero no "semana" (porque
  // "semana" no empieza con "ana"). Para frases ("no por un especialista")
  // exige que las palabras aparezcan seguidas, cada una como prefijo.
  function contarOcurrencias(textoNormalizado, queryNormalizada) {
    var palabrasTexto = extraerPalabras(textoNormalizado);
    var palabrasQuery = extraerPalabras(queryNormalizada);
    if (!palabrasQuery.length) return 0;

    var total = 0;
    for (var i = 0; i <= palabrasTexto.length - palabrasQuery.length; i++) {
      var coincide = true;
      for (var j = 0; j < palabrasQuery.length; j++) {
        if (palabrasTexto[i + j].indexOf(palabrasQuery[j]) !== 0) {
          coincide = false;
          break;
        }
      }
      if (coincide) total++;
    }
    return total;
  }

  function nombrePaginaActual() {
    var partes = window.location.pathname.split('/');
    var archivo = partes[partes.length - 1];
    if (!archivo || archivo === '') archivo = 'index.html';
    return archivo;
  }

  // ── Cálculo de posiciones globales entre páginas ────────────────────────

  function calcularConteos(queryNormalizada) {
    var conteos = {};
    var total = 0;
    ORDEN.forEach(function (pagina) {
      var texto = PAGINAS[pagina] || '';
      var c = contarOcurrencias(texto, queryNormalizada);
      conteos[pagina] = c;
      total += c;
    });
    return { conteos: conteos, total: total };
  }

  function globalAPaginaLocal(globalIndex, conteos) {
    var acumulado = 0;
    for (var i = 0; i < ORDEN.length; i++) {
      var pagina = ORDEN[i];
      var c = conteos[pagina] || 0;
      if (globalIndex <= acumulado + c) {
        return { pagina: pagina, local: globalIndex - acumulado };
      }
      acumulado += c;
    }
    return null;
  }

  function paginaLocalAGlobal(pagina, local, conteos) {
    var acumulado = 0;
    for (var i = 0; i < ORDEN.length; i++) {
      var p = ORDEN[i];
      if (p === pagina) return acumulado + local;
      acumulado += conteos[p] || 0;
    }
    return null;
  }

  // Encuentra el primer punto de partida: si la página actual tiene
  // coincidencias, empieza ahí. Si no, busca la próxima página con
  // coincidencias siguiendo el orden del sitio (con vuelta al inicio).
  function calcularInicio(conteos) {
    var actual = nombrePaginaActual();
    if ((conteos[actual] || 0) > 0) {
      return paginaLocalAGlobal(actual, 1, conteos);
    }
    var idxActual = ORDEN.indexOf(actual);
    if (idxActual === -1) idxActual = -1; // páginas no indexadas también pueden buscar
    for (var paso = 1; paso <= ORDEN.length; paso++) {
      var pagina = ORDEN[(idxActual + paso + ORDEN.length) % ORDEN.length];
      if ((conteos[pagina] || 0) > 0) {
        return paginaLocalAGlobal(pagina, 1, conteos);
      }
    }
    return null;
  }

  // ── Resaltado en el DOM en vivo ──────────────────────────────────────────

  function nodosDeTextoValidos() {
    var contenedor = document.body;
    var nodos = [];
    var walker = document.createTreeWalker(contenedor, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var padre = node.parentElement;
        if (!padre) return NodeFilter.FILTER_REJECT;
        if (padre.closest('nav, footer, script, style, noscript')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.textContent || !node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) nodos.push(n);
    return nodos;
  }

  // Si la coincidencia quedó dentro de un panel plegado (toggle/acordeón
  // cerrado), lo despliega para que el resaltado sea visible.
  function sincronizarBotonToggle(panelId) {
    var base = panelId.toLowerCase()
      .replace(/panel$/, '')
      .replace(/tabla$/, '')
      .replace(/opciones$/, '');
    if (!base) return;
    var botones = document.querySelectorAll('button[aria-expanded]');
    botones.forEach(function (btnToggle) {
      if (!btnToggle.id) return;
      var btnBase = btnToggle.id.toLowerCase().replace(/^toggle/, '').replace(/toggle$/, '');
      if (!btnBase) return;
      if (btnBase === base || panelId.toLowerCase().indexOf(btnBase) !== -1 || base.indexOf(btnBase) !== -1) {
        btnToggle.setAttribute('aria-expanded', 'true');
        btnToggle.classList.add('active');
      }
    });

    // Patrón "...Header" usado en servicios.html (toggleLogo/logoHeader/
    // logoOpciones): no es un <button>, así que también lo activamos.
    var cabecera = document.getElementById(base + 'Header');
    if (cabecera) cabecera.classList.add('active');
  }

  function abrirTogglesAncestros(elemento) {
    var el = elemento.parentElement;
    while (el && el !== document.body) {
      var seAbrio = false;
      if (el.hasAttribute('hidden')) {
        el.removeAttribute('hidden');
        seAbrio = true;
      }
      if (el.style && el.style.display === 'none') {
        // Los paneles "...Opciones" de servicios.html se abren con
        // display:flex (así lo hace su propio JS en main.js). Para el
        // resto, quitamos el inline style y dejamos que la hoja de
        // estilos decida su display normal.
        if (/opciones$/i.test(el.id || '')) {
          el.style.display = 'flex';
        } else {
          el.style.display = '';
        }
        seAbrio = true;
      }
      if (seAbrio && el.id) {
        sincronizarBotonToggle(el.id);
      }
      el = el.parentElement;
    }
  }

  function limpiarResaltado() {
    document.querySelectorAll('mark.hc-resaltado').forEach(function (mark) {
      var padre = mark.parentNode;
      if (!padre) return;
      padre.replaceChild(document.createTextNode(mark.textContent), mark);
      padre.normalize();
    });
  }

  // Construye la lista de "tokens" (palabras) de toda la página, en orden
  // del DOM, cada uno con referencia a su nodo de texto y su posición
  // dentro de ese nodo (sobre el texto normalizado, que conserva la
  // longitud exacta del texto original).
  function construirTokensDom() {
    var nodos = nodosDeTextoValidos();
    var tokens = [];
    nodos.forEach(function (nodo) {
      var textoNorm = normalizarPreservandoLongitud(nodo.textContent);
      var re = /[a-z0-9ñ]+/g;
      var m;
      while ((m = re.exec(textoNorm)) !== null) {
        tokens.push({ nodo: nodo, inicio: m.index, fin: m.index + m[0].length, texto: m[0] });
      }
    });
    return tokens;
  }

  // Resalta la n-ésima coincidencia (1-based) de la palabra o frase dentro
  // de esta página. Cada palabra de queryNormalizada debe ser prefijo de
  // la palabra correspondiente del texto (mismas reglas que el conteo).
  function resaltarOcurrenciaLocal(local, queryNormalizada) {
    limpiarResaltado();
    if (!queryNormalizada) return false;

    var palabrasQuery = extraerPalabras(queryNormalizada);
    if (!palabrasQuery.length) return false;

    var tokensDom = construirTokensDom();
    var restante = local;
    var inicioMatch = -1;

    for (var i = 0; i <= tokensDom.length - palabrasQuery.length; i++) {
      var coincide = true;
      for (var j = 0; j < palabrasQuery.length; j++) {
        if (tokensDom[i + j].texto.indexOf(palabrasQuery[j]) !== 0) {
          coincide = false;
          break;
        }
      }
      if (coincide) {
        restante--;
        if (restante === 0) {
          inicioMatch = i;
          break;
        }
      }
    }

    if (inicioMatch === -1) return false;

    var tokensMatch = tokensDom.slice(inicioMatch, inicioMatch + palabrasQuery.length);

    // Agrupar tokens consecutivos que caen en el mismo nodo de texto, para
    // resaltar la frase completa como un solo bloque cuando es posible
    // (y en bloques separados solo si de verdad está partida entre nodos).
    var grupos = [];
    tokensMatch.forEach(function (t) {
      var ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.nodo === t.nodo) {
        ultimo.fin = t.fin;
      } else {
        grupos.push({ nodo: t.nodo, inicio: t.inicio, fin: t.fin });
      }
    });

    var primerMark = null;
    grupos.forEach(function (grupo) {
      var textoOriginal = grupo.nodo.textContent;
      var antes = textoOriginal.slice(0, grupo.inicio);
      var contenido = textoOriginal.slice(grupo.inicio, grupo.fin);
      var despues = textoOriginal.slice(grupo.fin);

      var frag = document.createDocumentFragment();
      if (antes) frag.appendChild(document.createTextNode(antes));
      var mark = document.createElement('mark');
      mark.className = 'hc-resaltado';
      mark.textContent = contenido;
      frag.appendChild(mark);
      if (despues) frag.appendChild(document.createTextNode(despues));

      grupo.nodo.parentNode.replaceChild(frag, grupo.nodo);
      abrirTogglesAncestros(mark);
      if (!primerMark) primerMark = mark;
    });

    if (primerMark && typeof primerMark.scrollIntoView === 'function') {
      primerMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return true;
  }

  // ── Historial de búsquedas (24h) ─────────────────────────────────────────

  function leerHistorial() {
    var crudo;
    try {
      crudo = JSON.parse(localStorage.getItem(HISTORIAL_KEY) || '[]');
    } catch (e) {
      crudo = [];
    }
    var limite = Date.now() - HISTORIAL_MAX_HORAS * 60 * 60 * 1000;
    var vigente = crudo.filter(function (item) {
      return item && item.ts && item.ts > limite;
    });
    if (vigente.length !== crudo.length) {
      guardarHistorialCrudo(vigente);
    }
    return vigente;
  }

  function guardarHistorialCrudo(lista) {
    try {
      localStorage.setItem(HISTORIAL_KEY, JSON.stringify(lista));
    } catch (e) {
      /* localStorage no disponible, se ignora silenciosamente */
    }
  }

  function agregarAHistorial(termino) {
    var t = termino.trim();
    if (!t) return;
    var lista = leerHistorial().filter(function (item) {
      return item.termino.toLowerCase() !== t.toLowerCase();
    });
    lista.unshift({ termino: t, ts: Date.now() });
    if (lista.length > HISTORIAL_MAX_ITEMS) lista = lista.slice(0, HISTORIAL_MAX_ITEMS);
    guardarHistorialCrudo(lista);
  }

  // ── Estado de navegación entre páginas ───────────────────────────────────

  function guardarEstadoPendiente(query, globalIndex) {
    try {
      sessionStorage.setItem(ESTADO_KEY, JSON.stringify({ query: query, globalIndex: globalIndex }));
    } catch (e) { /* ignora */ }
  }

  function leerEstadoPendiente() {
    try {
      var crudo = sessionStorage.getItem(ESTADO_KEY);
      return crudo ? JSON.parse(crudo) : null;
    } catch (e) {
      return null;
    }
  }

  function borrarEstadoPendiente() {
    try {
      sessionStorage.removeItem(ESTADO_KEY);
    } catch (e) { /* ignora */ }
  }

  // ── Inicialización de la interfaz ────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('buscadorBtn');
    var panel = document.getElementById('buscadorPanel');
    var input = document.getElementById('buscadorInput');
    var historialWrap = document.getElementById('buscadorHistorial');
    var historialLista = document.getElementById('buscadorHistorialLista');
    var resultadoWrap = document.getElementById('buscadorResultado');
    var contador = document.getElementById('buscadorContador');
    var btnAnterior = document.getElementById('buscadorAnterior');
    var btnSiguiente = document.getElementById('buscadorSiguiente');
    var vacio = document.getElementById('buscadorVacio');

    if (!btn || !panel || !input) return;

    var estadoActual = null; // { query, queryNormalizada, conteos, total, globalIndex }

    function renderHistorial() {
      var lista = leerHistorial();
      historialLista.innerHTML = '';
      if (!lista.length) {
        historialWrap.hidden = true;
        return;
      }
      historialWrap.hidden = false;
      lista.forEach(function (item) {
        var li = document.createElement('button');
        li.type = 'button';
        li.className = 'buscador__historial-item';
        li.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 15"></polyline></svg>' +
          '<span></span>';
        li.querySelector('span').textContent = item.termino;
        li.addEventListener('click', function () {
          input.value = item.termino;
          ejecutarBusqueda(item.termino);
          input.focus();
        });
        historialLista.appendChild(li);
      });
    }

    function mostrarPill(globalIndex, total) {
      resultadoWrap.hidden = false;
      vacio.hidden = true;
      contador.textContent = globalIndex + ' de ' + total;
    }

    function mostrarVacio() {
      resultadoWrap.hidden = true;
      vacio.hidden = false;
    }

    function ocultarResultados() {
      resultadoWrap.hidden = true;
      vacio.hidden = true;
    }

    function irAOcurrencia(globalIndex) {
      if (!estadoActual) return;
      var destino = globalAPaginaLocal(globalIndex, estadoActual.conteos);
      if (!destino) return;

      estadoActual.globalIndex = globalIndex;
      mostrarPill(globalIndex, estadoActual.total);

      if (destino.pagina === nombrePaginaActual()) {
        resaltarOcurrenciaLocal(destino.local, estadoActual.queryNormalizada);
        borrarEstadoPendiente();
      } else {
        guardarEstadoPendiente(estadoActual.query, globalIndex);
        window.location.href = destino.pagina;
      }
    }

    function ejecutarBusqueda(valor) {
      var q = (valor || '').trim();
      input.value = q;

      if (q.length < MIN_CARACTERES) {
        limpiarResaltado();
        ocultarResultados();
        estadoActual = null;
        borrarEstadoPendiente();
        return;
      }

      var qNorm = normalizarPreservandoLongitud(q);
      var qNormNFD = normalizarNFD(q);
      var res = calcularConteos(qNormNFD);

      if (res.total === 0) {
        limpiarResaltado();
        mostrarVacio();
        estadoActual = null;
        borrarEstadoPendiente();
        return;
      }

      estadoActual = {
        query: q,
        queryNormalizada: qNorm,
        conteos: res.conteos,
        total: res.total,
        globalIndex: null
      };

      var inicio = calcularInicio(res.conteos);
      if (inicio) {
        irAOcurrencia(inicio);
      } else {
        mostrarVacio();
      }
    }

    // El historial solo guarda la palabra "confirmada": cuando se presiona
    // Enter, se usan las flechas de navegación, o se cierra el buscador.
    // Así no queda una entrada por cada letra escrita.
    function confirmarHistorial() {
      if (estadoActual && estadoActual.query) {
        agregarAHistorial(estadoActual.query);
      }
    }

    function abrirPanel() {
      panel.hidden = false;
      btn.classList.add('active');
      btn.setAttribute('aria-expanded', 'true');
      renderHistorial();
    }

    function cerrarPanel() {
      confirmarHistorial();
      panel.hidden = true;
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
      limpiarResaltado();
      ocultarResultados();
      estadoActual = null;
      borrarEstadoPendiente();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.hidden) {
        abrirPanel();
        input.focus();
      } else {
        cerrarPanel();
      }
    });

    panel.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    document.addEventListener('click', function () {
      if (!panel.hidden) cerrarPanel();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) cerrarPanel();
    });

    var debounce;
    input.addEventListener('input', function () {
      clearTimeout(debounce);
      var valor = input.value;
      debounce = setTimeout(function () {
        ejecutarBusqueda(valor);
      }, 150);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(debounce);
        ejecutarBusqueda(input.value);
        confirmarHistorial();
      }
    });

    btnSiguiente.addEventListener('click', function () {
      if (!estadoActual) return;
      var siguiente = (estadoActual.globalIndex % estadoActual.total) + 1;
      irAOcurrencia(siguiente);
      confirmarHistorial();
    });

    btnAnterior.addEventListener('click', function () {
      if (!estadoActual) return;
      var anterior = estadoActual.globalIndex === 1 ? estadoActual.total : estadoActual.globalIndex - 1;
      irAOcurrencia(anterior);
      confirmarHistorial();
    });

    // Si llegamos a esta página por un salto de búsqueda desde otra página,
    // retomamos la búsqueda automáticamente.
    var pendiente = leerEstadoPendiente();
    if (pendiente && pendiente.query) {
      var qNorm = normalizarPreservandoLongitud(pendiente.query);
      var qNormNFD = normalizarNFD(pendiente.query);
      var res = calcularConteos(qNormNFD);

      if (res.total > 0) {
        estadoActual = {
          query: pendiente.query,
          queryNormalizada: qNorm,
          conteos: res.conteos,
          total: res.total,
          globalIndex: null
        };
        abrirPanel();
        input.value = pendiente.query;
        irAOcurrencia(pendiente.globalIndex);
      } else {
        borrarEstadoPendiente();
      }
    }
  });
})();