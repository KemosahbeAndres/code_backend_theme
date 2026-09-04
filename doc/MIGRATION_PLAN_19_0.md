# Plan de migración: code_backend_theme 18.0 → 19.0

**Estado**: en progreso — cambios mecánicos aplicados (manifest, hooks, controlador, metadatos);
pendiente QA visual en un Odoo 19.0 real (ver sección 4).
**Alcance**: solo este módulo (`code_backend_theme`). No cubre otros addons del cliente.
**Método**: los hallazgos de este documento se verificaron contrastando el código actual del módulo
contra el código fuente real de Odoo en `github.com/odoo/odoo`, ramas `18.0` y `19.0` (no solo contra
documentación general), para evitar suposiciones. Cada hallazgo cita el archivo fuente consultado.

---

## 0. Estado detectado del repo

- `__manifest__.py` declara `"version": "18.0.1.0.0"`.
- La rama git activa es `19.0`.
- Es decir: el código todavía no fue migrado; la rama se creó como destino de esta migración.

---

## 1. Hallazgos verificados contra el core de Odoo 19.0

### 1.1 `web.NavBar` fue reestructurado — impacto: bajo/medio, no rompe la carga de la vista

Fuente: `addons/web/static/src/webclient/navbar/navbar.xml` en `18.0` vs `19.0`.

Cambios reales entre 18.0 y 19.0:

- El `<nav class="o_main_navbar">` ahora vive **dentro** de un `<header class="o_navbar" t-ref="root">`
  (antes el `t-ref="root"` no envolvía el nav de esta forma).
- El bloque de "Apps" se extrajo a un sub-template `web.NavBar.AppsMenu`, que en pantallas chicas
  (`this.ui.isSmall`) renderiza un **sidebar "burger" nativo nuevo** (`web.NavBar.AppsMenu.Sidebar`,
  clases `o_app_menu_sidebar`, `o_burger_menu_content`) que no existía como tal en 18.0.
- `data-command-category` del `<nav>` pasó de `"navbar"` a `"disabled"` (en el core; irrelevante para
  nosotros porque reemplazamos el nodo).
- La key del `t-foreach` del systray pasó de `item_index` a `item.key`.

**Por qué no es bloqueante**: `code_backend_theme` hereda `web.NavBar` con
`t-inherit-mode="extension"` y hace `position="replace"` de todo el nodo
`//nav[hasclass('o_main_navbar')]` (`static/src/xml/top_bar_templates.xml:5`). Ese nodo **sigue
existiendo** con esa clase en 19.0, así que el xpath sigue resolviendo y la vista no falla al cargar.

**Qué sí hay que revisar (funcional, no de carga)**:
- El módulo reimplementa su propio sidebar de apps a mano (no usa `web.NavBar.AppsMenu`), así que
  **no hereda gratis** el nuevo menú "burger" de mobile del core. Si el sidebar propio ya cubre mobile
  (hay `responsive_sidebar.scss`), confirmar visualmente que sigue viéndose bien en `isSmall`; si no,
  es trabajo de QA visual, no de código roto.
- El `<t t-if="!env.isSmall">` (línea 30 de `top_bar_templates.xml`) sigue siendo válido: se confirmó
  que `env.isSmall` sigue en uso en el core 19.0 (`addons/web/static/src/webclient/actions/action_service.js`).

### 1.2 `web.UserMenu` — impacto: ninguno

Fuente: `addons/web/static/src/webclient/user_menu/user_menu.xml` en `19.0`.

El nodo `<small class="oe_topbar_name" ...>` que `top_bar_templates.xml:97` reemplaza (por un
`<div class="oe_topbar_name"/>` vacío) **sigue existiendo** en 19.0, ahora con contenido adicional
(muestra también el nombre de la base de datos en modo debug). Como se reemplaza por completo, ese
contenido nuevo simplemente no se usa — comportamiento intencional y sin riesgo de romper la carga.

### 1.3 `web.layout` — impacto: ninguno

Fuente: `addons/web/views/webclient_templates.xml` en `19.0`.

Los dos xpaths de `layout_templates.xml` siguen siendo válidos:
- `//meta[@content='IE=edge']` existe tal cual.
- `//body` existe (con `t-att-class="body_classname"` dinámico); agregarle el atributo estático
  `class="o_web_client o_sidebar_collapsed"` vía xpath es el mismo patrón que ya se usaba en 18.0, no
  cambió.

