import React, { useContext, useEffect } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";
import logo from "../assets/images/gym-logo.svg";
import config from "../config";

//Import Components
import VerticalLayout from "./VerticalLayouts";
import TwoColumnLayout from "./TwoColumnLayout";
import { Container } from "reactstrap";
import HorizontalLayout from "./HorizontalLayout";
import { AuthContext } from "../context/AuthContext";
import { fileUrl } from "@/utils/fileUrl";

const Sidebar = ({ layoutType }) => {
    const { adminData } = useContext(AuthContext);

    const logoSrc = adminData?.logo
        ? fileUrl(adminData.logo)
        : logo;

    useEffect(() => {
        const verticalOverlay =
            document.getElementsByClassName("vertical-overlay");
        if (verticalOverlay?.[0]) {
            verticalOverlay[0].addEventListener("click", function () {
                document.body.classList.remove("vertical-sidebar-enable");
            });
        }
    });

    const addEventListenerOnSmHoverMenu = () => {
        console.log("Toggle button clicked!");
        const currentSize =
            document.documentElement.dataset.sidebarSize;
        console.log("Current sidebar size:", currentSize);

        // add listener Sidebar Hover icon on change layout from setting
        if (currentSize === "sm-hover") {
            console.log("Setting to sm-hover-active");
            document.documentElement.dataset.sidebarSize = "sm-hover-active";
        } else if (currentSize === "sm-hover-active") {
            console.log("Setting to sm-hover");
            document.documentElement.dataset.sidebarSize = "sm-hover";
        } else {
            console.log("Setting to sm-hover (from default)");
            document.documentElement.dataset.sidebarSize = "sm-hover";
        }

        const newSize =
            document.documentElement.dataset.sidebarSize;
        console.log("New sidebar size:", newSize);
    };

    let layoutContent;
    if (layoutType === "horizontal") {
        layoutContent = (
            <div id="scrollbar">
                <Container fluid>
                    <div id="two-column-menu"></div>
                    <ul className="navbar-nav" id="navbar-nav">
                        <HorizontalLayout logo={adminData?.data.Logo} />
                    </ul>
                </Container>
            </div>
        );
    } else if (layoutType === "twocolumn") {
        layoutContent = (
            <React.Fragment>
                <TwoColumnLayout
                    layoutType={layoutType}
                    logo={adminData?.data.Logo}
                />
                <div className="sidebar-background"></div>
            </React.Fragment>
        );
    } else {
        layoutContent = (
            <React.Fragment>
                <SimpleBar id="scrollbar" style={{ height: "calc(100vh - 80px)" }}>
                    <Container fluid>
                        <div id="two-column-menu"></div>
                        <ul className="navbar-nav" id="navbar-nav">
                            <VerticalLayout layoutType={layoutType} />
                        </ul>
                    </Container>
                </SimpleBar>
                <div className="sidebar-background"></div>
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            <style>
                {`
                    /* Minimal Sidebar Styling - monochrome */
                    .minimal-sidebar {
                        background: #1b2a4e;
                        border-right: 1px solid rgba(255, 255, 255, 0.08);
                    }

                    .minimal-logo-box {
                        background: #ffffff;
                        border-bottom: 1px solid #e6e8eb;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 15px;
                        height: 80px;
                    }
                    
                    .minimal-logo-box img {
                        max-height: 50px !important;
                        max-width: 85% !important;
                        width: auto !important;
                        object-fit: contain !important;
                        display: block;
                        margin: 0 auto;
                    }
                    
                    /* Menu styling */
                    .menu-title {
                        color: rgba(255, 255, 255, 0.5) !important;
                        font-size: 10px;
                        font-weight: 500;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                        padding: 15px 20px 8px;
                        margin-top: 5px;
                    }
                    
                    .navbar-nav .nav-item {
                        margin: 1px 8px;
                    }
                    
                    .navbar-nav .nav-link {
                        color: rgba(255, 255, 255, 0.8) !important;
                        font-size: 13px;
                        font-weight: 400;
                        padding: 4px 8px !important;
                        border-radius: 4px;
                        transition: background 0.2s;
                    }
                    
                    .navbar-nav .nav-link:hover {
                        background: rgba(255, 255, 255, 0.08);
                        color: #ffffff !important;
                    }
                    
                    .navbar-nav .nav-link.active {
                        background: rgba(255, 255, 255, 0.14);
                        color: #ffffff !important;
                        font-weight: 500;
                    }
                    
                    .navbar-nav .menu-link {
                        display: flex;
                        align-items: center;
                    }
                    
                    .navbar-nav .menu-link::after {
                        font-size: 16px;
                        opacity: 0.6;
                        transition: transform 0.2s;
                    }
                    
                    .navbar-nav .menu-link[aria-expanded="true"]::after {
                        transform: rotate(90deg);
                    }
                    
                    .menu-dropdown {
                        max-height: 0;
                        overflow: hidden;
                        opacity: 0;
                        transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                                    opacity 0.18s ease,
                                    padding 0.2s ease;
                        margin: 0;
                        padding: 0 !important;
                    }

                    .menu-dropdown-open {
                        max-height: 1500px;
                        opacity: 1;
                        padding: 2px 0 !important;
                        transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                                    opacity 0.2s ease 0.03s,
                                    padding 0.2s ease;
                    }

                    /* Staggered child fade-in */
                    .menu-dropdown .nav-item {
                        opacity: 0;
                        transform: translateY(-3px);
                        transition: opacity 0.15s ease, transform 0.15s ease;
                    }

                    .menu-dropdown-open .nav-item {
                        opacity: 1;
                        transform: translateY(0);
                    }

                    .menu-dropdown-open .nav-item:nth-child(1) { transition-delay: 0.02s; }
                    .menu-dropdown-open .nav-item:nth-child(2) { transition-delay: 0.04s; }
                    .menu-dropdown-open .nav-item:nth-child(3) { transition-delay: 0.06s; }
                    .menu-dropdown-open .nav-item:nth-child(4) { transition-delay: 0.08s; }
                    .menu-dropdown-open .nav-item:nth-child(5) { transition-delay: 0.10s; }
                    .menu-dropdown-open .nav-item:nth-child(6) { transition-delay: 0.12s; }
                    .menu-dropdown-open .nav-item:nth-child(7) { transition-delay: 0.14s; }
                    .menu-dropdown-open .nav-item:nth-child(8) { transition-delay: 0.16s; }
                    .menu-dropdown-open .nav-item:nth-child(9) { transition-delay: 0.18s; }
                    .menu-dropdown-open .nav-item:nth-child(10) { transition-delay: 0.20s; }
                    
                    .menu-dropdown .nav-link {
                        padding-left: 35px !important;
                        font-size: 12px;
                    }

                    .app-menu.navbar-menu {
                    position: fixed !important;
                    top: 0;
                    left: 0;
                    height: 100vh !important;
                     overflow: visible !important;
                    }
                    
                    /* Icon spacing */
                    .navbar-nav i {
                        margin-right: 8px;
                    }
                    
                    /* Toggle button visibility */
                    .btn-vertical-sm-hover {
                        background: transparent !important;
                        border: 1px solid #d2d6dc !important;
                        border-radius: 6px !important;
                        padding: 4px 8px !important;
                        color: #4b515a !important;
                    }

                    .btn-vertical-sm-hover:hover {
                        background: #eef0f3 !important;
                        color: #22262c !important;
                    }
                    
                    /* Collapsed Sidebar (sm or sm-hover) - Support both */
                    html[data-sidebar-size="sm"] .navbar-menu,
                    html[data-sidebar-size="sm-hover"] .navbar-menu,
                    body[data-sidebar-size="sm"] .navbar-menu,
                    body[data-sidebar-size="sm-hover"] .navbar-menu,
                    [data-sidebar-size="sm"] .navbar-menu,
                    [data-sidebar-size="sm-hover"] .navbar-menu {
                        width: 70px !important;
                    }
                    
                    html[data-sidebar-size="sm"] .main-content,
                    html[data-sidebar-size="sm-hover"] .main-content,
                    body[data-sidebar-size="sm"] .main-content,
                    body[data-sidebar-size="sm-hover"] .main-content,
                    [data-sidebar-size="sm"] .main-content,
                    [data-sidebar-size="sm-hover"] .main-content {
                        margin-left: 70px !important;
                    }
                    
                    html[data-sidebar-size="sm"] .navbar-nav .nav-link span,
                    html[data-sidebar-size="sm"] .navbar-nav .nav-link::after,
                    html[data-sidebar-size="sm-hover"] .navbar-nav .nav-link span,
                    html[data-sidebar-size="sm-hover"] .navbar-nav .nav-link::after,
                    [data-sidebar-size="sm"] .navbar-nav .nav-link span,
                    [data-sidebar-size="sm"] .navbar-nav .nav-link::after,
                    [data-sidebar-size="sm-hover"] .navbar-nav .nav-link span,
                    [data-sidebar-size="sm-hover"] .navbar-nav .nav-link::after {
                        display: none !important;
                    }
                    
                    html[data-sidebar-size="sm"] .navbar-nav .nav-link i,
                    html[data-sidebar-size="sm-hover"] .navbar-nav .nav-link i,
                    [data-sidebar-size="sm"] .navbar-nav .nav-link i,
                    [data-sidebar-size="sm-hover"] .navbar-nav .nav-link i {
                        font-size: 20px !important;
                        margin-right: 0 !important;
                    }
                    
                    html[data-sidebar-size="sm"] .navbar-nav .nav-link,
                    html[data-sidebar-size="sm-hover"] .navbar-nav .nav-link,
                    [data-sidebar-size="sm"] .navbar-nav .nav-link,
                    [data-sidebar-size="sm-hover"] .navbar-nav .nav-link {
                        justify-content: center !important;
                        text-align: center !important;
                        font-size: 0 !important;
                    }
                    
                    html[data-sidebar-size="sm"] .menu-title,
                    html[data-sidebar-size="sm-hover"] .menu-title,
                    [data-sidebar-size="sm"] .menu-title,
                    [data-sidebar-size="sm-hover"] .menu-title {
                        text-align: center !important;
                        font-size: 0 !important;
                    }
                    
                    html[data-sidebar-size="sm"] .menu-title span,
                    html[data-sidebar-size="sm-hover"] .menu-title span,
                    [data-sidebar-size="sm"] .menu-title span,
                    [data-sidebar-size="sm-hover"] .menu-title span {
                        display: none !important;
                        font-size: 0 !important;
                    }
                    
                    /* Hide ALL text content in collapsed state */
                    html[data-sidebar-size="sm"] .navbar-nav span,
                    html[data-sidebar-size="sm-hover"] .navbar-nav span,
                    [data-sidebar-size="sm"] .navbar-nav span,
                    [data-sidebar-size="sm-hover"] .navbar-nav span {
                        display: none !important;
                        font-size: 0 !important;
                    }
                    
                    /* Show only icons - restore font size for icons */
                    html[data-sidebar-size="sm"] .navbar-nav i,
                    html[data-sidebar-size="sm-hover"] .navbar-nav i,
                    [data-sidebar-size="sm"] .navbar-nav i,
                    [data-sidebar-size="sm-hover"] .navbar-nav i {
                        display: inline-block !important;
                        font-size: 20px !important;
                    }
                    
                    html[data-sidebar-size="sm"] .menu-dropdown,
                    html[data-sidebar-size="sm-hover"] .menu-dropdown,
                    [data-sidebar-size="sm"] .menu-dropdown,
                    [data-sidebar-size="sm-hover"] .menu-dropdown {
                        max-height: 0 !important;
                        overflow: hidden !important;
                        opacity: 0 !important;
                    }
                    
                    html[data-sidebar-size="sm"] .navbar-brand-box,
                    html[data-sidebar-size="sm-hover"] .navbar-brand-box,
                    [data-sidebar-size="sm"] .navbar-brand-box,
                    [data-sidebar-size="sm-hover"] .navbar-brand-box {
                        padding: 15px 5px !important;
                    }
                    
                    html[data-sidebar-size="sm"] .logo-lg,
                    html[data-sidebar-size="sm-hover"] .logo-lg,
                    [data-sidebar-size="sm"] .logo-lg,
                    [data-sidebar-size="sm-hover"] .logo-lg {
                        display: none !important;
                    }
                    
                    html[data-sidebar-size="sm"] .logo-sm,
                    html[data-sidebar-size="sm-hover"] .logo-sm,
                    [data-sidebar-size="sm"] .logo-sm,
                    [data-sidebar-size="sm-hover"] .logo-sm {
                        display: flex !important;
                        justify-content: center !important;
                        align-items: center !important;
                        width: 100% !important;
                    }

                    html[data-sidebar-size="sm"] .logo-sm img,
                    html[data-sidebar-size="sm-hover"] .logo-sm img,
                    [data-sidebar-size="sm"] .logo-sm img,
                    [data-sidebar-size="sm-hover"] .logo-sm img {
                        height: 34px !important;
                        max-width: 100% !important;
                        object-fit: contain !important;
                        margin: 0 auto !important;
                    }
                    
                    /* Hover on individual item - show submenu */
                    html[data-sidebar-size="sm"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link,
                    html[data-sidebar-size="sm-hover"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link,
                    [data-sidebar-size="sm"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link,
                    [data-sidebar-size="sm-hover"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link {
                        position: relative !important;
                        width: 250px !important;
                        background-color: var(--sidebar-bg, #1b2a4e) !important;
                        z-index: 999 !important;
                        font-size: 13px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: flex-start !important;
                        padding-left: 25px !important;
                        border-radius: 0 4px 4px 0 !important;
                        box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2) !important;
                    }
                    
                    html[data-sidebar-size="sm"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link span,
                    html[data-sidebar-size="sm-hover"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link span,
                    [data-sidebar-size="sm"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link span,
                    [data-sidebar-size="sm-hover"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link span {
                        display: inline-block !important;
                        padding-left: 8px !important;
                        font-size: 13px !important;
                        color: var(--sidebar-link-hover-color, #ffffff) !important;
                    }

                    html[data-sidebar-size="sm"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link i,
                    html[data-sidebar-size="sm-hover"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link i,
                    [data-sidebar-size="sm"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link i,
                    [data-sidebar-size="sm-hover"] .nav-item:not(:has(.menu-dropdown)):hover > .menu-link i {
                        color: var(--sidebar-link-hover-color, #ffffff) !important;
                    }
                    
                    html[data-sidebar-size="sm"] .nav-item:has(.menu-dropdown):hover > .menu-link,
                    html[data-sidebar-size="sm-hover"] .nav-item:has(.menu-dropdown):hover > .menu-link,
                    [data-sidebar-size="sm"] .nav-item:has(.menu-dropdown):hover > .menu-link,
                    [data-sidebar-size="sm-hover"] .nav-item:has(.menu-dropdown):hover > .menu-link {
                        width: 70px !important;
                        background-color: var(--sidebar-link-hover-bg, rgba(255, 255, 255, 0.08)) !important;
                    }
                    
                    html[data-sidebar-size="sm"] .nav-item:has(.menu-dropdown):hover > .menu-link i,
                    html[data-sidebar-size="sm-hover"] .nav-item:has(.menu-dropdown):hover > .menu-link i,
                    [data-sidebar-size="sm"] .nav-item:has(.menu-dropdown):hover > .menu-link i,
                    [data-sidebar-size="sm-hover"] .nav-item:has(.menu-dropdown):hover > .menu-link i {
                        color: var(--sidebar-link-hover-color, #ffffff) !important;
                    }
                    
                    html[data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown,
                    html[data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown,
                    [data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown,
                    [data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown,
                    html[data-sidebar-size="sm"] .menu-dropdown:hover,
                    html[data-sidebar-size="sm-hover"] .menu-dropdown:hover,
                    [data-sidebar-size="sm"] .menu-dropdown:hover,
                    [data-sidebar-size="sm-hover"] .menu-dropdown:hover {
                        max-height: 1500px !important;
                        opacity: 1 !important;
                        overflow: visible !important;
                        position: absolute !important;
                        left: 70px !important;
                        top: 0 !important;
                        min-width: 200px !important;
                        max-width: 250px !important;
                        background: var(--sidebar-bg, #1b2a4e) !important;
                        box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.3) !important;
                        border-radius: 4px !important;
                        padding: 0 !important;
                        z-index: 1000 !important;
                        margin: 0 !important;
                    }
                    
                    /* Keep panel visible slightly after hover ends */
                    html[data-sidebar-size="sm"] .nav-item .menu-dropdown,
                    html[data-sidebar-size="sm-hover"] .nav-item .menu-dropdown,
                    [data-sidebar-size="sm"] .nav-item .menu-dropdown,
                    [data-sidebar-size="sm-hover"] .nav-item .menu-dropdown {
                        transition: opacity 0.2s ease 0.1s, visibility 0s linear 0.3s !important;
                    }
                    
                    html[data-sidebar-size="sm"] .nav-item:hover .menu-dropdown,
                    html[data-sidebar-size="sm-hover"] .nav-item:hover .menu-dropdown,
                    [data-sidebar-size="sm"] .nav-item:hover .menu-dropdown,
                    [data-sidebar-size="sm-hover"] .nav-item:hover .menu-dropdown {
                        transition-delay: 0s !important;
                    }
                        
 
                  html[data-sidebar-size="sm"] #scrollbar,
                  html[data-sidebar-size="sm-hover"] #scrollbar {
                  height: calc(100vh - 80px) !important;
                     }
                     
                    /* Create invisible bridge between icon and panel to maintain hover */
                    html[data-sidebar-size="sm"] .nav-item .menu-dropdown::after,
                    html[data-sidebar-size="sm-hover"] .nav-item .menu-dropdown::after,
                    [data-sidebar-size="sm"] .nav-item .menu-dropdown::after,
                    [data-sidebar-size="sm-hover"] .nav-item .menu-dropdown::after {
                        content: '' !important;
                        position: absolute !important;
                        left: -70px !important;
                        top: 0 !important;
                        width: 70px !important;
                        height: 100% !important;
                        background: transparent !important;
                        z-index: -1 !important;
                    }
                    
                    /* Make nav-item fill full width to catch hover */
                    html[data-sidebar-size="sm"] .nav-item,
                    html[data-sidebar-size="sm-hover"] .nav-item,
                    [data-sidebar-size="sm"] .nav-item,
                    [data-sidebar-size="sm-hover"] .nav-item {
                        position: relative !important;
                    }
                    
                    /* Add group title header to dropdown */
                    html[data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown::before,
                    html[data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown::before,
                    [data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown::before,
                    [data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown::before {
                        content: attr(data-group-name) !important;
                        display: block !important;
                        padding: 10px 15px 8px !important;
                        background: rgba(0, 0, 0, 0.2) !important;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                        font-size: 11px !important;
                        font-weight: bold !important;
                        color: white !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.5px !important;
                        border-radius: 4px 4px 0 0 !important;
                    }
                    
                    /* Adjust padding for dropdown items */
                    html[data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-sm,
                    html[data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-sm,
                    [data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-sm,
                    [data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-sm {
                        padding: 8px 0 !important;
                    }
                    
                    html[data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-item,
                    html[data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-item,
                    [data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-item,
                    [data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-item {
                        position: relative !important;
                        width: 100% !important;
                        margin: 0 !important;
                        opacity: 1 !important;
                        transform: none !important;
                    }
                    
                    html[data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-link,
                    html[data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-link,
                    [data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-link,
                    [data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-link {
                        padding: 8px 15px !important;
                        width: 100% !important;
                        text-align: left !important;
                        justify-content: flex-start !important;
                        white-space: nowrap !important;
                        position: relative !important;
                        font-size: 12px !important;
                    }
                    
                    html[data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-link span,
                    html[data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-link span,
                    [data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-link span,
                    [data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-link span {
                        display: inline-block !important;
                        padding-left: 0 !important;
                        font-size: 12px !important;
                    }
                    
                    /* Prevent submenu items from creating their own nested panels */
                    html[data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-item .menu-dropdown,
                    html[data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-item .menu-dropdown,
                    [data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-item .menu-dropdown,
                    [data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-item .menu-dropdown {
                        position: static !important;
                        box-shadow: none !important;
                        background: transparent !important;
                        padding: 0 0 0 15px !important;
                        margin: 0 !important;
                        max-height: 1500px !important;
                        opacity: 1 !important;
                        overflow: visible !important;
                        left: auto !important;
                        top: auto !important;
                        min-width: auto !important;
                        max-width: none !important;
                        border-radius: 0 !important;
                    }
                    
                    /* Ensure nested items are always visible when parent is hovered */
                    html[data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .menu-dropdown,
                    html[data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .menu-dropdown,
                    [data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .menu-dropdown,
                    [data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .menu-dropdown {
                        max-height: 1500px !important;
                        opacity: 1 !important;
                        overflow: visible !important;
                    }
                    
                    /* Remove ::before for nested dropdowns */
                    html[data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .menu-dropdown::before,
                    html[data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .menu-dropdown::before,
                    [data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .menu-dropdown::before,
                    [data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .menu-dropdown::before {
                        display: none !important;
                    }
                    
                    /* Style nested menu items */
                    html[data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-item .menu-dropdown .nav-link,
                    html[data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-item .menu-dropdown .nav-link,
                    [data-sidebar-size="sm"] .nav-item:hover > .menu-dropdown .nav-item .menu-dropdown .nav-link,
                    [data-sidebar-size="sm-hover"] .nav-item:hover > .menu-dropdown .nav-item .menu-dropdown .nav-link {
                        padding: 6px 15px 6px 30px !important;
                        font-size: 11px !important;
                        background: rgba(0, 0, 0, 0.1) !important;
                    }
                    
                    .navbar-nav .nav-link:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                    
                    /* Chevron for menu items with children */
                    .navbar-nav .menu-link[data-bs-toggle="collapse"]:after {
                        content: "\\203A";
                        position: absolute;
                        right: 15px;
                        font-size: 28px !important;
                        font-weight: bold;
                        transition: transform 0.3s ease;
                        color: rgba(255, 255, 255, 1) !important;
                        margin-bottom: 10px !important;
                    }
                    
                    .navbar-nav .menu-link[data-bs-toggle="collapse"][aria-expanded="true"]:after {
                        transform: rotate(90deg);
                        color: rgba(255, 255, 255, 0.9);
                    }
                    
                    /* Scrollbar */
                    .simplebar-track.simplebar-vertical {
                        width: 4px;
                        background: rgba(255, 255, 255, 0.05);
                    }
                    
                    .simplebar-scrollbar::before {
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 4px;
                    }
                `}
            </style>
            <div className="app-menu navbar-menu minimal-sidebar">
                <div className="navbar-brand-box minimal-logo-box">
                    <Link to="/dashboard" className="logo logo-dark">
                        <span className="logo-sm">
                            <img src={logoSrc} alt={adminData?.companyName || "Company Logo"} height="34" style={{ objectFit: "contain" }} />
                        </span>
                        <span className="logo-lg">
                            <img src={logoSrc} alt={adminData?.companyName || "Company Logo"} height="60" style={{ objectFit: "contain" }} />
                        </span>
                    </Link>

                    <Link to="/dashboard" className="logo logo-light">
                        <span className="logo-sm">
                            <img src={logoSrc} alt={adminData?.companyName || "Company Logo"} height="34" style={{ objectFit: "contain" }} />
                        </span>
                        <span className="logo-lg">
                            <img src={logoSrc} alt={adminData?.companyName || "Company Logo"} height="60" style={{ objectFit: "contain" }} />
                        </span>
                    </Link>
                    <button
                        onClick={addEventListenerOnSmHoverMenu}
                        type="button"
                        className="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover"
                        id="vertical-hover"
                            aria-label="Toggle hover-expand sidebar"
                    >
                        <i className="ri-record-circle-line"></i>
                    </button>
                </div>
                {layoutContent}
            </div>
            <div className="vertical-overlay"></div>
        </React.Fragment>
    );
};

Sidebar.propTypes = {
    layoutType: PropTypes.string,
};

export default Sidebar;

