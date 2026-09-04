import { registry } from "@web/core/registry";

import { Component } from "@odoo/owl";
import { user } from "@web/core/user";

export class UserNameTray extends Component {
    static template = "web.UserNameTray";
    static props = {};

    setup() {
        this.user = user;
    }

}

export const systrayItem = {
    Component: UserNameTray,
};

registry.category("systray").add("UserNameTray", systrayItem, { sequence: 1 });
