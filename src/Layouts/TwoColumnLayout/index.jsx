/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from "prop-types";
import { Collapse, Container } from 'reactstrap';
import withRouter from '../../Components/Common/withRouter';

// Import Data
import navdata from "../LayoutMenuData";
import VerticalLayout from "../VerticalLayouts";

//SimpleBar
import SimpleBar from "simplebar-react";

const TwoColumnSubSubChildMenuItem = ({ childItem, t }) => {
    return (
        <li className="nav-item">
            <Link to={childItem.link ? childItem.link : "/#"} className="nav-link">
                {t ? t(childItem.label) : childItem.label}
            </Link>
        </li>
    );
};

TwoColumnSubSubChildMenuItem.propTypes = {
    childItem: PropTypes.shape({
        link: PropTypes.string,
        label: PropTypes.string,
    }).isRequired,
    t: PropTypes.any,
};

const TwoColumnChildMenuItem = ({ childItem, t, parentId }) => {
    return (
        <li className="nav-item">
            <Link
                to={childItem.link ? childItem.link : "/#"}
                onClick={childItem.click}
                className="nav-link"
            >
                {t ? t(childItem.label) : childItem.label}
            </Link>
            <Collapse className="menu-dropdown" isOpen={childItem.stateVariables} id={parentId}>
                <ul className="nav nav-sm flex-column">
                    {childItem.isChildItem && (
                        (childItem.childItems || []).map((subChildItem, key) => (
                            <TwoColumnSubSubChildMenuItem key={subChildItem.id || subChildItem.link || subChildItem.label || key} childItem={subChildItem} t={t} />
                        ))
                    )}
                </ul>
            </Collapse>
        </li>
    );
};

TwoColumnChildMenuItem.propTypes = {
    childItem: PropTypes.shape({
        link: PropTypes.string,
        click: PropTypes.func,
        label: PropTypes.string,
        stateVariables: PropTypes.any,
        isChildItem: PropTypes.bool,
        childItems: PropTypes.array,
    }).isRequired,
    t: PropTypes.any,
    parentId: PropTypes.any,
};

const TwoColumnSubMenuItem = ({ subItem, t, parentId }) => {
    if (!subItem.isChildItem) {
        return (
            <li className="nav-item">
                <Link to={subItem.link ? subItem.link : "/#"} className="nav-link">
                    {t ? t(subItem.label) : subItem.label}
                    {subItem.badgeName ? (
                        <span className={"badge badge-pill bg-" + subItem.badgeColor} data-key="t-new">
                            {subItem.badgeName}
                        </span>
                    ) : null}
                </Link>
            </li>
        );
    }

    return (
        <li className="nav-item">
            <Link
                onClick={subItem.click}
                className="nav-link"
                to="/#"
                data-bs-toggle="collapse"
            >
                {t ? t(subItem.label) : subItem.label}
            </Link>
            <Collapse className="menu-dropdown" isOpen={subItem.stateVariables} id={parentId}>
                <ul className="nav nav-sm flex-column">
                    {subItem.childItems && (
                        (subItem.childItems || []).map((childItem, key) => (
                            <TwoColumnChildMenuItem key={childItem.id || childItem.link || childItem.label || key} childItem={childItem} t={t} parentId={parentId} />
                        ))
                    )}
                </ul>
            </Collapse>
        </li>
    );
};

TwoColumnSubMenuItem.propTypes = {
    subItem: PropTypes.shape({
        isChildItem: PropTypes.bool,
        link: PropTypes.string,
        label: PropTypes.string,
        badgeName: PropTypes.string,
        badgeColor: PropTypes.string,
        click: PropTypes.func,
        stateVariables: PropTypes.any,
        childItems: PropTypes.array,
    }).isRequired,
    t: PropTypes.any,
    parentId: PropTypes.any,
};

const activateIconSidebarActive = (id) => {
    const menu = document.querySelector("#two-column-menu .simplebar-content-wrapper a[subitems='" + id + "'].nav-icon");
    if (menu !== null) {
        menu.classList.add("active");
    }
};

