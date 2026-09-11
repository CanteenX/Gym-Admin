import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    Input,
    Label,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
} from "reactstrap";
import "./IconPicker.css";

// Popular icons from Remix Icon and Boxicons libraries categorized: "general", "content", "analytics", "system"
const ICON_LIST = [
    // --- GENERAL CATEGORY ---
    { name: "No Icon", class: "", category: "general" },
    { name: "Home", class: "ri-home-line", category: "general" },
    { name: "Dashboard", class: "ri-dashboard-line", category: "general" },
    { name: "Grid", class: "ri-grid-line", category: "general" },
    { name: "List", class: "ri-list-check", category: "general" },
    { name: "Menu", class: "ri-menu-line", category: "general" },
    { name: "Search", class: "ri-search-line", category: "general" },
    { name: "Filter", class: "ri-filter-line", category: "general" },
    { name: "Edit", class: "ri-edit-line", category: "general" },
    { name: "Delete", class: "ri-delete-bin-line", category: "general" },
    { name: "Add", class: "ri-add-line", category: "general" },
    { name: "Close", class: "ri-close-line", category: "general" },
    { name: "Check", class: "ri-check-line", category: "general" },
    { name: "Info", class: "ri-information-line", category: "general" },
    { name: "Warning", class: "ri-error-warning-line", category: "general" },
    { name: "Star", class: "ri-star-line", category: "general" },
    { name: "Heart", class: "ri-heart-line", category: "general" },
    { name: "Bookmark", class: "ri-bookmark-line", category: "general" },
    { name: "Award", class: "ri-award-line", category: "general" },
    { name: "Trophy", class: "ri-trophy-line", category: "general" },
    { name: "Gift", class: "ri-gift-line", category: "general" },
    { name: "Home (Box)", class: "bx bx-home", category: "general" },
    { name: "Menu (Box)", class: "bx bx-menu", category: "general" },
    { name: "Grid (Box)", class: "bx bx-grid-alt", category: "general" },
    { name: "Search (Box)", class: "bx bx-search", category: "general" },
    { name: "Award (Box)", class: "bx bx-award", category: "general" },
    { name: "Star (Box)", class: "bx bx-star", category: "general" },

    // --- CONTENT & MEDIA CATEGORY ---
    { name: "File", class: "ri-file-line", category: "content" },
    { name: "Folder", class: "ri-folder-line", category: "content" },
    { name: "Book", class: "ri-book-line", category: "content" },
    { name: "Image", class: "ri-image-line", category: "content" },
    { name: "Camera", class: "ri-camera-line", category: "content" },
    { name: "Video", class: "ri-video-line", category: "content" },
    { name: "Music", class: "ri-music-line", category: "content" },
    { name: "File (Box)", class: "bx bx-file", category: "content" },
    { name: "Folder (Box)", class: "bx bx-folder", category: "content" },
    { name: "Article", class: "ri-article-line", category: "content" },
    { name: "Hashtag", class: "ri-hashtag", category: "content" },
    { name: "Price Tag", class: "ri-price-tag-3-line", category: "content" },
    { name: "News (Box)", class: "bx bx-news", category: "content" },
    { name: "Open Book", class: "ri-book-open-line", category: "content" },
    { name: "Q&A Discussion", class: "ri-question-answer-line", category: "content" },
    { name: "Support Headset", class: "ri-customer-service-2-line", category: "content" },
    { name: "Help Circle (Box)", class: "bx bx-help-circle", category: "content" },
    { name: "Video Guide", class: "ri-video-chat-line", category: "content" },

    // --- ANALYTICS & FINANCE CATEGORY ---
    { name: "Chart", class: "ri-bar-chart-line", category: "analytics" },
    { name: "Money", class: "ri-money-dollar-circle-line", category: "analytics" },
    { name: "Wallet", class: "ri-wallet-line", category: "analytics" },
    { name: "Credit Card", class: "ri-bank-card-line", category: "analytics" },
    { name: "Chart (Box)", class: "bx bx-bar-chart", category: "analytics" },
    { name: "Money (Box)", class: "bx bx-dollar", category: "analytics" },
    { name: "Coins", class: "ri-coins-line", category: "analytics" },
    { name: "Analytics Box", class: "ri-bar-chart-box-line", category: "analytics" },

    // --- SYSTEM, HR & SECURITY CATEGORY ---
    { name: "Settings", class: "ri-settings-line", category: "system" },
    { name: "User", class: "ri-user-line", category: "system" },
    { name: "Users", class: "ri-team-line", category: "system" },
    { name: "Mail", class: "ri-mail-line", category: "system" },
    { name: "Calendar", class: "ri-calendar-line", category: "system" },
    { name: "Clock", class: "ri-time-line", category: "system" },
    { name: "Bell", class: "ri-notification-line", category: "system" },
    { name: "Lock", class: "ri-lock-line", category: "system" },
    { name: "Unlock", class: "ri-lock-unlock-line", category: "system" },
    { name: "Eye", class: "ri-eye-line", category: "system" },
    { name: "Download", class: "ri-download-line", category: "system" },
    { name: "Upload", class: "ri-upload-line", category: "system" },
    { name: "Share", class: "ri-share-line", category: "system" },
    { name: "Link", class: "ri-link", category: "system" },
    { name: "External Link", class: "ri-external-link-line", category: "system" },
    { name: "Phone", class: "ri-phone-line", category: "system" },
    { name: "Map Pin", class: "ri-map-pin-line", category: "system" },
    { name: "Building", class: "ri-building-line", category: "system" },
    { name: "Bank", class: "ri-bank-line", category: "system" },
    { name: "Store", class: "ri-store-line", category: "system" },
    { name: "Shopping Cart", class: "ri-shopping-cart-line", category: "system" },
    { name: "Language", class: "ri-global-line", category: "system" },
    { name: "User (Box)", class: "bx bx-user", category: "system" },
    { name: "Users (Box)", class: "bx bx-group", category: "system" },
    { name: "Settings (Box)", class: "bx bx-cog", category: "system" },
    { name: "Calendar (Box)", class: "bx bx-calendar", category: "system" },
    { name: "Mail (Box)", class: "bx bx-envelope", category: "system" },
    { name: "Bell (Box)", class: "bx bx-bell", category: "system" },
    { name: "Shopping Cart (Box)", class: "bx bx-cart", category: "system" },
    { name: "User Settings", class: "ri-user-settings-line", category: "system" },
    { name: "Hierarchy", class: "ri-git-branch-line", category: "system" },
    { name: "Organization (Box)", class: "bx bx-git-branch", category: "system" },
    { name: "Briefcase", class: "ri-briefcase-line", category: "system" },
    { name: "Assign Role (Box)", class: "bx bx-user-check", category: "system" },
    { name: "Map / States", class: "ri-map-2-line", category: "system" },
    { name: "Pin (Box)", class: "bx bx-navigation", category: "system" },
    { name: "User Shield", class: "ri-shield-user-line", category: "system" },
    { name: "Shield (Box)", class: "bx bx-shield-quarter", category: "system" },
    { name: "Key / JWT", class: "ri-key-2-line", category: "system" },
    { name: "Key (Box)", class: "bx bx-key", category: "system" },
    { name: "Activity Logs", class: "ri-pulse-line", category: "system" },
    { name: "Database Logs", class: "ri-database-2-line", category: "system" },
    { name: "Maintenance Tools", class: "ri-tools-line", category: "system" },
    { name: "Server Panel", class: "ri-server-line", category: "system" },
];

