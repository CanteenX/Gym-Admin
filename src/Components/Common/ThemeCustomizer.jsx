import React, { useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Offcanvas, OffcanvasHeader, OffcanvasBody } from "reactstrap";
import { AuthContext } from "../../context/AuthContext";
import { updateCompanySettings } from "../../api/companies.api";
import { toast } from "react-toastify";

const ThemeCustomizer = ({ show, onClose, onThemeChange }) => {
    const { adminData, setAdminData } = useContext(AuthContext);

    // Initial state setup
    const [sidebarBgColor, setSidebarBgColor] = useState("#224c99");
    const [addButtonColor, setAddButtonColor] = useState("#4b7c5c");
    const [removeButtonColor, setRemoveButtonColor] = useState("#a83a32");
    const [addButtonTextColor, setAddButtonTextColor] = useState("#ffffff");
    const [removeButtonTextColor, setRemoveButtonTextColor] = useState("#ffffff");
    const [borderRadius, setBorderRadius] = useState("8px");
    const [themeType, setThemeType] = useState("solid");
    const [buttonType, setButtonType] = useState("contained");
    const [enableSearchMenu, setEnableSearchMenu] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load active settings when adminData changes
    useEffect(() => {
        if (adminData) {
            const savedBg = adminData.sidebarBgColor || "#224c99";
            setSidebarBgColor(savedBg);
            setAddButtonColor(adminData.addButtonColor || savedBg);
            setRemoveButtonColor(adminData.removeButtonColor || "#a83a32");
            setAddButtonTextColor(adminData.addButtonTextColor || "#ffffff");
            setRemoveButtonTextColor(adminData.removeButtonTextColor || "#ffffff");
            setEnableSearchMenu(adminData.enableSearchMenu !== false);
            if (adminData.buttonStyle) {
                setBorderRadius(adminData.buttonStyle.borderRadius || "8px");
                setThemeType(adminData.buttonStyle.themeType || "solid");
                setButtonType(adminData.buttonStyle.buttonType || "contained");
            }
        }
    }, [adminData]);

    // Call live preview handler in real-time as values change
    useEffect(() => {
        if (onThemeChange) {
            onThemeChange(sidebarBgColor, addButtonColor, removeButtonColor, borderRadius, themeType, buttonType, enableSearchMenu, addButtonTextColor, removeButtonTextColor);
        }
    }, [sidebarBgColor, addButtonColor, removeButtonColor, borderRadius, themeType, buttonType, enableSearchMenu, addButtonTextColor, removeButtonTextColor, onThemeChange]);

    const presets = [
        { name: "Royal Blue", hex: "#224c99" },
        { name: "Emerald Green", hex: "#0ab39c" },
        { name: "Charcoal Dark", hex: "#212529" },
        { name: "Plum Violet", hex: "#6f42c1" },
        { name: "Ruby Sunset", hex: "#b82a3c" },
        { name: "Teal Ocean", hex: "#017d88" },
    ];

    const handleSave = async () => {
        if (!adminData?._id) return;
        
        setIsSaving(true);
        try {
            const payload = {
                sidebarBgColor,
                addButtonColor,
                removeButtonColor,
                addButtonTextColor,
                removeButtonTextColor,
                buttonStyle: {
                    borderRadius,
                    themeType,
                    buttonType
                },
                enableSearchMenu
            };
            
            const response = await updateCompanySettings(adminData._id, payload);
            if (response.data.isOk) {
                // Update local context state so the changes apply instantly
                setAdminData(prev => ({
                    ...prev,
                    ...payload
                }));
                toast.success("Theme settings saved successfully!");
                onClose();
            }
        } catch (error) {
            console.error("Failed to update theme settings:", error);
            toast.error(error.response?.data?.message || "Failed to save theme settings.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Offcanvas isOpen={show} toggle={onClose} direction="end" className="theme-settings-offcanvas" backdrop={false}>
            <style>
                {`
                    .theme-settings-offcanvas {
                        width: 380px !important;
                        border-left: 1px solid rgba(0, 0, 0, 0.08);
                        box-shadow: -4px 0 30px rgba(0, 0, 0, 0.1);
                    }
                    
                    .preset-color-btn {
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        border: 2px solid transparent;
                        padding: 0;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                    }
                    
                    .preset-color-btn:hover {
                        transform: scale(1.1);
                        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                    }
                    
                    .preset-color-btn.active {
                        border-color: #212529;
                        transform: scale(1.05);
                    }

                    .preset-color-btn.active::after {
                        content: "\\2713";
                        color: white;
                        font-weight: bold;
                        font-size: 13px;
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    }
                    
                    .color-picker-wrapper {
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 10px 14px;
                        background: #f8fafc;
                        transition: all 0.2s;
                    }

                    .color-picker-wrapper:hover {
                        border-color: #cbd5e1;
                    }

                    .custom-color-input {
                        width: 44px;
                        height: 30px;
                        border: none;
                        padding: 0;
                        background: transparent;
                        cursor: pointer;
                    }

                    .custom-color-text-input {
                        font-family: monospace;
                        font-size: 13px;
                        border: 1px solid #cbd5e1;
                        border-radius: 6px;
                        padding: 4px 10px;
                        width: 100px;
                    }

                     .style-selector-group {
                         display: flex;
                         gap: 4px;
                         background: #f1f5f9;
                         padding: 4px;
                         border-radius: 8px;
                         align-items: stretch;
                     }
 
                     .style-btn {
                         flex: 1;
                         border: none;
                         background: transparent;
                         padding: 6px 4px;
                         font-size: 11px;
                         font-weight: 600;
                         border-radius: 6px;
                         color: #64748b;
                         transition: all 0.2s;
                         display: flex;
                         align-items: center;
                         justify-content: center;
                         text-align: center;
                         min-height: 34px;
                         line-height: 1.2;
                         margin: 0;
                     }
 
                     .style-btn.active {
                         background: white;
                         color: #0f172a;
                         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
                     }
 
                     .style-btn:hover:not(.active) {
                         color: #334155;
                     }
                `}
            </style>
            
            <OffcanvasHeader toggle={onClose} className="border-bottom p-4">
                <div className="d-flex align-items-center">
                    <i className="ri-settings-3-line text-primary fs-22 me-2 align-middle"></i>
                    <div>
                        <h5 className="mb-0 fw-semibold">Theme Customizer</h5>
                        <span className="text-muted fs-11">Personalize layout parameters</span>
                    </div>
                </div>
            </OffcanvasHeader>
            
            <OffcanvasBody className="p-4 d-flex flex-column justify-content-between">
                <div>
                    {/* Color Customizer Section */}
                    <div className="mb-4">
                        <span className="fw-semibold d-block text-dark mb-3 fs-13 text-uppercase letter-spacing-05">
                            Sidebar Background Color
                        </span>
                        
                        <div className="d-flex flex-wrap gap-2 mb-3">
                            {presets.map((preset) => (
                                <button
                                    key={preset.hex}
                                    type="button"
                                    className={`preset-color-btn ${sidebarBgColor.toLowerCase() === preset.hex.toLowerCase() ? "active" : ""}`}
                                    style={{ backgroundColor: preset.hex }}
                                    onClick={() => setSidebarBgColor(preset.hex)}
                                    title={preset.name}
                                />
                            ))}
                        </div>

                        <div className="color-picker-wrapper d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                                <div 
                                    className="position-relative border rounded overflow-hidden" 
                                    style={{ width: "42px", height: "32px", cursor: "pointer", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}
                                >
                                    <input
                                        type="color"
                                        value={sidebarBgColor}
                                        onChange={(e) => setSidebarBgColor(e.target.value)}
                                        className="position-absolute"
                                        style={{
                                            top: "-5px",
                                            left: "-5px",
                                            width: "52px",
                                            height: "42px",
                                            border: "none",
                                            padding: 0,
                                            margin: 0,
                                            cursor: "pointer",
                                            background: "none"
                                        }}
                                    />
                                </div>
                                <div className="d-flex flex-column">
                                    <span className="fs-12 fw-semibold text-dark">Sidebar Color</span>
                                    <span className="fs-10 text-muted">Click block to open</span>
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-1">
                                <span className="fs-12 text-muted fw-bold">#</span>
                                <input
                                    type="text"
                                    value={sidebarBgColor.replace("#", "").toUpperCase()}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.length <= 6) {
                                            setSidebarBgColor("#" + val);
                                        }
                                    }}
                                    className="custom-color-text-input text-uppercase text-center"
                                    maxLength={6}
                                    style={{ width: "90px" }}
                                />
                            </div>
                        </div>

                        <div className="color-picker-wrapper d-flex align-items-center justify-content-between mt-3">
                            <div className="d-flex align-items-center gap-2">
                                <div 
                                    className="position-relative border rounded overflow-hidden" 
                                    style={{ width: "42px", height: "32px", cursor: "pointer", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}
                                >
                                    <input
                                        type="color"
                                        value={addButtonColor}
                                        onChange={(e) => {
                                            setAddButtonColor(e.target.value);
                                        }}
                                        className="position-absolute"
                                        style={{
                                            top: "-5px",
                                            left: "-5px",
                                            width: "52px",
                                            height: "42px",
                                            border: "none",
                                            padding: 0,
                                            margin: 0,
                                            cursor: "pointer",
                                            background: "none"
                                        }}
                                    />
                                </div>
                                <div className="d-flex flex-column">
                                    <span className="fs-12 fw-semibold text-dark">Add / Save Actions</span>
                                    <span className="fs-10 text-muted">Success action buttons</span>
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-1">
                                <span className="fs-12 text-muted fw-bold">#</span>
                                <input
                                    type="text"
                                    value={addButtonColor.replace("#", "").toUpperCase()}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.length <= 6) {
                                            setAddButtonColor("#" + val);
                                        }
                                    }}
                                    className="custom-color-text-input text-uppercase text-center"
                                    maxLength={6}
                                    style={{ width: "90px" }}
                                />
                            </div>
                        </div>

                        <div className="color-picker-wrapper d-flex align-items-center justify-content-between mt-3">
                            <div className="d-flex align-items-center gap-2">
                                <div 
                                    className="position-relative border rounded overflow-hidden" 
                                    style={{ width: "42px", height: "32px", cursor: "pointer", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}
                                >
                                    <input
                                        type="color"
                                        value={addButtonTextColor}
                                        onChange={(e) => {
                                            setAddButtonTextColor(e.target.value);
                                        }}
                                        className="position-absolute"
                                        style={{
                                            top: "-5px",
                                            left: "-5px",
                                            width: "52px",
                                            height: "42px",
                                            border: "none",
                                            padding: 0,
                                            margin: 0,
                                            cursor: "pointer",
                                            background: "none"
                                        }}
                                    />
                                </div>
                                <div className="d-flex flex-column">
                                    <span className="fs-12 fw-semibold text-dark">Add Button Text</span>
                                    <span className="fs-10 text-muted">Text color of Add / Save</span>
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-1">
                                <span className="fs-12 text-muted fw-bold">#</span>
                                <input
                                    type="text"
                                    value={addButtonTextColor.replace("#", "").toUpperCase()}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.length <= 6) {
                                            setAddButtonTextColor("#" + val);
                                        }
                                    }}
                                    className="custom-color-text-input text-uppercase text-center"
                                    maxLength={6}
                                    style={{ width: "90px" }}
                                />
                            </div>
                        </div>

                        <div className="color-picker-wrapper d-flex align-items-center justify-content-between mt-3">
                            <div className="d-flex align-items-center gap-2">
                                <div 
                                    className="position-relative border rounded overflow-hidden" 
                                    style={{ width: "42px", height: "32px", cursor: "pointer", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}
                                >
                                    <input
                                        type="color"
                                        value={removeButtonColor}
                                        onChange={(e) => {
                                            setRemoveButtonColor(e.target.value);
                                        }}
                                        className="position-absolute"
                                        style={{
                                            top: "-5px",
                                            left: "-5px",
                                            width: "52px",
                                            height: "42px",
                                            border: "none",
                                            padding: 0,
                                            margin: 0,
                                            cursor: "pointer",
                                            background: "none"
                                        }}
                                    />
                                </div>
                                <div className="d-flex flex-column">
                                    <span className="fs-12 fw-semibold text-dark">Delete / Remove Actions</span>
                                    <span className="fs-10 text-muted">Danger action buttons</span>
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-1">
                                <span className="fs-12 text-muted fw-bold">#</span>
                                <input
                                    type="text"
                                    value={removeButtonColor.replace("#", "").toUpperCase()}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.length <= 6) {
                                            setRemoveButtonColor("#" + val);
                                        }
                                    }}
                                    className="custom-color-text-input text-uppercase text-center"
                                    maxLength={6}
                                    style={{ width: "90px" }}
                                />
                            </div>
                        </div>

                        <div className="color-picker-wrapper d-flex align-items-center justify-content-between mt-3">
                            <div className="d-flex align-items-center gap-2">
                                <div 
                                    className="position-relative border rounded overflow-hidden" 
                                    style={{ width: "42px", height: "32px", cursor: "pointer", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}
                                >
                                    <input
                                        type="color"
                                        value={removeButtonTextColor}
                                        onChange={(e) => {
                                            setRemoveButtonTextColor(e.target.value);
                                        }}
                                        className="position-absolute"
                                        style={{
                                            top: "-5px",
                                            left: "-5px",
                                            width: "52px",
                                            height: "42px",
                                            border: "none",
                                            padding: 0,
                                            margin: 0,
                                            cursor: "pointer",
                                            background: "none"
                                        }}
                                    />
                                </div>
                                <div className="d-flex flex-column">
                                    <span className="fs-12 fw-semibold text-dark">Remove Button Text</span>
                                    <span className="fs-10 text-muted">Text color of Remove / Cancel</span>
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-1">
                                <span className="fs-12 text-muted fw-bold">#</span>
                                <input
                                    type="text"
                                    value={removeButtonTextColor.replace("#", "").toUpperCase()}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.length <= 6) {
                                            setRemoveButtonTextColor("#" + val);
                                        }
                                    }}
                                    className="custom-color-text-input text-uppercase text-center"
                                    maxLength={6}
                                    style={{ width: "90px" }}
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="text-muted my-4 opacity-10" />

                    {/* Button Corner Styling */}
                    <div className="mb-4">
                        <span className="fw-semibold d-block text-dark mb-3 fs-13 text-uppercase letter-spacing-05">
                            Button Corner Styling
                        </span>
                        
                        <div className="style-selector-group">
                            <button
                                type="button"
                                className={`style-btn ${borderRadius === "0px" ? "active" : ""}`}
                                onClick={() => setBorderRadius("0px")}
                            >
                                Square
                            </button>
                            <button
                                type="button"
                                className={`style-btn ${borderRadius === "4px" ? "active" : ""}`}
                                onClick={() => setBorderRadius("4px")}
                            >
                                Rounded (4px)
                            </button>
                            <button
                                type="button"
                                className={`style-btn ${borderRadius === "8px" ? "active" : ""}`}
                                onClick={() => setBorderRadius("8px")}
                            >
                                Curved (8px)
                            </button>
                            <button
                                type="button"
                                className={`style-btn ${borderRadius === "30px" ? "active" : ""}`}
                                onClick={() => setBorderRadius("30px")}
                            >
                                Pill
                            </button>
                        </div>
                    </div>

                    {/* Button Theme Style */}
                    <div className="mb-4">
                        <span className="fw-semibold d-block text-dark mb-3 fs-13 text-uppercase letter-spacing-05">
                            Button Theme Style
                        </span>
                        
                        <div className="style-selector-group">
                            <button
                                type="button"
                                className={`style-btn ${themeType === "solid" ? "active" : ""}`}
                                onClick={() => setThemeType("solid")}
                            >
                                Solid Flat
                            </button>
                            {/* "Modern Gradient" removed: gradient button fills were the default and
                                shipped saturated teal/orange pills on a navy panel. applyTheme also
                                flattens any gradient it is handed, so this option was a no-op. */}
                            <button
                                type="button"
                                className={`style-btn ${themeType === "glassmorphic" ? "active" : ""}`}
                                onClick={() => setThemeType("glassmorphic")}
                            >
                                Glass Glow
                            </button>
                        </div>
                    </div>

                    {/* Button Style Type */}
                    <div className="mb-4">
                        <span className="fw-semibold d-block text-dark mb-3 fs-13 text-uppercase letter-spacing-05">
                            Button Style Type
                        </span>
                        
                        <div className="style-selector-group">
                            <button
                                type="button"
                                className={`style-btn ${buttonType === "contained" ? "active" : ""}`}
                                onClick={() => setButtonType("contained")}
                            >
                                Contained
                            </button>
                            <button
                                type="button"
                                className={`style-btn ${buttonType === "outline" ? "active" : ""}`}
                                onClick={() => setButtonType("outline")}
                            >
                                Outline
                            </button>
                            <button
                                type="button"
                                className={`style-btn ${buttonType === "soft" ? "active" : ""}`}
                                onClick={() => setButtonType("soft")}
                            >
                                Soft Pastel
                            </button>
                            <button
                                type="button"
                                className={`style-btn ${buttonType === "animated" ? "active" : ""}`}
                                onClick={() => setButtonType("animated")}
                            >
                                Animated
                            </button>
                        </div>
                    </div>

                    {/* Button Preview Sandbox */}
                    <div className="mb-4 p-3 rounded border bg-light text-center" style={{ borderStyle: "dashed" }}>
                        <span className="fw-semibold d-block text-muted fs-11 text-uppercase mb-3 letter-spacing-05">
                            Real-Time Button Sandbox
                        </span>
                        <div className="d-flex align-items-center justify-content-center gap-3 py-2">
                            <button type="button" className="btn btn-success px-3 py-2 fs-12 fw-semibold">
                                <i className="ri-add-line align-bottom me-1"></i> Add Item
                            </button>
                            <button type="button" className="btn btn-danger px-3 py-2 fs-12 fw-semibold">
                                <i className="ri-delete-bin-line align-bottom me-1"></i> Delete
                            </button>
                        </div>
                        <span className="text-muted fs-10 d-block mt-2">
                            Hover and interact to test active variants in real-time
                        </span>
                    </div>

                    <hr className="text-muted my-4 opacity-10" />

                    {/* Navigation Search Menu Toggle */}
                    <div className="d-flex align-items-center justify-content-between mb-4">
                        <div>
                            <span className="fw-semibold d-block text-dark fs-13 text-uppercase letter-spacing-05 mb-1">
                                Search Menu Bar
                            </span>
                            <span className="text-muted fs-11 d-block">Show/hide universal search input</span>
                        </div>
                        <div className="form-check form-switch form-switch-md">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                role="switch"
                                id="enableSearchMenuSwitch"
                                checked={enableSearchMenu}
                                onChange={(e) => setEnableSearchMenu(e.target.checked)}
                                style={{ cursor: "pointer" }}
                            />
                        </div>
                    </div>
                </div>

                <div className="border-top pt-3">
                    <button
                        type="button"
                        className="btn btn-success w-100 py-2 fw-semibold"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving Config..." : "Save Config Options"}
                    </button>
                </div>
            </OffcanvasBody>
        </Offcanvas>
    );
};

ThemeCustomizer.propTypes = {
    show: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onThemeChange: PropTypes.func,
};

export default ThemeCustomizer;
