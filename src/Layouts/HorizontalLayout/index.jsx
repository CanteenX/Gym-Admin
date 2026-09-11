import React, { useEffect, useState } from 'react';
import PropTypes from "prop-types";
import { Link } from 'react-router-dom';
import { Col, Collapse, Row } from 'reactstrap';
import withRouter from '../../Components/Common/withRouter';

// Import Data
import navdata from "../LayoutMenuData";

const MegaMenuDropdown = ({ subItems }) => {
    return (
        <Row>
            {(subItems || []).map((subItem, key) => (
                <Col lg={4} key={subItem.id || subItem.link || subItem.label || key}>
                    <ul className="nav nav-sm flex-column">
                        <li className="nav-item">
                            <Link to={subItem.link} className="nav-link">
                                {subItem.label}
                            </Link>
                        </li>
                    </ul>
                </Col>
            ))}
        </Row>
    );
};

MegaMenuDropdown.propTypes = {
    subItems: PropTypes.array,
};

const SubSubChildMenuItem = ({ item, t }) => {
    return (
        <li className="nav-item apex">
            <Link to={item.link ? item.link : "/#"} className="nav-link">
                {t(item.label)}
            </Link>
        </li>
    );
};

SubSubChildMenuItem.propTypes = {
    item: PropTypes.shape({
        link: PropTypes.string,
        label: PropTypes.string.isRequired,
    }).isRequired,
    t: PropTypes.func.isRequired,
};

const SubChildMenuItem = ({ subChildItem, t }) => {
    if (!subChildItem.isChildItem) {
        return (
            <li className="nav-item">
                <Link to={subChildItem.link ? subChildItem.link : "/#"} className="nav-link">
                    {t(subChildItem.label)}
                </Link>
            </li>
        );
    }

    return (
        <li className="nav-item">
            <Link
                onClick={subChildItem.click}
                className="nav-link"
                to="/#"
                data-bs-toggle="collapse"
            >
                {t(subChildItem.label)}
            </Link>
            <Collapse className="menu-dropdown" isOpen={subChildItem.stateVariables} id="sidebarEcommerce">
                <ul className="nav nav-sm flex-column">
                    {(subChildItem.childItems || []).map((subSubChildItem, key) => (
                        <SubSubChildMenuItem key={subSubChildItem.id || subSubChildItem.link || subSubChildItem.label || key} item={subSubChildItem} t={t} />
                    ))}
                </ul>
            </Collapse>
        </li>
    );
};

SubChildMenuItem.propTypes = {
    subChildItem: PropTypes.shape({
        isChildItem: PropTypes.bool,
        link: PropTypes.string,
        label: PropTypes.string.isRequired,
        click: PropTypes.func,
        stateVariables: PropTypes.bool,
        childItems: PropTypes.array,
    }).isRequired,
    t: PropTypes.func.isRequired,
};