### 1.4 Hooks de manifest (`pre_init_hook` / `post_init_hook`) — impacto real: **bloqueante** (corregido)

Fuente: `odoo/modules/loading.py` en `19.0`; `odoo/modules/__init__.py` y `odoo/modules/module.py`
en `18.0` vs `19.0`.

Dos hallazgos, uno cosmético (correcto en la primera pasada de este plan) y uno que esa primera
pasada **no detectó** y sí bloqueaba la instalación real:

- Odoo invoca los hooks pasando **`env`** (`getattr(py_module, pre_init)(env)`), no el cursor. El
  parámetro se renombró `cr` → `env` (cosmético, sección 3.4).
- **Bloqueante, encontrado recién al instalar contra un Odoo 19.0 real** (no se detectó revisando
  solo el diff del módulo, porque el import en sí no cambió — lo que desapareció fue la función
  importada): `hooks.py` hacía `from odoo.modules import get_module_resource`. Esa función (alias de
  `get_resource_path`, deprecada desde 17.0 en favor de `odoo.tools.file_path`) **se eliminó por
  completo de `odoo/modules/module.py` en 19.0** — no solo se dejó de reexportar en
  `odoo/modules/__init__.py`, ya no existe la definición. Resultado real: `ImportError: cannot
  import name 'get_module_resource' from 'odoo.modules'` al cargar `code_backend_theme`, que
  **tumbaba el registro completo** (no solo el módulo) porque el `ImportError` ocurre durante
  `load_openerp_module`, antes de que el módulo termine de cargar. **Corregido**: las 62 llamadas
  `get_module_resource('code_backend_theme', 'static', 'src', 'img', 'icons', 'X.png')` pasaron a
  `file_path('code_backend_theme/static/src/img/icons/X.png')` (`from odoo.tools import
  file_path`), la API recomendada desde 17.0, presente sin cambios en 19.0.

### 1.5 `@http.route(type='json')` está deprecado desde 19.0 — impacto: bajo, con warning

Fuente: `odoo/http.py` en `19.0`:

```python
if routing.get('type') == 'json':
    warnings.warn(
        "Since 19.0, @route(type='json') is a deprecated alias to @route(type='jsonrpc')",
        DeprecationWarning, stacklevel=3,
    )
    routing['type'] = 'jsonrpc'
```

`controllers/main.py:7` usa `type='json'`. Sigue funcionando (alias automático) pero genera
`DeprecationWarning` en el log. Además, se verificó (`grep -rn "is_admin"`) que **ningún JS del
módulo llama a este endpoint** — el chequeo de admin real se hace client-side con
`user.hasGroup("base.group_system")` en `webNavbarAppMenu.js:39`. Decisión pendiente: actualizar a
`type='jsonrpc'` o eliminar el controlador por no tener caller (ver sección 3.5).

### 1.6 `getColor` en `colors.js` — impacto: ninguno nuevo (bug preexistente)

Fuente: `addons/web/static/src/core/colors/colors.js` en `18.0` y `19.0`.

Se confirmó que `getColor` ya era una **función** (no un arreglo) en ambas versiones
(`export function getColor(index, colorScheme, paletteSizeOrName)`). El código de
`static/src/js/fields/colors.js` hace `getColor[i] = code_backend_color[i]`, lo cual no lanza error
pero tampoco sobreescribe la paleta real (le asigna propiedades sueltas al objeto función). Es un bug
heredado de una versión más antigua de Odoo (cuando `getColor` sí era un arreglo), **no introducido
por esta migración**. No bloquea, pero si se va a tocar este archivo igual conviene arreglarlo
(sección 3.6).

---

