# CLAUDE.md — code_backend_theme

Guía de contexto para trabajar en este repositorio con Claude Code. Léela antes de tocar código.

## 1. Qué es este módulo

`code_backend_theme` es un tema visual para el **backend** de Odoo Community Edition, basado en el
tema comercial "Code Backend Theme" de Cybrosys, pero **fuertemente personalizado para el cliente
SLEP Chinchorro** (logo propio, paleta de colores, sidebar de apps a la izquierda en vez del menú
"grid" nativo, y una barra de accesibilidad WCAG 2.1 AA / NTS‑WEB Chile / SENADIS que no existe en
la versión original de Cybrosys).

No define modelos de negocio ni datos: es 100% presentación (assets, plantillas QWeb/OWL, un
controlador liviano y hooks de instalación).

- **Versión actual del código**: manifest declara `18.0.1.0.0`.
- **Rama de trabajo**: `19.0` (el repo ya está en proceso de migración; ver [Iniciativa activa](#3-iniciativa-activa-migración-a-190)).
- **Licencia**: LGPL‑3.
- **Dependencias**: `web`, `mail`.

### 1.1 Estructura de archivos

```
code_backend_theme/
├── __manifest__.py              # version, depends, data, assets, hooks
├── __init__.py                  # import controllers + hooks
├── hooks.py                     # pre_init_hook / post_init_hook: setea web_icon_data por nombre de menú
├── controllers/main.py          # BackendThemeController: endpoint /code_backend_theme/is_admin (JSON-RPC)
├── views/
│   ├── layout_templates.xml     # t-inherit de web.layout: <meta viewport>, Google Fonts, clase en <body>
│   └── base_menus.xml           # web_icon en menús raíz (Settings, Apps, Discuss)
├── static/src/
│   ├── scss/                    # theme.scss, theme_accent.scss (variables), sidebar.scss, navbar, login, etc.
│   ├── js/
│   │   ├── fields/colors.js             # intenta sobreescribir la paleta de getColor()
│   │   └── web_navbar_appmenu/          # patch de NavBar: sidebar propio + toggler colapsable
│   ├── webclient/
│   │   ├── user_name_tray/              # systray OWL: muestra el nombre del usuario
│   │   └── accessibility_tray/          # systray OWL propio: tamaño de texto, alto contraste, modo oscuro
│   └── xml/
│       ├── top_bar_templates.xml        # t-inherit de web.NavBar (position="replace" del <nav>), web.UserMenu
│       └── settings_templates.xml       # t-inherit de web.SettingsPage (actualmente comentado/inactivo)
└── doc/RELEASE_NOTES.md
```

### 1.2 Piezas más sensibles a romperse en un upgrade

Ordenadas por riesgo, porque son las que dependen de la estructura interna del `web` core en vez
de una API pública estable:

1. **`static/src/xml/top_bar_templates.xml`** — reemplaza por completo el `<nav class="o_main_navbar">`
   de `web.NavBar` (`position="replace"`) y reimplementa su propio sidebar de apps. Cualquier cambio
   de Odoo al árbol interno del navbar (`o_menu_systray`, `o_menu_sections`, claves de `t-foreach`,
   etc.) no rompe la vista (el xpath sigue apuntando a un nodo válido) pero sí puede desalinear
   estilos o funciones nuevas del core (p. ej. el menú "burger" para mobile).
2. **`static/src/js/web_navbar_appmenu/webNavbarAppMenu.js`** — hace `patch(NavBar.prototype, ...)`
   y **sobreescribe `this.state`** por completo dentro de `setup()`. El `NavBar` core también guarda
   su propio estado en `this.state` (usado por el menú "burger" de mobile). Si se necesita ese estado
   del core en el futuro, no debe pisarse — extender el objeto, no reemplazarlo.
3. **`static/src/js/fields/colors.js`** — asume que `getColor` exportado por
   `@web/core/colors/colors.js` es un arreglo mutable. Desde hace varias versiones es una **función**;
   el `for` que hace `getColor[i] = color` no lanza error pero tampoco cambia nada (asigna
   propiedades sueltas a un objeto función). Es código muerto heredado, no específico de esta
   migración, pero conviene corregirlo quirúrgicamente si se toca el archivo.
4. **`controllers/main.py`** — usa `@http.route(..., type='json', ...)`. `type='json'` es un alias
   *deprecado* desde Odoo 19.0 en favor de `type='jsonrpc'` (sigue funcionando, pero emite
   `DeprecationWarning`). Además, el endpoint no tiene ningún caller en el JS del propio módulo
   (el chequeo real de admin se hace con `user.hasGroup(...)` en `webNavbarAppMenu.js`): evaluar si
   se mantiene, se corrige el `type`, o se elimina por no usarse.
5. **`hooks.py`** — la firma de las funciones se llama `cr` pero en realidad Odoo invoca los hooks
   pasando el **`env`** (Environment), no el cursor, desde hace varias versiones. El código funciona
   porque `env['ir.ui.menu']` es válido (Environment soporta `__getitem__`), pero el nombre del
   parámetro es engañoso. Vale la pena renombrarlo a `env` al tocar el archivo (cosmético, no
   bloqueante).

## 2. Directrices de desarrollo (estándar Odoo)

Estas directrices aplican a **todo** el código nuevo o modificado en este repo. Están alineadas con
el estándar oficial de desarrollo de Odoo (ver enlaces en la sección 5).

### 2.1 Python

- Modelos: nombres con punto (`my.model`), clase en CamelCase, sin guión bajo en `_name`.
- Métodos privados con `_` inicial; `_compute_*`, `_onchange_*`, `_check_*` según corresponda.
- Orden de decoradores: `@api.model`, `@api.depends`, `@api.constrains`, `@api.onchange`.
- Nunca `time.sleep()`, nunca `self.env.cr.commit()` dentro de un método, nunca SQL crudo salvo
  necesidad justificada (y siempre parametrizado, jamás con f-strings/`%` sobre input de usuario).
- Traducciones: envolver strings de usuario con `_()`; `_lt()` solo para strings a nivel de clase.
- Hooks de manifest (`pre_init_hook`, `post_init_hook`, `uninstall_hook`) reciben **`env`**, no `cr`.

### 2.2 Vistas / XML

- Un archivo por modelo o por área funcional: `*_views.xml`, `*_templates.xml`.
- IDs de vista: `view_{model}_{tipo}`; acciones: `action_{model}[_{propósito}]`; menús:
  `menu_{modulo}_{propósito}`.
- `<odoo noupdate="1">` para datos demo/iniciales; `<odoo>` normal para vistas/menús actualizables.
- Al heredar plantillas OWL del core (`t-inherit`) con `position="replace"` de nodos grandes: dejar
  un comentario indicando **qué versión de Odoo se usó como referencia** para ese xpath, y revisar
  ese nodo contra el core en cada upgrade mayor (es la parte que más se desincroniza).

### 2.3 JavaScript / OWL

- Módulos ESM (`import`/`export`); usar `/** @odoo-module **/` solo si el bundle/build lo requiere
  explícitamente — en desarrollo reciente de Odoo los módulos nativos ya no necesitan el pragma.
- `patch()` de componentes/servicios del core: extender objetos de estado existentes
  (`Object.assign` o `useState({...super, ...propio})`), **no** reemplazarlos, para no perder
  funcionalidad nueva que el core agregue a ese mismo `state` en versiones futuras.
- Un componente OWL por carpeta bajo `static/src/webclient/<nombre>/` con su `.js`, `.xml`, `.scss`
  (patrón ya usado por `user_name_tray/` y `accessibility_tray/`): mantenerlo para todo componente
  nuevo del systray.
- Registrar en `registry.category("systray")` con una `sequence` explícita y comentada (el orden
  visual depende de ella).
- Persistencia de preferencia de usuario en `localStorage` solo para estado puramente de UI
  (colapso de sidebar, tamaño de fuente, contraste). Nada sensible ni de negocio.

### 2.4 Assets (`__manifest__.py`)

- Bundle de backend: `web.assets_backend`. Bundle de frontend/login: `web.assets_frontend`.
- Orden de los archivos SCSS importa: variables (`theme_accent.scss`) antes que los archivos que las
  consumen (`theme.scss`, `sidebar.scss`, etc.).
- Fuentes: preferir servirlas desde `static/src/fonts/` (ya se hace) en vez de depender de Google
  Fonts en producción (hay una llamada externa a `fonts.googleapis.com` en `layout_templates.xml` y
  en `theme.scss` — evaluar migrarla a fuente local por rendimiento/privacidad, no por compatibilidad).

### 2.5 Seguridad

- Todo lo que dependa de si el usuario es administrador debe verificarse con
  `user.hasGroup('base.group_system')` (frontend) o `request.env.user.has_group(...)` /
  `self.env.user.has_group(...)` (backend) — nunca inferir el rol desde el nombre del menú o el DOM.
- Cualquier endpoint HTTP nuevo: `auth` explícito (`user`/`public`), y si expone datos, revisar que
  no filtre información de otras compañías (`sudo()` solo cuando sea imprescindible y documentado).

## 3. Iniciativa activa: migración a 19.0

Hay una migración en curso de **18.0 → 19.0** (Odoo CE). El plan detallado, con hallazgos verificados
contra el código fuente oficial de `odoo/odoo` rama `19.0` y checklist de tareas, está en:

**[`doc/MIGRATION_PLAN_19_0.md`](doc/MIGRATION_PLAN_19_0.md)**

Antes de tocar cualquier archivo de este módulo mientras la migración esté abierta:
1. Revisar si el archivo aparece en el checklist del plan.
2. Si se toca un archivo listado como "sensible" en la sección 1.2 de este documento, validar el
   cambio contra la plantilla/API equivalente en la fuente oficial de Odoo 19.0
   (`https://github.com/odoo/odoo/tree/19.0/addons/web`), no solo contra la memoria/documentación.
3. Actualizar `doc/RELEASE_NOTES.md` y la versión en `__manifest__.py` cuando la migración cierre.

## 4. Comandos locales

Definidos en el entorno (`ODOO_BASE_COMMAND`), vía `podman compose`:

```bash
# Actualizar el módulo en una base existente
podman compose exec odoo odoo-bin -c /etc/odoo/odoo.conf --addons-path=/mnt/extra-addons \
  -d <database> -u code_backend_theme --stop-after-init

# Instalar en limpio (útil para probar hooks pre/post init)
podman compose exec odoo odoo-bin -c /etc/odoo/odoo.conf --addons-path=/mnt/extra-addons \
  -d <database> -i code_backend_theme --test-enable --stop-after-init

# Shell interactivo
podman compose exec odoo odoo-bin -c /etc/odoo/odoo.conf --addons-path=/mnt/extra-addons \
  shell -d <database>
```

No ejecutar estos comandos contra una base compartida/productiva sin confirmar antes con el usuario.

## 5. Referencias oficiales

- Reference general: https://www.odoo.com/documentation/19.0/developer/reference.html
- Manifest de módulo: https://www.odoo.com/documentation/19.0/developer/reference/backend/module.html
- Frontend / OWL: https://www.odoo.com/documentation/19.0/developer/reference/frontend.html
- Assets: https://www.odoo.com/documentation/19.0/developer/reference/frontend/assets.html
- Patching code: https://www.odoo.com/documentation/19.0/developer/reference/frontend/patching_code.html
- Código fuente de referencia (rama 19.0): https://github.com/odoo/odoo/tree/19.0/addons/web
