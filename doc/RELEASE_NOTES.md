## Module <code_backend_theme>
#### 04.09.2026
#### Version 19.0.1.0.0
##### MIGRATION
Migración 18.0 → 19.0: bump de versión, hooks de instalación (`cr` → `env` en la firma, siguiendo
lo que Odoo realmente pasa), controlador `is_admin` actualizado a `type='jsonrpc'` (alias
`type='json'` deprecado desde 19.0), referencias de documentación actualizadas a 19.0. Sin cambios
funcionales en vistas/QWeb/OWL: los xpaths de `top_bar_templates.xml` y `layout_templates.xml`
siguen siendo válidos contra el core 19.0 (ver `doc/MIGRATION_PLAN_19_0.md`). Pendiente: QA visual
manual (desktop/mobile) en un Odoo 19.0 real.

**Corrección post-instalación (04.09.2026, instalación real contra Odoo 19.0):** `hooks.py`
importaba `get_module_resource` desde `odoo.modules`, eliminada por completo en 19.0 (deprecada
desde 17.0). Provocaba `ImportError` al cargar el módulo, tumbando el registro completo (no solo
el módulo). Corregido usando `odoo.tools.file_path` en las 62 llamadas.

## Module <code_backend_theme>
#### 09.10.2024
#### Version 18.0.1.0.0
##### ADD
Initial commit for Code Backend Theme
