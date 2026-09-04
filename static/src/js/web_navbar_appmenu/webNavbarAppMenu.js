/** @odoo-module **/

import { NavBar } from '@web/webclient/navbar/navbar';
import { patch } from "@web/core/utils/patch";
import { user } from "@web/core/user";

import {
    Component,
    onWillDestroy,
    useExternalListener,
    onMounted,
    useRef,
    onWillUnmount,
    useState,
} from "@odoo/owl";

patch(NavBar.prototype, {
    setup() {
        super.setup();
        this.user = user;
        this.state = useState({ isSystemAdmin: false, isCollapsed: true });

        this.sidebarLinks = useRef("sidebarLinks");
        this.sidebarPanel = useRef("sidebar");
        this.toggler = useRef("toggler");
        
        const sidebarLinkHandler = this.handleSidebarLinkClick.bind(this);

        const toggleSidebar = (event) => {
            event.stopPropagation(); // Prevent the click from bubbling up to the li
            const body = document.body;
            body.classList.toggle("o_sidebar_collapsed");
            const isCollapsed = body.classList.contains("o_sidebar_collapsed");
            localStorage.setItem("sidebar_collapsed", isCollapsed);
            this.state.isCollapsed = isCollapsed;
        };

        onMounted(async () => {
            this.state.isSystemAdmin = await this.user.hasGroup("base.group_system");

            const toggleButton = this.toggler.el;
            const sidebarLinkElements = this.sidebarLinks.el?.querySelectorAll("li:not(:first-child)"); // Exclude the first li (the toggler)

            if (sidebarLinkElements) {
                Array.from(sidebarLinkElements).forEach(link => {
                    link.addEventListener('click', sidebarLinkHandler);
                });
            }
            if (toggleButton) {
                toggleButton.addEventListener("click", toggleSidebar);
            }

            // Apply initial state from localStorage
            const savedState = localStorage.getItem("sidebar_collapsed");
            if (savedState === "true") {
                document.body.classList.add("o_sidebar_collapsed");
                this.state.isCollapsed = true;
            } else {
                document.body.classList.remove("o_sidebar_collapsed");
                this.state.isCollapsed = false; // Ensure state is consistent if not collapsed
            }
        });

        onWillUnmount(() => {
            const sidebarLinkElements = this.sidebarLinks.el?.querySelectorAll("li:not(:first-child)");

            if (sidebarLinkElements) {
                Array.from(sidebarLinkElements).forEach(link => {
                    link.removeEventListener('click', sidebarLinkHandler);
                });
            }
        });
    },

    handleSidebarLinkClick(event) {
        // Force sidebar to collapse when any sidebar link is clicked
        //document.body.classList.add("o_sidebar_collapsed");
        //localStorage.setItem("sidebar_collapsed", true);
        //this.state.isCollapsed = true; // Update internal state

        const li = event.currentTarget;
        const a = li.firstElementChild;
        const id = a.getAttribute('data-id');
        document.querySelector('header').className = id;
        Array.from(this.sidebarLinks.el.children).forEach(li => {
            li.firstElementChild.classList.remove('active');
        });
        a.classList.add('active');
    }
});