const TwoColumnLayout = (props) => {
    const navData = navdata().props.children;
    const activateParentDropdown = useCallback((item) => {
        item.classList.add("active");
        let parentCollapseDiv = item.closest(".collapse.menu-dropdown");
        if (parentCollapseDiv) {
            // to set aria expand true remaining
            parentCollapseDiv.classList.add("show");
            parentCollapseDiv.parentElement.children[0].classList.add("active");
            parentCollapseDiv.parentElement.children[0].setAttribute("aria-expanded", "true");
            if (parentCollapseDiv.parentElement.closest(".collapse.menu-dropdown")) {
                parentCollapseDiv.parentElement.closest(".collapse").classList.add("show");
                const parentParentCollapse = parentCollapseDiv.parentElement.closest(".collapse").previousElementSibling;
                if (parentParentCollapse) {
                    parentParentCollapse.classList.add("active");
                    if (parentParentCollapse.closest(".collapse.menu-dropdown")) {
                        parentParentCollapse.closest(".collapse.menu-dropdown").classList.add("show");
                    }
                }
            }
            activateIconSidebarActive(parentCollapseDiv.getAttribute("id"));
            return true;
        }
        return false;
    }, []);

    const path = props.router.location.pathname;

    const initMenu = useCallback(() => {
        const pathName = (import.meta.env.BASE_URL || '') + path;
        const ul = document.getElementById("navbar-nav");
        const items = ul.getElementsByTagName("a");
        let itemsArray = [...items]; // converts NodeList to Array
        removeActivation(itemsArray);
        let matchingMenuItem = itemsArray.find((x) => {
            return x.pathname === pathName;
        });
        if (matchingMenuItem) {
            activateParentDropdown(matchingMenuItem);
        } else {
            let id = "";
            if (import.meta.env.BASE_URL) {
                id = pathName.replace(import.meta.env.BASE_URL, '');
                id = id.replace("/", "");
            } else {
                id = pathName.replace("/", "");
            }
            if (id) document.body.classList.add('twocolumn-panel');
            activateIconSidebarActive(id);
        }
    }, [path, activateParentDropdown]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        initMenu();
    }, [path, initMenu]);

    const removeActivation = (items) => {
        let activeItems = items.filter((x) => x.classList.contains("active"));
        activeItems.forEach((item) => {
            if (item.classList.contains("menu-link")) {
                if (!item.classList.contains("active")) {
                    item.setAttribute("aria-expanded", false);
                }
                item.nextElementSibling.classList.remove("show");
            }
            if (item.classList.contains("nav-link")) {
                if (item.nextElementSibling) {
                    item.nextElementSibling.classList.remove("show");
                }
                item.setAttribute("aria-expanded", false);
            }
            item.classList.remove("active");
        });

        const ul = document.getElementById("two-column-menu");
        const iconItems = ul.getElementsByTagName("a");
        let itemsArray = [...iconItems];
        let activeIconItems = itemsArray.filter((x) => x.classList.contains("active"));
        activeIconItems.forEach((item) => {
            item.classList.remove("active");
            const id = item.getAttribute("subitems");
            if (document.getElementById(id))
                document.getElementById(id).classList.remove("show");
        });
    };

    // Resize sidebar
    const [isMenu, setIsMenu] = useState("twocolumn");
    const windowResizeHover = () => {
        initMenu();
        const windowSize = document.documentElement.clientWidth;
        if (windowSize < 767) {
            document.documentElement.dataset.layout = "vertical";
            setIsMenu('vertical');
        }
        else {
            document.documentElement.dataset.layout = "twocolumn";
            setIsMenu('twocolumn');
        }
    };

    useEffect(function setupListener() {
        if (props.layoutType === 'twocolumn') {
            window.addEventListener('resize', windowResizeHover);

            // remove classname when component will unmount
            return function cleanupListener() {
                window.removeEventListener('resize', windowResizeHover);
            };
        }
    });
    return (
        <React.Fragment>
            {isMenu === "twocolumn" ?
                <div id="scrollbar">
                    <Container fluid>
                        <div id="two-column-menu">
                            <SimpleBar className="twocolumn-iconview">
                                <Link to="#" className="logo">
                                    <img src={props.logo} alt="" height="22" />
                                </Link>
                                {(navData || []).map((item, key) => (
                                    <React.Fragment key={item.id || item.link || item.label || key}>
                                        {item.icon && (
                                            item.subItems ? (
                                                <li>
                                                    <Link
                                                        onClick={item.click}
                                                        to="#"
                                                        subitems={item.id}
                                                        className="nav-icon"
                                                        data-bs-toggle="collapse">
                                                        <i className={item.icon}></i>
                                                    </Link>
                                                </li>

                                            ) : (
                                                <Link
                                                    onClick={item.click}
                                                    to={item.link ? item.link : "/#"}
                                                    subitems={item.id}
                                                    className="nav-icon"
                                                    data-bs-toggle="collapse">
                                                    <i className={item.icon}></i>
                                                </Link>
                                            )
                                        )}
                                    </React.Fragment>
                                ))}

                            </SimpleBar>
                        </div>
                        <SimpleBar id="navbar-nav" className="navbar-nav">
                            {(navData || []).map((item, key) => (
                                <React.Fragment key={item.id || item.link || item.label || key}>
                                    {item.subItems ? (
                                        <li className="nav-item">
                                            <Collapse
                                                className="menu-dropdown"
                                                isOpen={item.stateVariables}
                                                id={item.id}>
                                                <ul className="nav nav-sm flex-column test">
                                                    {item.subItems && ((item.subItems || []).map((subItem, key) => (
                                                        <TwoColumnSubMenuItem key={subItem.id || subItem.link || subItem.label || key} subItem={subItem} t={props.t} parentId={item.id} />
                                                    )))}
                                                </ul>
                                            </Collapse>
                                        </li>
                                    ) : null
                                    }
                                </React.Fragment>
                            ))}
                        </SimpleBar>
                    </Container>
                </div>
                :
                <SimpleBar id="scrollbar" className="h-100">
                    <Container fluid>
                        <div id="two-column-menu"></div>
                        <ul className="navbar-nav" id="navbar-nav">
                            <VerticalLayout />
                        </ul>
                    </Container>
                </SimpleBar>
            }
        </React.Fragment >
    );
};

TwoColumnLayout.propTypes = {
    router: PropTypes.shape({
        location: PropTypes.object.isRequired,
    }).isRequired,
    layoutType: PropTypes.string,
    logo: PropTypes.string,
    t: PropTypes.func,
};

export default withRouter(TwoColumnLayout);