## 2. Riesgos y cómo mitigarlos

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| 1 | Desincronización visual del navbar/sidebar propio vs. el nuevo diseño core (burger menu mobile) | Media | QA visual manual en desktop y mobile tras el update; no requiere cambio de código si el sidebar propio ya cubre el caso |
| 2 | `patch(NavBar.prototype)` sobreescribe `this.state` completo | Baja (preexistente) | No tocar salvo que se necesite consumir `state.isAppMenuSidebarOpened`/`isAllAppsMenuOpened` del core; si se toca, fusionar en vez de reemplazar |
| 3 | Dependencia externa a Google Fonts en `layout_templates.xml` y `theme.scss` | Baja | Fuera de alcance de la migración; oportunidad de mejora aparte |
| 4 | `type='json'` deprecado en el controlador | Baja | Cambiar a `type='jsonrpc'` o eliminar si se confirma que no se usa |
| 5 | SCSS: variables/mixins de Bootstrap u Odoo que el módulo pueda estar referenciando indirectamente | Por confirmar | El repo usa mayormente variables propias (`$primary_accent`, etc.), pero falta una pasada de `assets_backend` en un Odoo 19 real para detectar warnings de Sass en build (ver checklist QA) |

---

## 3. Checklist de tareas

### 3.1 Manifest
- [x] `__manifest__.py`: `"version": "18.0.1.0.0"` → `"19.0.1.0.0"`.
- [ ] Revisar que `depends: ["web", "mail"]` siga siendo correcto tras instalar en una base 19.0 limpia
      (pendiente de instalación real, ver sección 4).

### 3.2 Vistas / templates
- [ ] `views/layout_templates.xml`: confirmar visualmente que el `<meta viewport>` y el `<link>` de
      Google Fonts se siguen inyectando correctamente después de `//meta[@content='IE=edge']`.
- [ ] `static/src/xml/top_bar_templates.xml`: correr el módulo, verificar que el navbar, el sidebar de
      apps y el `SectionsMenu` se ven y funcionan igual que en 18.0 (desktop y mobile).
- [ ] `static/src/xml/settings_templates.xml`: sigue comentado/inactivo; si se reactiva en el futuro,
      validar el xpath contra `web.SettingsPage` de 19.0 antes de descomentar.

### 3.3 JavaScript / OWL
- [ ] `static/src/js/web_navbar_appmenu/webNavbarAppMenu.js`: correr con el sidebar y confirmar que
      colapsar/expandir y el `hasGroup` de admin siguen funcionando.
- [ ] `static/src/webclient/user_name_tray/` y `accessibility_tray/`: verificar registro en el
      systray (orden, `sequence`) y que el panel de accesibilidad (fuente/contraste/oscuro) siga
      operativo.
- [ ] Revisar si algún archivo usa el pragma `/** @odoo-module **/`; confirmar en el entorno de build
      de 19.0 real si sigue siendo necesario o puede quitarse (no se pudo verificar contra fuente
      oficial de forma concluyente en esta pasada — dejar como ítem de verificación en ambiente real).

### 3.4 Hooks
- [x] `hooks.py`: renombrar el parámetro `cr` → `env` en `test_pre_init_hook` y `test_post_init_hook`
      (cosmético, sin cambio funcional) para reflejar lo que realmente reciben.
- [x] `hooks.py`: **corrección bloqueante encontrada al instalar contra Odoo 19.0 real** (no en la
      revisión original) — `get_module_resource` ya no existe en 19.0 (§1.4). Las 62 llamadas
      reemplazadas por `file_path('code_backend_theme/static/src/img/icons/X.png')`
      (`from odoo.tools import file_path`).
- [ ] Opcional (fuera del alcance mínimo): refactorizar el bloque repetitivo de 25 `if menu.name == ...`
      en un diccionario `{nombre_menu: archivo_icono}` — reduce duplicación pero no es requisito de
      la migración.

### 3.5 Controlador
- [x] `controllers/main.py`: actualizado a `@http.route(..., type='jsonrpc', auth='user')` (opción a).
      Se descartó eliminarlo (opción b) pese a no tener caller propio: es un endpoint público
      (`auth='user'`) y no hay forma de confirmar desde este repo que ningún consumidor externo lo
      use; el fix de deprecación es la opción reversible y de menor riesgo.

### 3.6 SCSS / assets (opcional, no bloqueante — fuera del alcance de esta pasada)
- [ ] `static/src/js/fields/colors.js`: si se decide corregir el bug preexistente, reemplazar la
      paleta usando la API real de `colors.js` (p. ej. sobreescribir las constantes de paleta que
      `getColor()` consulta, o registrar la paleta por el mecanismo que exponga esa versión de Odoo)
      en vez de mutar `getColor` como si fuera un arreglo.
