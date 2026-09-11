import React, { useContext } from "react";
import ProfileDropdown from "../Components/Common/ProfileDropdown";
import UniversalSearch from "../Components/Common/UniversalSearch";
import PropTypes from "prop-types";
import { AuthContext } from "../context/AuthContext";

const Header = ({ onChangeLayoutMode, layoutModeType, headerClass, onToggleSettings, showSearchMenu }) => {
    const { adminData } = useContext(AuthContext);
    const handleHorizontalLayout = () => {
        console.log("Layout: horizontal");
        document.body.classList.contains("menu")
            ? document.body.classList.remove("menu")
            : document.body.classList.add("menu");
    };

    const handleVerticalLayout = (windowSize) => {
        console.log("Layout: vertical");
        if (windowSize < 1025 && windowSize > 767) {
            console.log("Window size 767-1025: toggling sm/''");
            document.body.classList.remove("vertical-sidebar-enable");
            if (document.documentElement.dataset.sidebarSize === "sm") {
                document.documentElement.dataset.sidebarSize = "";
            } else {
                document.documentElement.dataset.sidebarSize = "sm";
            }
        } else if (windowSize > 1025) {
            console.log("Window size >1025: toggling lg/sm");
            document.body.classList.remove("vertical-sidebar-enable");
            const currentSize =
                document.documentElement.dataset.sidebarSize;
            console.log("Current sidebar size:", currentSize);

            if (currentSize === "lg" || !currentSize) {
                console.log("Setting to sm");
                document.documentElement.dataset.sidebarSize = "sm";
            } else {
                console.log("Setting to lg");
                document.documentElement.dataset.sidebarSize = "lg";
            }

            const newSize =
                document.documentElement.dataset.sidebarSize;
            console.log("New sidebar size:", newSize);
        } else if (windowSize <= 767) {
            console.log("Window size <=767: mobile");
            document.body.classList.toggle("vertical-sidebar-enable");
            document.documentElement.dataset.sidebarSize = "lg";
        }
    };

    const handleTwoColumnLayout = () => {
        console.log("Layout: twocolumn");
        document.body.classList.contains("twocolumn-panel")
            ? document.body.classList.remove("twocolumn-panel")
            : document.body.classList.add("twocolumn-panel");
    };

    const toogleMenuBtn = () => {
        console.log("🍔 Hamburger button clicked!");
        const windowSize = document.documentElement.clientWidth;
        console.log("Window size:", windowSize);

        if (windowSize > 767)
            document.querySelector(".hamburger-icon").classList.toggle("open");

        const layout = document.documentElement.dataset.layout;

        if (layout === "horizontal") {
            handleHorizontalLayout();
        } else if (layout === "vertical") {
            handleVerticalLayout(windowSize);
        } else if (layout === "twocolumn") {
            handleTwoColumnLayout();
        }
    };
    return (
        <header id="page-topbar" className="shadow-lg">
            <div className="">
                <div
                    className="d-flex align-items-center justify-content-between"
                
                >
                    <div className="d-flex">
                        <button
                            onClick={toogleMenuBtn}
                            type="button"
                            className="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger"
                            id="topnav-hamburger-icon"
                        >
                            <span className="hamburger-icon">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>
                        </button>
                    </div>

                    {showSearchMenu && <UniversalSearch />}
                    <div className="d-flex align-items-center">
                        {adminData?.isSuperAdmin && (
                            <button
                                type="button"
                                className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle me-2"
                                onClick={onToggleSettings}
                                title="Theme Settings"
                                style={{ width: "38px", height: "38px", padding: 0 }}
                            >
                                <i className="ri-settings-3-line fs-22 align-middle"></i>
                            </button>
                        )}
                        <ProfileDropdown />
                    </div>
                </div>
            </div>
        </header>
    );
};

Header.propTypes = {
    onChangeLayoutMode: PropTypes.func,
    layoutModeType: PropTypes.string,
    headerClass: PropTypes.string,
    onToggleSettings: PropTypes.func,
    showSearchMenu: PropTypes.bool,
};

export default Header;
