# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request

class BackendThemeController(http.Controller):

    @http.route('/code_backend_theme/is_admin', type='jsonrpc', auth='user')
    def is_admin(self):
        """
        Endpoint to check if the current user is a system administrator.
        This is a robust way to check permissions from the frontend.
        """
        is_admin = request.env.user.has_group('base.group_system')
        return is_admin