const IconPicker = ({ value, onChange, label, error, required }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [visibleCount, setVisibleCount] = useState(40);

    const toggle = () => setDropdownOpen(!dropdownOpen);

    // Reset pagination when search or category changes
    useEffect(() => {
        setVisibleCount(40);
    }, [searchTerm, selectedCategory]);

    const filteredIcons = ICON_LIST.filter((icon) => {
        const matchesSearch =
            icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            icon.class.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
            selectedCategory === "all" || icon.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const iconsToRender = filteredIcons.slice(0, visibleCount);

    const handleIconSelect = (iconClass) => {
        onChange(iconClass);
        setDropdownOpen(false);
        setSearchTerm("");
    };

    const selectedIcon = ICON_LIST.find((icon) => icon.class === value);

    return (
        <div className="icon-picker-wrapper mb-3">
            <Label>
                {label} {required && <span className="text-danger">*</span>}
            </Label>
            <Dropdown isOpen={dropdownOpen} toggle={toggle} className="w-100">
                <DropdownToggle
                    caret
                    className="w-100 d-flex align-items-center justify-content-between icon-picker-toggle"
                    style={{
                        backgroundColor: "white",
                        border: "1px solid #ced4da",
                        color: "#495057",
                        padding: "0.65rem 1rem",
                        borderRadius: "0.375rem",
                        height: "48px",
                    }}
                >
                    <div className="d-flex align-items-center">
                        {value && (
                            <i
                                className={`${value} me-2`}
                                style={{ fontSize: "18px" }}
                            ></i>
                        )}
                        <span>
                            {selectedIcon ? selectedIcon.name : "Select Icon"}
                        </span>
                    </div>
                </DropdownToggle>
                <DropdownMenu
                    className="icon-picker-menu p-0"
                    style={{
                        maxHeight: "450px",
                        overflowY: "auto",
                        width: "100%",
                    }}
                >
                    {/* Sticky Search Box */}
                    <div
                        className="p-2"
                        style={{
                            position: "sticky",
                            top: 0,
                            backgroundColor: "white",
                            borderBottom: "1px solid #dee2e6",
                            zIndex: 3,
                        }}
                    >
                        <Input
                            type="text"
                            placeholder="Search icons..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* Sticky Category Tabs */}
                    <div
                        className="category-tabs d-flex flex-wrap gap-1 p-2 bg-light border-bottom"
                        style={{
                            position: "sticky",
                            top: "49px",
                            zIndex: 2,
                            backgroundColor: "#f3f6f9",
                        }}
                    >
                        {[
                            { id: "all", label: "All" },
                            { id: "general", label: "General" },
                            { id: "content", label: "Content / Media" },
                            { id: "analytics", label: "Analytics" },
                            { id: "system", label: "System & Security" },
                        ].map((tab) => (
                            <button
                                type="button"
                                key={tab.id}
                                className={`btn btn-sm ${
                                    selectedCategory === tab.id
                                        ? "btn-success"
                                        : "btn-soft-success"
                                }`}
                                style={{
                                    fontSize: "11px",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    border: "none",
                                    transition: "all 0.15s ease",
                                    fontWeight:
                                        selectedCategory === tab.id ? "600" : "400",
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCategory(tab.id);
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Scrollable Icon Grid */}
                    <div className="p-2">
                        <div
                            className="icon-grid"
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fill, minmax(120px, 1fr))",
                                gap: "8px",
                            }}
                        >
                            {iconsToRender.map((icon) => (
                                <DropdownItem
                                    key={icon.name}
                                    onClick={() => handleIconSelect(icon.class)}
                                    className={`icon-item ${
                                        value === icon.class ? "active" : ""
                                    }`}
                                    title={icon.class || "No Icon"}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        padding: "12px 8px",
                                        cursor: "pointer",
                                        borderRadius: "4px",
                                        border:
                                            value === icon.class
                                                ? "2px solid #009069"
                                                : "1px solid transparent",
                                        backgroundColor:
                                            value === icon.class
                                                ? "rgba(0, 144, 105, 0.1)"
                                                : "transparent",
                                        transition: "all 0.2s",
                                        whiteSpace: "normal",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (value !== icon.class) {
                                            e.currentTarget.style.backgroundColor =
                                                "#f8f9fa";
                                            e.currentTarget.style.borderColor =
                                                "#dee2e6";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (value !== icon.class) {
                                            e.currentTarget.style.backgroundColor =
                                                "transparent";
                                            e.currentTarget.style.borderColor =
                                                "transparent";
                                        }
                                    }}
                                >
                                    {icon.class && (
                                        <i
                                            className={icon.class}
                                            style={{
                                                fontSize: "24px",
                                                marginBottom: "4px",
                                            }}
                                        ></i>
                                    )}
                                    {!icon.class && (
                                        <div
                                            style={{
                                                height: "24px",
                                                marginBottom: "4px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#999",
                                                }}
                                            >
                                                None
                                            </span>
                                        </div>
                                    )}
                                    <small
                                        style={{
                                            fontSize: "10px",
                                            textAlign: "center",
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {icon.name}
                                    </small>
                                </DropdownItem>
                            ))}
                        </div>

                        {/* Pagination / Load More */}
                        {filteredIcons.length > visibleCount && (
                            <div className="text-center p-3 border-top mt-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-success"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setVisibleCount((prev) => prev + 40);
                                    }}
                                >
                                    Load More (+40)
                                </button>
                            </div>
                        )}

                        {filteredIcons.length === 0 && (
                            <div className="text-center text-muted p-3">
                                No icons found
                            </div>
                        )}
                    </div>
                </DropdownMenu>
            </Dropdown>
            {error && <p className="text-danger mt-1 small">{error}</p>}
            <small className="form-text text-muted">
                Icon will be displayed in the sidebar menu
            </small>
        </div>
    );
};

IconPicker.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    label: PropTypes.string,
    error: PropTypes.string,
    required: PropTypes.bool,
};

export default IconPicker;