const SubMenuItem = ({ subItem, t }) => {
    if (!subItem.isChildItem) {
        return (
            <li className="nav-item">
                <Link to={subItem.link ? subItem.link : "/#"} className="nav-link">
                    {t(subItem.label)}
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
                {t(subItem.label)}
            </Link>
            <Collapse className="menu-dropdown" isOpen={subItem.stateVariables} id="sidebarEcommerce">
                <ul className="nav nav-sm flex-column">
                    {(subItem.childItems || []).map((subChildItem, key) => (
                        <SubChildMenuItem key={subChildItem.id || subChildItem.link || subChildItem.label || key} subChildItem={subChildItem} t={t} />
                    ))}
                </ul>
            </Collapse>
        </li>
    );
};

SubMenuItem.propTypes = {
    subItem: PropTypes.shape({
        isChildItem: PropTypes.bool,
        link: PropTypes.string,
        label: PropTypes.string.isRequired,
        click: PropTypes.func,
        stateVariables: PropTypes.bool,
        childItems: PropTypes.array,
    }).isRequired,
    t: PropTypes.func.isRequired,
};

const NormalMenuDropdown = ({ subItems, t }) => {
    return (
        <ul className="nav nav-sm flex-column test">
            {(subItems || []).map((subItem, key) => (
                <SubMenuItem key={subItem.id || subItem.link || subItem.label || key} subItem={subItem} t={t} />
            ))}
        </ul>
    );
};

NormalMenuDropdown.propTypes = {
    subItems: PropTypes.array,
    t: PropTypes.func.isRequired,
};

const activateParentDropdown = (item) => {
    item.classList.add("active");
    let parentCollapseDiv = item.closest(".collapse.menu-dropdown");
    if (!parentCollapseDiv) return false;

    // to set aria expand true remaining
    parentCollapseDiv.classList.add("show");
    const parentFirstChild = parentCollapseDiv.parentElement?.children[0];
    if (parentFirstChild) {
        parentFirstChild.classList.add("active");
        parentFirstChild.setAttribute("aria-expanded", "true");
    }

    const isNestedCollapse = parentCollapseDiv.parentElement?.closest(".collapse.menu-dropdown");
    if (!isNestedCollapse) return true;

    const parentCollapse = parentCollapseDiv.parentElement.closest(".collapse");
    if (parentCollapse) {
        parentCollapse.classList.add("show");
    }

    const parentElementDiv = parentCollapse?.previousElementSibling;
    if (parentElementDiv) {
        const grandParentCollapse = parentElementDiv.closest(".collapse");
        if (grandParentCollapse) {
            grandParentCollapse.classList.add("show");
        }
        parentElementDiv.classList.add("active");
    }

    const parentElementSibling = parentElementDiv?.parentElement?.parentElement?.parentElement?.previousElementSibling;
    if (parentElementSibling) {
        parentElementSibling.classList.add("active");
    }

    return true;
};

const removeActivation = (items) => {
    let actiItems = items.filter((x) => x.classList.contains("active"));

    actiItems.forEach((item) => {
        if (item.classList.contains("menu-link")) {
            if (!item.classList.contains("active")) {
                item.setAttribute("aria-expanded", false);
            }
            if (item.nextElementSibling) {
                item.nextElementSibling.classList.remove("show");
            }
        }
        if (item.classList.contains("nav-link")) {
            if (item.nextElementSibling) {
                item.nextElementSibling.classList.remove("show");
            }
            item.setAttribute("aria-expanded", false);
        }
        item.classList.remove("active");
    });
};

const HorizontalLayout = (props) => {
    const [isMoreMenu, setIsMoreMenu] = useState(false);
    const navData = navdata().props.children;
    let menuItems = [];
    let splitMenuItems = [];
    let menuSplitContainer = 6;
    navData.forEach(function (value, key) {
        if (value['isHeader']) {
            menuSplitContainer++;
        }
        if (key >= menuSplitContainer) {
            let val = value;
            val.childItems = value.subItems;
            val.isChildItem = !!value.subItems;
            delete val.subItems;
            splitMenuItems.push(val);
        } else {
            menuItems.push(value);
        }
    });
    menuItems.push({ id: 'more', label: 'More', icon: 'ri-briefcase-2-line', link: "/#", stateVariables: isMoreMenu, subItems: splitMenuItems, click: function (e) { e.preventDefault(); setIsMoreMenu(!isMoreMenu); }, });

    const path = props.router.location.pathname;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const initMenu = () => {
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
            }
        };
        initMenu();
    }, [path, props.layoutType]);

    return (
        <React.Fragment>
            {(menuItems || []).map((item, key) => {
                const isHeader = item['isHeader'];
                const hasSubItems = !!item.subItems;
                const uniqueKey = item.id || item.link || item.label || key;

                if (isHeader) {
                    return (
                        <li className="menu-title" key={uniqueKey}>
                            <span data-key="t-menu">{props.t(item.label)}</span>
                        </li>
                    );
                }

                if (!hasSubItems) {
                    return (
                        <li className="nav-item" key={uniqueKey}>
                            <Link className="nav-link menu-link" to={item.link ? item.link : "/#"}>
                                <i className={item.icon}></i> <span>{props.t(item.label)}</span>
                            </Link>
                        </li>
                    );
                }

                const isMegaMenu = item.id === "baseUi" && item.subItems.length > 13;

                return (
                    <li className="nav-item" key={uniqueKey}>
                        <Link
                            onClick={item.click}
                            className="nav-link menu-link"
                            to={item.link ? item.link : "/#"}
                            data-bs-toggle="collapse"
                        >
                            <i className={item.icon}></i> <span data-key="t-apps">{props.t(item.label)}</span>
                        </Link>
                        <Collapse
                            className={isMegaMenu ? "menu-dropdown mega-dropdown-menu" : "menu-dropdown"}
                            isOpen={item.stateVariables}
                            id="sidebarApps"
                        >
                            {isMegaMenu ? (
                                <MegaMenuDropdown subItems={item.subItems} />
                            ) : (
                                <NormalMenuDropdown subItems={item.subItems} t={props.t} />
                            )}
                        </Collapse>
                    </li>
                );
            })}
        </React.Fragment>
    );
};

HorizontalLayout.propTypes = {
    t: PropTypes.func,
    layoutType: PropTypes.string,
    router: PropTypes.shape({
        location: PropTypes.object.isRequired,
    }).isRequired,
};

export default withRouter(HorizontalLayout);