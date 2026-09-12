import React, { useEffect, useState, useContext, useCallback } from "react";
import { Outlet } from "react-router-dom";
import PropTypes from "prop-types";
import withRouter from "../Components/Common/withRouter";
import { AuthContext } from "../context/AuthContext";
import config from "../config";

//import Components
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import ThemeCustomizer from "../Components/Common/ThemeCustomizer";
import { fileUrl } from "@/utils/fileUrl";

const Layout = (props) => {
    const { adminData } = useContext(AuthContext);
    const [headerClass, setHeaderClass] = useState("");
    const [layoutModeType, setLayoutModeType] = useState("light");
    const [showSettings, setShowSettings] = useState(false);
    const [previewSearchMenu, setPreviewSearchMenu] = useState(true);

    // Helper to adjust color brightness dynamically for gradients and hover states
    const adjustColorBrightness = useCallback((hex, percent) => {
        let R = parseInt(hex.substring(1, 3), 16);
        let G = parseInt(hex.substring(3, 5), 16);
        let B = parseInt(hex.substring(5, 7), 16);

        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);

        R = (R < 255) ? R : 255;
        G = (G < 255) ? G : 255;
        B = (B < 255) ? B : 255;

        const rHex = R.toString(16).padStart(2, '0');
        const gHex = G.toString(16).padStart(2, '0');
        const bHex = B.toString(16).padStart(2, '0');

        return `#${rHex}${gHex}${bHex}`;
    }, []);

    // applyTheme changes root CSS custom variables dynamically in real-time
    const applyTheme = useCallback((color, addColor, removeColor, radius, buttonTheme, buttonType, enableSearch, addTextColor, removeTextColor) => {
        const root = document.documentElement;
        if (enableSearch !== undefined) {
            setPreviewSearchMenu(enableSearch);
        }
        
        const sidebarBright = adjustColorBrightness(color, 25);
        const sidebarDark = adjustColorBrightness(color, -15);

        const addBright = adjustColorBrightness(addColor, 25);
        const addDark = adjustColorBrightness(addColor, -15);

        const removeBright = adjustColorBrightness(removeColor, 25);
        const removeDark = adjustColorBrightness(removeColor, -15);
        
        // 1. Set background color variables for sidebar
        root.style.setProperty('--sidebar-bg', color);
        root.style.setProperty('--sidebar-bg-bright', sidebarBright);
        root.style.setProperty('--sidebar-bg-dark', sidebarDark);
        
        // 2. Calculate contrast color (YIQ) for sidebar
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        const contrast = yiq >= 128 ? "#1e293b" : "#ffffff";
        
        // 3. Set text and icon colors based on contrast
        if (contrast === "#1e293b") {
            root.style.setProperty('--sidebar-menu-title-color', 'rgba(30, 41, 59, 0.6)');
            root.style.setProperty('--sidebar-link-color', 'rgba(30, 41, 59, 0.85)');
            root.style.setProperty('--sidebar-link-icon-color', 'rgba(30, 41, 59, 0.7)');
            root.style.setProperty('--sidebar-link-hover-bg', 'rgba(0, 0, 0, 0.05)');
            root.style.setProperty('--sidebar-link-hover-color', '#22346b');
            root.style.setProperty('--sidebar-link-active-bg', 'rgba(0, 0, 0, 0.08)');
            root.style.setProperty('--sidebar-link-active-color', '#22346b');
            root.style.setProperty('--sidebar-collapse-icon-color', 'rgba(30, 41, 59, 0.8)');
        } else {
            root.style.setProperty('--sidebar-menu-title-color', 'rgba(255, 255, 255, 0.45)');
            root.style.setProperty('--sidebar-link-color', 'rgba(255, 255, 255, 0.85)');
            root.style.setProperty('--sidebar-link-icon-color', 'rgba(255, 255, 255, 0.65)');
            root.style.setProperty('--sidebar-link-hover-bg', 'rgba(255, 255, 255, 0.08)');
            root.style.setProperty('--sidebar-link-hover-color', '#ffffff');
            root.style.setProperty('--sidebar-link-active-bg', 'rgba(255, 255, 255, 0.14)');
            root.style.setProperty('--sidebar-link-active-color', '#ffffff');
            root.style.setProperty('--sidebar-collapse-icon-color', 'rgba(255, 255, 255, 0.8)');
        }
        
        // 4. Set button corner style
        root.style.setProperty('--btn-radius', radius);

        // 5. Dynamic button text contrast colors
        const addR = parseInt(addColor.substring(1, 3), 16);
        const addG = parseInt(addColor.substring(3, 5), 16);
        const addB = parseInt(addColor.substring(5, 7), 16);
        const addYiq = (addR * 299 + addG * 587 + addB * 114) / 1000;
        const addContrast = addTextColor || (addYiq >= 128 ? "#1e293b" : "#ffffff");

        const removeR = parseInt(removeColor.substring(1, 3), 16);
        const removeG = parseInt(removeColor.substring(3, 5), 16);
        const removeB = parseInt(removeColor.substring(5, 7), 16);
        const removeYiq = (removeR * 299 + removeG * 587 + removeB * 114) / 1000;
        const removeContrast = removeTextColor || (removeYiq >= 128 ? "#1e293b" : "#ffffff");
        
        if (buttonType === "contained") {
            if (buttonTheme === "solid") {
                root.style.setProperty('--btn-success-bg', addColor);
                root.style.setProperty('--btn-success-border', addColor);
                root.style.setProperty('--btn-success-color', addContrast);
                root.style.setProperty('--btn-success-hover-bg', addDark);
                root.style.setProperty('--btn-success-hover-border', addDark);
                root.style.setProperty('--btn-success-hover-color', addContrast);
                
                root.style.setProperty('--btn-primary-bg', addColor);
                root.style.setProperty('--btn-primary-border', addColor);
                root.style.setProperty('--btn-primary-color', addContrast);
                root.style.setProperty('--btn-primary-hover-bg', addDark);
                root.style.setProperty('--btn-primary-hover-border', addDark);
                root.style.setProperty('--btn-primary-hover-color', addContrast);

                root.style.setProperty('--btn-danger-bg', removeColor);
                root.style.setProperty('--btn-danger-border', removeColor);
                root.style.setProperty('--btn-danger-color', removeContrast);
                root.style.setProperty('--btn-danger-hover-bg', removeDark);
                root.style.setProperty('--btn-danger-hover-border', removeDark);
                root.style.setProperty('--btn-danger-hover-color', removeContrast);
                
                root.style.setProperty('--btn-success-shadow', '0 2px 6px rgba(0, 0, 0, 0.1)');
                root.style.setProperty('--btn-danger-shadow', '0 2px 6px rgba(0, 0, 0, 0.1)');
            } else if (buttonTheme === "glassmorphic") {
                root.style.setProperty('--btn-success-bg', `rgba(${addR}, ${addG}, ${addB}, 0.45)`);
                root.style.setProperty('--btn-success-border', `rgba(${addR}, ${addG}, ${addB}, 0.65)`);
                root.style.setProperty('--btn-success-color', addContrast);
                root.style.setProperty('--btn-success-hover-bg', `rgba(${addR}, ${addG}, ${addB}, 0.65)`);
                root.style.setProperty('--btn-success-hover-border', `rgba(${addR}, ${addG}, ${addB}, 0.85)`);
                root.style.setProperty('--btn-success-hover-color', addContrast);
                
                root.style.setProperty('--btn-primary-bg', `rgba(${addR}, ${addG}, ${addB}, 0.45)`);
                root.style.setProperty('--btn-primary-border', `rgba(${addR}, ${addG}, ${addB}, 0.65)`);
                root.style.setProperty('--btn-primary-color', addContrast);
                root.style.setProperty('--btn-primary-hover-bg', `rgba(${addR}, ${addG}, ${addB}, 0.65)`);
                root.style.setProperty('--btn-primary-hover-border', `rgba(${addR}, ${addG}, ${addB}, 0.85)`);
                root.style.setProperty('--btn-primary-hover-color', addContrast);

                root.style.setProperty('--btn-danger-bg', `rgba(${removeR}, ${removeG}, ${removeB}, 0.45)`);
                root.style.setProperty('--btn-danger-border', `rgba(${removeR}, ${removeG}, ${removeB}, 0.65)`);
                root.style.setProperty('--btn-danger-color', removeContrast);
                root.style.setProperty('--btn-danger-hover-bg', `rgba(${removeR}, ${removeG}, ${removeB}, 0.65)`);
                root.style.setProperty('--btn-danger-hover-border', `rgba(${removeR}, ${removeG}, ${removeB}, 0.85)`);
                root.style.setProperty('--btn-danger-hover-color', removeContrast);
                
                root.style.setProperty('--btn-success-shadow', '0 4px 15px rgba(0, 0, 0, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.25)');
                root.style.setProperty('--btn-danger-shadow', '0 4px 15px rgba(0, 0, 0, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.25)');
            } else { // default to gradient
                root.style.setProperty('--btn-success-bg', `linear-gradient(135deg, ${addColor} 0%, ${addBright} 100%)`);
                root.style.setProperty('--btn-success-border', 'transparent');
                root.style.setProperty('--btn-success-color', addContrast);
                root.style.setProperty('--btn-success-hover-bg', `linear-gradient(135deg, ${addDark} 0%, ${addColor} 100%)`);
                root.style.setProperty('--btn-success-hover-border', 'transparent');
                root.style.setProperty('--btn-success-hover-color', addContrast);
                
                root.style.setProperty('--btn-primary-bg', `linear-gradient(135deg, ${addColor} 0%, ${addBright} 100%)`);
                root.style.setProperty('--btn-primary-border', 'transparent');
                root.style.setProperty('--btn-primary-color', addContrast);
                root.style.setProperty('--btn-primary-hover-bg', `linear-gradient(135deg, ${addDark} 0%, ${addColor} 100%)`);
                root.style.setProperty('--btn-primary-hover-border', 'transparent');
                root.style.setProperty('--btn-primary-hover-color', addContrast);

                root.style.setProperty('--btn-danger-bg', `linear-gradient(135deg, ${removeColor} 0%, ${removeBright} 100%)`);
                root.style.setProperty('--btn-danger-border', 'transparent');
                root.style.setProperty('--btn-danger-color', removeContrast);
                root.style.setProperty('--btn-danger-hover-bg', `linear-gradient(135deg, ${removeDark} 0%, ${removeColor} 100%)`);
                root.style.setProperty('--btn-danger-hover-border', 'transparent');
                root.style.setProperty('--btn-danger-hover-color', removeContrast);
                
                root.style.setProperty('--btn-success-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)');
                root.style.setProperty('--btn-danger-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)');
            }
            root.style.setProperty('--btn-transform', 'translateY(0)');
            root.style.setProperty('--btn-hover-transform', 'translateY(-1px)');
        } 
        else if (buttonType === "outline") {
            if (buttonTheme === "gradient") {
                root.style.setProperty('--btn-success-bg', 'transparent');
                root.style.setProperty('--btn-success-border', addColor);
                root.style.setProperty('--btn-success-color', addColor);
                root.style.setProperty('--btn-success-hover-bg', `linear-gradient(135deg, ${addColor} 0%, ${addBright} 100%)`);
                root.style.setProperty('--btn-success-hover-border', 'transparent');
                root.style.setProperty('--btn-success-hover-color', addContrast);
                
                root.style.setProperty('--btn-primary-bg', 'transparent');
                root.style.setProperty('--btn-primary-border', addColor);
                root.style.setProperty('--btn-primary-color', addColor);
                root.style.setProperty('--btn-primary-hover-bg', `linear-gradient(135deg, ${addColor} 0%, ${addBright} 100%)`);
                root.style.setProperty('--btn-primary-hover-border', 'transparent');
                root.style.setProperty('--btn-primary-hover-color', addContrast);

                root.style.setProperty('--btn-danger-bg', 'transparent');
                root.style.setProperty('--btn-danger-border', removeColor);
                root.style.setProperty('--btn-danger-color', removeColor);
                root.style.setProperty('--btn-danger-hover-bg', `linear-gradient(135deg, ${removeColor} 0%, ${removeBright} 100%)`);
                root.style.setProperty('--btn-danger-hover-border', 'transparent');
                root.style.setProperty('--btn-danger-hover-color', removeContrast);
            } else if (buttonTheme === "glassmorphic") {
                root.style.setProperty('--btn-success-bg', `rgba(${addR}, ${addG}, ${addB}, 0.12)`);
                root.style.setProperty('--btn-success-border', `rgba(${addR}, ${addG}, ${addB}, 0.5)`);
                root.style.setProperty('--btn-success-color', addColor);
                root.style.setProperty('--btn-success-hover-bg', `rgba(${addR}, ${addG}, ${addB}, 0.45)`);
                root.style.setProperty('--btn-success-hover-border', addColor);
                root.style.setProperty('--btn-success-hover-color', addContrast);
                
                root.style.setProperty('--btn-primary-bg', `rgba(${addR}, ${addG}, ${addB}, 0.12)`);
                root.style.setProperty('--btn-primary-border', `rgba(${addR}, ${addG}, ${addB}, 0.5)`);
                root.style.setProperty('--btn-primary-color', addColor);
                root.style.setProperty('--btn-primary-hover-bg', `rgba(${addR}, ${addG}, ${addB}, 0.45)`);
                root.style.setProperty('--btn-primary-hover-border', addColor);
                root.style.setProperty('--btn-primary-hover-color', addContrast);

                root.style.setProperty('--btn-danger-bg', `rgba(${removeR}, ${removeG}, ${removeB}, 0.12)`);
                root.style.setProperty('--btn-danger-border', `rgba(${removeR}, ${removeG}, ${removeB}, 0.5)`);
                root.style.setProperty('--btn-danger-color', removeColor);
                root.style.setProperty('--btn-danger-hover-bg', `rgba(${removeR}, ${removeG}, ${removeB}, 0.45)`);
                root.style.setProperty('--btn-danger-hover-border', removeColor);
                root.style.setProperty('--btn-danger-hover-color', removeContrast);
            } else { // solid
                root.style.setProperty('--btn-success-bg', 'transparent');
                root.style.setProperty('--btn-success-border', addColor);
                root.style.setProperty('--btn-success-color', addColor);
                root.style.setProperty('--btn-success-hover-bg', addColor);
                root.style.setProperty('--btn-success-hover-border', addColor);
                root.style.setProperty('--btn-success-hover-color', addContrast);
                
                root.style.setProperty('--btn-primary-bg', 'transparent');
                root.style.setProperty('--btn-primary-border', addColor);
                root.style.setProperty('--btn-primary-color', addColor);
                root.style.setProperty('--btn-primary-hover-bg', addColor);
                root.style.setProperty('--btn-primary-hover-border', addColor);
                root.style.setProperty('--btn-primary-hover-color', addContrast);

                root.style.setProperty('--btn-danger-bg', 'transparent');
                root.style.setProperty('--btn-danger-border', removeColor);
                root.style.setProperty('--btn-danger-color', removeColor);
                root.style.setProperty('--btn-danger-hover-bg', removeColor);
                root.style.setProperty('--btn-danger-hover-border', removeColor);
                root.style.setProperty('--btn-danger-hover-color', removeContrast);
            }
            root.style.setProperty('--btn-transform', 'translateY(0)');
            root.style.setProperty('--btn-hover-transform', 'translateY(-1px)');
            root.style.setProperty('--btn-success-shadow', 'none');
            root.style.setProperty('--btn-danger-shadow', 'none');
        }
        else if (buttonType === "soft") {
            if (buttonTheme === "gradient") {
                root.style.setProperty('--btn-success-bg', `linear-gradient(135deg, rgba(${addR}, ${addG}, ${addB}, 0.08) 0%, rgba(${addR}, ${addG}, ${addB}, 0.18) 100%)`);
                root.style.setProperty('--btn-success-border', 'transparent');
                root.style.setProperty('--btn-success-color', addColor);
                root.style.setProperty('--btn-success-hover-bg', `linear-gradient(135deg, rgba(${addR}, ${addG}, ${addB}, 0.18) 0%, rgba(${addR}, ${addG}, ${addB}, 0.28) 100%)`);
                root.style.setProperty('--btn-success-hover-border', 'transparent');
                root.style.setProperty('--btn-success-hover-color', addColor);
                
                root.style.setProperty('--btn-primary-bg', `linear-gradient(135deg, rgba(${addR}, ${addG}, ${addB}, 0.08) 0%, rgba(${addR}, ${addG}, ${addB}, 0.18) 100%)`);
                root.style.setProperty('--btn-primary-border', 'transparent');
                root.style.setProperty('--btn-primary-color', addColor);
                root.style.setProperty('--btn-primary-hover-bg', `linear-gradient(135deg, rgba(${addR}, ${addG}, ${addB}, 0.18) 0%, rgba(${addR}, ${addG}, ${addB}, 0.28) 100%)`);
                root.style.setProperty('--btn-primary-hover-border', 'transparent');
                root.style.setProperty('--btn-primary-hover-color', addColor);

                root.style.setProperty('--btn-danger-bg', `linear-gradient(135deg, rgba(${removeR}, ${removeG}, ${removeB}, 0.08) 0%, rgba(${removeR}, ${removeG}, ${removeB}, 0.18) 100%)`);
                root.style.setProperty('--btn-danger-border', 'transparent');
                root.style.setProperty('--btn-danger-color', removeColor);
                root.style.setProperty('--btn-danger-hover-bg', `linear-gradient(135deg, rgba(${removeR}, ${removeG}, ${removeB}, 0.18) 0%, rgba(${removeR}, ${removeG}, ${removeB}, 0.28) 100%)`);
                root.style.setProperty('--btn-danger-hover-border', 'transparent');
                root.style.setProperty('--btn-danger-hover-color', removeColor);
            } else if (buttonTheme === "glassmorphic") {
                root.style.setProperty('--btn-success-bg', `rgba(${addR}, ${addG}, ${addB}, 0.22)`);
                root.style.setProperty('--btn-success-border', `rgba(${addR}, ${addG}, ${addB}, 0.35)`);
                root.style.setProperty('--btn-success-color', addColor);
                root.style.setProperty('--btn-success-hover-bg', `rgba(${addR}, ${addG}, ${addB}, 0.38)`);
                root.style.setProperty('--btn-success-hover-border', `rgba(${addR}, ${addG}, ${addB}, 0.5)`);
                root.style.setProperty('--btn-success-hover-color', addColor);
                
                root.style.setProperty('--btn-primary-bg', `rgba(${addR}, ${addG}, ${addB}, 0.22)`);
                root.style.setProperty('--btn-primary-border', `rgba(${addR}, ${addG}, ${addB}, 0.35)`);
                root.style.setProperty('--btn-primary-color', addColor);
                root.style.setProperty('--btn-primary-hover-bg', `rgba(${addR}, ${addG}, ${addB}, 0.38)`);
                root.style.setProperty('--btn-primary-hover-border', `rgba(${addR}, ${addG}, ${addB}, 0.5)`);
                root.style.setProperty('--btn-primary-hover-color', addColor);

                root.style.setProperty('--btn-danger-bg', `rgba(${removeR}, ${removeG}, ${removeB}, 0.22)`);
                root.style.setProperty('--btn-danger-border', `rgba(${removeR}, ${removeG}, ${removeB}, 0.35)`);
                root.style.setProperty('--btn-danger-color', removeColor);
                root.style.setProperty('--btn-danger-hover-bg', `rgba(${removeR}, ${removeG}, ${removeB}, 0.38)`);
                root.style.setProperty('--btn-danger-hover-border', `rgba(${removeR}, ${removeG}, ${removeB}, 0.5)`);
                root.style.setProperty('--btn-danger-hover-color', removeColor);
            } else { // solid
                root.style.setProperty('--btn-success-bg', `rgba(${addR}, ${addG}, ${addB}, 0.12)`);
                root.style.setProperty('--btn-success-border', 'transparent');
                root.style.setProperty('--btn-success-color', addColor);
                root.style.setProperty('--btn-success-hover-bg', `rgba(${addR}, ${addG}, ${addB}, 0.22)`);
                root.style.setProperty('--btn-success-hover-border', 'transparent');
                root.style.setProperty('--btn-success-hover-color', addColor);
                
                root.style.setProperty('--btn-primary-bg', `rgba(${addR}, ${addG}, ${addB}, 0.12)`);
                root.style.setProperty('--btn-primary-border', 'transparent');
                root.style.setProperty('--btn-primary-color', addColor);
                root.style.setProperty('--btn-primary-hover-bg', `rgba(${addR}, ${addG}, ${addB}, 0.22)`);
                root.style.setProperty('--btn-primary-hover-border', 'transparent');
                root.style.setProperty('--btn-primary-hover-color', addColor);

                root.style.setProperty('--btn-danger-bg', `rgba(${removeR}, ${removeG}, ${removeB}, 0.12)`);
                root.style.setProperty('--btn-danger-border', 'transparent');
                root.style.setProperty('--btn-danger-color', removeColor);
                root.style.setProperty('--btn-danger-hover-bg', `rgba(${removeR}, ${removeG}, ${removeB}, 0.22)`);
                root.style.setProperty('--btn-danger-hover-border', 'transparent');
                root.style.setProperty('--btn-danger-hover-color', removeColor);
            }
            root.style.setProperty('--btn-transform', 'translateY(0)');
            root.style.setProperty('--btn-hover-transform', 'translateY(0)');
            root.style.setProperty('--btn-success-shadow', 'none');
            root.style.setProperty('--btn-danger-shadow', 'none');
        }
        else if (buttonType === "animated") {
            if (buttonTheme === "solid") {
                root.style.setProperty('--btn-success-bg', addColor);
                root.style.setProperty('--btn-success-border', addColor);
                root.style.setProperty('--btn-success-color', addContrast);
                root.style.setProperty('--btn-success-hover-bg', addDark);
                root.style.setProperty('--btn-success-hover-border', addDark);
                root.style.setProperty('--btn-success-hover-color', addContrast);
                
                root.style.setProperty('--btn-primary-bg', addColor);
                root.style.setProperty('--btn-primary-border', addColor);
                root.style.setProperty('--btn-primary-color', addContrast);
                root.style.setProperty('--btn-primary-hover-bg', addDark);
                root.style.setProperty('--btn-primary-hover-border', addDark);
                root.style.setProperty('--btn-primary-hover-color', addContrast);

                root.style.setProperty('--btn-danger-bg', removeColor);
                root.style.setProperty('--btn-danger-border', removeColor);
                root.style.setProperty('--btn-danger-color', removeContrast);
                root.style.setProperty('--btn-danger-hover-bg', removeDark);
                root.style.setProperty('--btn-danger-hover-border', removeDark);
                root.style.setProperty('--btn-danger-hover-color', removeContrast);

                root.style.setProperty('--btn-success-shadow', '0 2px 6px rgba(0,0,0,0.1)');
                root.style.setProperty('--btn-danger-shadow', '0 2px 6px rgba(0,0,0,0.1)');
            } else if (buttonTheme === "glassmorphic") {
                root.style.setProperty('--btn-success-bg', `rgba(${addR}, ${addG}, ${addB}, 0.45)`);
                root.style.setProperty('--btn-success-border', `rgba(${addR}, ${addG}, ${addB}, 0.65)`);
                root.style.setProperty('--btn-success-color', addContrast);
                root.style.setProperty('--btn-success-hover-bg', `rgba(${addR}, ${addG}, ${addB}, 0.65)`);
                root.style.setProperty('--btn-success-hover-border', `rgba(${addR}, ${addG}, ${addB}, 0.85)`);
                root.style.setProperty('--btn-success-hover-color', addContrast);
                
                root.style.setProperty('--btn-primary-bg', `rgba(${addR}, ${addG}, ${addB}, 0.45)`);
                root.style.setProperty('--btn-primary-border', `rgba(${addR}, ${addG}, ${addB}, 0.65)`);
                root.style.setProperty('--btn-primary-color', addContrast);
                root.style.setProperty('--btn-primary-hover-bg', `rgba(${addR}, ${addG}, ${addB}, 0.65)`);
                root.style.setProperty('--btn-primary-hover-border', `rgba(${addR}, ${addG}, ${addB}, 0.85)`);
                root.style.setProperty('--btn-primary-hover-color', addContrast);

                root.style.setProperty('--btn-danger-bg', `rgba(${removeR}, ${removeG}, ${removeB}, 0.45)`);
                root.style.setProperty('--btn-danger-border', `rgba(${removeR}, ${removeG}, ${removeB}, 0.65)`);
                root.style.setProperty('--btn-danger-color', removeContrast);
                root.style.setProperty('--btn-danger-hover-bg', `rgba(${removeR}, ${removeG}, ${removeB}, 0.65)`);
                root.style.setProperty('--btn-danger-hover-border', `rgba(${removeR}, ${removeG}, ${removeB}, 0.85)`);
                root.style.setProperty('--btn-danger-hover-color', removeContrast);

                root.style.setProperty('--btn-success-shadow', '0 4px 15px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.25)');
                root.style.setProperty('--btn-danger-shadow', '0 4px 15px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.25)');
            } else { // default to gradient
                root.style.setProperty('--btn-success-bg', `linear-gradient(135deg, ${addColor} 0%, ${addBright} 100%)`);
                root.style.setProperty('--btn-success-border', 'transparent');
                root.style.setProperty('--btn-success-color', addContrast);
                root.style.setProperty('--btn-success-hover-bg', `linear-gradient(135deg, ${addDark} 0%, ${addColor} 100%)`);
                root.style.setProperty('--btn-success-hover-border', 'transparent');
                root.style.setProperty('--btn-success-hover-color', addContrast);
                
                root.style.setProperty('--btn-primary-bg', `linear-gradient(135deg, ${addColor} 0%, ${addBright} 100%)`);
                root.style.setProperty('--btn-primary-border', 'transparent');
                root.style.setProperty('--btn-primary-color', addContrast);
                root.style.setProperty('--btn-primary-hover-bg', `linear-gradient(135deg, ${addDark} 0%, ${addColor} 100%)`);
                root.style.setProperty('--btn-primary-hover-border', 'transparent');
                root.style.setProperty('--btn-primary-hover-color', addContrast);

                root.style.setProperty('--btn-danger-bg', `linear-gradient(135deg, ${removeColor} 0%, ${removeBright} 100%)`);
                root.style.setProperty('--btn-danger-border', 'transparent');
                root.style.setProperty('--btn-danger-color', removeContrast);
                root.style.setProperty('--btn-danger-hover-bg', `linear-gradient(135deg, ${removeDark} 0%, ${removeColor} 100%)`);
                root.style.setProperty('--btn-danger-hover-border', 'transparent');
                root.style.setProperty('--btn-danger-hover-color', removeContrast);

                root.style.setProperty('--btn-success-shadow', '0 4px 12px rgba(0,0,0,0.15)');
                root.style.setProperty('--btn-danger-shadow', '0 4px 12px rgba(0,0,0,0.15)');
            }
            root.style.setProperty('--btn-transform', 'scale(1) translateY(0)');
            root.style.setProperty('--btn-hover-transform', 'scale(1.03) translateY(-2px)');
        }

        // 6. Search menu styling variables (matches addButtonColor branding)
        root.style.setProperty('--search-accent-color', addColor);
        root.style.setProperty('--search-accent-hover', addDark);
        root.style.setProperty('--search-accent-shadow', `rgba(${addR}, ${addG}, ${addB}, 0.15)`);
        root.style.setProperty('--search-accent-contrast', addContrast);

        // ---- Flatten every gradient button background ----
        //
        // Four buttonType branches above (contained / outline / soft /
        // animated) each fall back to a linear-gradient when buttonTheme is
        // unset, and that fallback is what production was running - so save,
        // edit and delete rendered as saturated teal and orange gradient
        // pills on a navy panel.
        //
        // Rather than rewrite all four branches (and risk missing one, or a
        // fifth being added later), any gradient that was just written is
        // replaced with its flat base colour here. This is the single place
        // that guarantees no button ships a gradient.
        const FLAT = {
            "--btn-success-bg": addColor,
            "--btn-success-hover-bg": addDark,
            "--btn-primary-bg": addColor,
            "--btn-primary-hover-bg": addDark,
            "--btn-danger-bg": removeColor,
            "--btn-danger-hover-bg": removeDark,
        };
        for (const [prop, flat] of Object.entries(FLAT)) {
            if (root.style.getPropertyValue(prop).includes("gradient")) {
                root.style.setProperty(prop, flat);
            }
        }
        // Gradient branches set border to transparent, which leaves a flat
        // fill looking unfinished; match the border to the fill instead.
        for (const [bg, border] of [
            ["--btn-success-bg", "--btn-success-border"],
            ["--btn-primary-bg", "--btn-primary-border"],
            ["--btn-danger-bg", "--btn-danger-border"],
        ]) {
            if (root.style.getPropertyValue(border).trim() === "transparent") {
                root.style.setProperty(border, root.style.getPropertyValue(bg));
            }
        }
    }, [adjustColorBrightness]);

    /**
     * The CompanyMaster record still carries the old template blue (#224c99),
     * and applyTheme writes it as an INLINE style — which beats every
     * stylesheet rule. Translate the legacy value to the navy theme here so the
     * chrome is correct without editing the database. Any other saved colour is
     * respected as-is.
     */
    const LEGACY_BLUES = ["#224c99", "#2b2f36", "#3577f1", "#405189"];
    const resolveSidebarColor = (saved) =>
        !saved || LEGACY_BLUES.includes(String(saved).toLowerCase())
            ? "#1b2a4e"
            : saved;

    // Set initial layout styles on load
    useEffect(() => {
        if (adminData) {
            const savedBg = resolveSidebarColor(adminData.sidebarBgColor);
            const savedAdd = adminData.addButtonColor || savedBg;
            const savedRemove = adminData.removeButtonColor || "#dc2626";
            const savedAddText = adminData.addButtonTextColor || "";
            const savedRemoveText = adminData.removeButtonTextColor || "";
            const savedRadius = adminData.buttonStyle?.borderRadius || "8px";
            const savedTheme = adminData.buttonStyle?.themeType || "solid";
            const savedType = adminData.buttonStyle?.buttonType || "contained";
            const savedSearch = adminData.enableSearchMenu !== false;
            applyTheme(savedBg, savedAdd, savedRemove, savedRadius, savedTheme, savedType, savedSearch, savedAddText, savedRemoveText);
            setPreviewSearchMenu(savedSearch);
        }
    }, [adminData, applyTheme]);

    // Handle closing Customizer drawer and restoring saved states
    const handleCloseSettings = () => {
        setShowSettings(false);
        const savedBg = resolveSidebarColor(adminData?.sidebarBgColor);
        const savedAdd = adminData?.addButtonColor || savedBg;
        const savedRemove = adminData?.removeButtonColor || "#dc2626";
        const savedAddText = adminData?.addButtonTextColor || "";
        const savedRemoveText = adminData?.removeButtonTextColor || "";
        const savedRadius = adminData?.buttonStyle?.borderRadius || "8px";
        const savedTheme = adminData?.buttonStyle?.themeType || "solid";
        const savedType = adminData?.buttonStyle?.buttonType || "contained";
        const savedSearch = adminData?.enableSearchMenu !== false;
        applyTheme(savedBg, savedAdd, savedRemove, savedRadius, savedTheme, savedType, savedSearch, savedAddText, savedRemoveText);
        setPreviewSearchMenu(savedSearch);
    };

    // call dark/light mode
    const onChangeLayoutMode = (value) => {
        setLayoutModeType(value);

        // Apply theme directly to document
        if (value === "dark") {
            document.documentElement.dataset.layoutMode = "dark";
        } else {
            document.documentElement.dataset.layoutMode = "light";
        }
    };

    // class add remove in header
    useEffect(() => {
        window.addEventListener("scroll", scrollNavigation, true);

        // Set layout type
        document.documentElement.dataset.layout = "vertical";
        console.log("Layout set to vertical");
    }, []);

    // Update favicon dynamically
    useEffect(() => {
        if (adminData?.favicon) {
            const faviconUrl = fileUrl(adminData.favicon);
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement("link");
                link.rel = "icon";
                document.getElementsByTagName("head")[0].appendChild(link);
            }
            link.href = faviconUrl;
        }
    }, [adminData?.favicon]);

    function scrollNavigation() {
        const scrollup = document.documentElement.scrollTop;
        if (scrollup > 50) {
            setHeaderClass("topbar-shadow");
        } else {
            setHeaderClass("");
        }
    }

    return (
        <div id="layout-wrapper">
            <style>
                {`
                    /* Dynamic Theme Overrides using CSS custom variables */
                    .minimal-sidebar {
                        background: var(--sidebar-bg, #1b2a4e) !important;
                    }
                    
                    /* Text & icon contrast sizing overrides */
                    .minimal-sidebar .menu-title {
                        color: var(--sidebar-menu-title-color, rgba(255, 255, 255, 0.45)) !important;
                    }
                    
                    .minimal-sidebar .navbar-nav .nav-link {
                        color: var(--sidebar-link-color, rgba(255, 255, 255, 0.85)) !important;
                    }
                    
                    .minimal-sidebar .navbar-nav .nav-link i {
                        color: var(--sidebar-link-icon-color, rgba(255, 255, 255, 0.65)) !important;
                    }
                    
                    .minimal-sidebar .navbar-nav .nav-link:hover {
                        background: var(--sidebar-link-hover-bg, rgba(255, 255, 255, 0.08)) !important;
                        color: var(--sidebar-link-hover-color, #ffffff) !important;
                    }
                    
                    .minimal-sidebar .navbar-nav .nav-link.active {
                        background: var(--sidebar-link-active-bg, rgba(255, 255, 255, 0.14)) !important;
                        color: var(--sidebar-link-active-color, #ffffff) !important;
                        font-weight: 600;
                    }
                    
                    .minimal-sidebar .navbar-nav .menu-link[data-bs-toggle="collapse"]:after {
                        color: var(--sidebar-collapse-icon-color, rgba(255, 255, 255, 0.8)) !important;
                    }

                    /* Dynamic Global Button Overrides */
                    .btn {
                        border-radius: var(--btn-radius, 8px) !important;
                    }
                    
                    .btn-success {
                        background: var(--btn-success-bg, #3a3f47) !important;
                        border-color: var(--btn-success-border, #3a3f47) !important;
                        box-shadow: var(--btn-success-shadow, 0 1px 2px rgba(0, 0, 0, 0.08)) !important;
                        color: var(--btn-success-color, white) !important;
                        transform: var(--btn-transform, translateY(0)) !important;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
                        backdrop-filter: blur(8px) !important;
                        -webkit-backdrop-filter: blur(8px) !important;
                    }
                    
                    .btn-success:hover, .btn-success:active, .btn-success:focus {
                        background: var(--btn-success-hover-bg, var(--btn-success-bg)) !important;
                        border-color: var(--btn-success-hover-border, var(--btn-success-border)) !important;
                        color: var(--btn-success-hover-color, var(--btn-success-color)) !important;
                        transform: var(--btn-hover-transform, translateY(-1px)) !important;
                    }
                    
                    .btn-primary {
                        background: var(--btn-primary-bg, #3a3f47) !important;
                        border-color: var(--btn-primary-border, #3a3f47) !important;
                        box-shadow: var(--btn-primary-shadow, 0 1px 2px rgba(0, 0, 0, 0.08)) !important;
                        color: var(--btn-primary-color, white) !important;
                        transform: var(--btn-transform, translateY(0)) !important;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
                        backdrop-filter: blur(8px) !important;
                        -webkit-backdrop-filter: blur(8px) !important;
                    }
                    
                    .btn-primary:hover, .btn-primary:active, .btn-primary:focus {
                        background: var(--btn-primary-hover-bg, var(--btn-primary-bg)) !important;
                        border-color: var(--btn-primary-hover-border, var(--btn-primary-border)) !important;
                        color: var(--btn-primary-hover-color, var(--btn-primary-color)) !important;
                        transform: var(--btn-hover-transform, translateY(-1px)) !important;
                    }
 
                    .btn-danger {
                        background: var(--btn-danger-bg, #dc2626) !important;
                        border-color: var(--btn-danger-border, #dc2626) !important;
                        box-shadow: var(--btn-danger-shadow, 0 1px 2px rgba(0, 0, 0, 0.08)) !important;
                        color: var(--btn-danger-color, white) !important;
                        transform: var(--btn-transform, translateY(0)) !important;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
                        backdrop-filter: blur(8px) !important;
                        -webkit-backdrop-filter: blur(8px) !important;
                    }
                    
                    .btn-danger:hover, .btn-danger:active, .btn-danger:focus {
                        background: var(--btn-danger-hover-bg, var(--btn-danger-bg)) !important;
                        border-color: var(--btn-danger-hover-border, var(--btn-danger-border)) !important;
                        color: var(--btn-danger-hover-color, var(--btn-danger-color)) !important;
                        transform: var(--btn-hover-transform, translateY(-1px)) !important;
                    }

                    /* Dynamic Form Section Headers Accent borders & Icons */
                    .form-section-header,
                    .form-section-card .form-section-header,
                    .profile-card-section-header {
                        border-left: 3px solid #3a3f47 !important;
                    }

                    .form-section-header i,
                    .form-section-card .form-section-header i,
                    .profile-card-section-header i {
                        color: #3a3f47 !important;
                    }
                `}
            </style>
            
            <Header
                headerClass={headerClass}
                layoutModeType={layoutModeType}
                onChangeLayoutMode={onChangeLayoutMode}
                onToggleSettings={() => setShowSettings(!showSettings)}
                // previewSearchMenu tracks the customizer's live preview and is reverted to
                    // adminData.enableSearchMenu when the panel closes, so this still shows
                    // the saved value when nobody is previewing. Reading the saved field
                    // directly made this the only setting with no live preview.
                    showSearchMenu={previewSearchMenu}
            />
            <Sidebar layoutType="vertical" />
            <div className="main-content">
                {props.children ? props.children : <Outlet />}
                <Footer />
            </div>

            {adminData?.isSuperAdmin && (
                <ThemeCustomizer 
                    show={showSettings} 
                    onClose={handleCloseSettings}
                    onThemeChange={applyTheme}
                />
            )}
        </div>
    );
};

Layout.propTypes = {
    children: PropTypes.any,
};

export default withRouter(Layout);