- [ ] Evaluar servir la fuente Poppins localmente en vez de vía `fonts.googleapis.com`.

### 3.7 Metadatos del módulo
- [x] `README.rst`: actualizadas referencias "Odoo 18" → "Odoo 19" y el enlace de instalación
      (`.../documentation/18.0/...` → `.../documentation/19.0/...`).
- [x] `doc/RELEASE_NOTES.md`: agregada entrada `19.0.1.0.0` describiendo la migración.

---

## 4. Plan de pruebas (QA)

1. **Instalación limpia** en una base 19.0 nueva (`-i code_backend_theme`): confirmar que
   `pre_init_hook`/`post_init_hook` corren sin error y que los menús raíz (Contactos, Ventas,
   Inventario, etc. — los que existan en esa base) obtienen su `web_icon_data`.
2. **Actualización** sobre una base existente migrada de 18.0 a 19.0 (`-u code_backend_theme`).
3. **Visual — desktop**: navbar, logo, sidebar colapsable/expandible (recordar estado vía
   `localStorage`), systray (nombre de usuario, barra de accesibilidad), `SectionsMenu` de cada app.
4. **Visual — mobile/`isSmall`**: mismo checklist que el punto 3, prestando atención a si el sidebar
   propio y el nuevo burger-menu del core interfieren entre sí.
5. **Accesibilidad**: probar los 3 controles del panel (tamaño de texto, alto contraste, modo oscuro),
   confirmar que son mutuamente excluyentes (alto contraste vs. oscuro) y que persisten entre
   recargas.
6. **Consola JS**: sin errores ni warnings nuevos relacionados a OWL, `patch()`, o al bundle de
   `web.assets_backend`.
7. **Login**: verificar `static/src/scss/login.scss` (bundle `web.assets_frontend`) en la pantalla de
   login.
8. **Regresión de permisos**: usuario no-admin no debe ver la entrada de "Apps"/administración en el
   sidebar (`state.isSystemAdmin`).

## 5. Plan de rollback

Si algo falla en 19.0 tras la actualización:
- Mantener la rama `18.0` intacta como referencia/fallback (no se toca en esta migración).
- El cambio es de un solo módulo sin modelos ni datos persistentes propios (solo `web_icon_data` en
  `ir.ui.menu`, que es reversible reinstalando/actualizando con el módulo de la versión anterior).
- No hay migraciones de esquema de base de datos que revertir.

## 6. Referencias consultadas

- `addons/web/static/src/webclient/navbar/navbar.xml` — [18.0](https://github.com/odoo/odoo/blob/18.0/addons/web/static/src/webclient/navbar/navbar.xml) / [19.0](https://github.com/odoo/odoo/blob/19.0/addons/web/static/src/webclient/navbar/navbar.xml)
- `addons/web/static/src/webclient/navbar/navbar.js` — [18.0](https://github.com/odoo/odoo/blob/18.0/addons/web/static/src/webclient/navbar/navbar.js) / [19.0](https://github.com/odoo/odoo/blob/19.0/addons/web/static/src/webclient/navbar/navbar.js)
- `addons/web/static/src/webclient/user_menu/user_menu.xml` — [19.0](https://github.com/odoo/odoo/blob/19.0/addons/web/static/src/webclient/user_menu/user_menu.xml)
- `addons/web/views/webclient_templates.xml` (template `web.layout`) — [19.0](https://github.com/odoo/odoo/blob/19.0/addons/web/views/webclient_templates.xml)
- `addons/web/static/src/core/colors/colors.js` — [18.0](https://github.com/odoo/odoo/blob/18.0/addons/web/static/src/core/colors/colors.js) / [19.0](https://github.com/odoo/odoo/blob/19.0/addons/web/static/src/core/colors/colors.js)
- `odoo/modules/loading.py` (invocación de hooks) — [19.0](https://github.com/odoo/odoo/blob/19.0/odoo/modules/loading.py)
- `odoo/http.py` (deprecación de `type='json'`) — [19.0](https://github.com/odoo/odoo/blob/19.0/odoo/http.py)
- Documentación oficial: https://www.odoo.com/documentation/19.0/developer/reference.html
