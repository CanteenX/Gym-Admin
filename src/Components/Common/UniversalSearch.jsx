import React, { useState, useEffect, useContext, useRef } from "react";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { MenuContext } from "../../context/MenuContext";

const UniversalSearch = () => {
    const [searchOptions, setSearchOptions] = useState([]);
    const selectRef = useRef(null);
    const navigate = useNavigate();
    const { menuData } = useContext(MenuContext);

    // Flatten menu structure into searchable options
    useEffect(() => {
        if (!menuData || menuData.length === 0) return;

        console.log("📊 RAW MENU DATA:", JSON.stringify(menuData, null, 2));

        const options = [];

        const handleGroupItem = (item, depth, options, flattenMenus) => {
            console.log(
                `${"  ".repeat(depth)}    ✅ Is a GROUP${
                    item.menus ? ` with ${item.menus.length} menus` : ""
                }`
            );

            // Check if this is a direct link group
            if (item.isLink && item.url && item.url !== "#") {
                console.log(
                    `${"  ".repeat(
                        depth
                    )}    ➕ Adding direct link group: ${
                        item.groupName
                    }`
                );
                options.push({
                    value: item.url,
                    label: item.groupName,
                    name: item.groupName,
                    group: "",
                });
            }
            // Recursively flatten the group's menus (if any)
            if (item.menus && item.menus.length > 0) {
                flattenMenus(item.menus, item.groupName, [], depth + 1);
            }
        };

        const handleChildrenItem = (item, depth, groupName, parentPath, flattenMenus) => {
            console.log(
                `${"  ".repeat(depth)}    ✅ Has ${
                    item.children.length
                } CHILDREN`
            );

            // Don't add parent menus with url "#" - they're not navigable
            // Just pass them in the path for their children
            const newPath = [...parentPath, item.name];

            // Recursively flatten children
            flattenMenus(item.children, groupName, newPath, depth + 1);
        };

        const handleLeafItem = (item, depth, groupName, parentPath, options) => {
            // Build the label from the full path
            const fullPath = groupName
                ? [groupName, ...parentPath, item.name]
                : [...parentPath, item.name];
            const label = fullPath.join(" > ");

            console.log(
                `${"  ".repeat(depth)}    ➕ Adding leaf menu: ${label}`
            );
            options.push({
                value: item.url,
                label: label,
                name: item.name,
                group: groupName,
                parent: parentPath.join(" > "),
            });
        };

        const flattenMenus = (
            items,
            groupName = "",
            parentPath = [],
            depth = 0
        ) => {
            console.log(
                `${"  ".repeat(
                    depth
                )}🔍 Processing level ${depth}, groupName: "${groupName}", parentPath: [${parentPath.join(
                    ", "
                )}]`
            );

            items.forEach((item, index) => {
                console.log(`${"  ".repeat(depth)}  Item ${index}:`, {
                    name: item.name || item.groupName,
                    hasGroupId: !!item.groupId,
                    hasMenus: !!item.menus?.length,
                    hasChildren: !!item.children?.length,
                    hasUrl: !!item.url,
                    isLink: item.isLink,
                    url: item.url,
                });

                // Handle menu groups (check for groupId property, not menus.length)
                if (item.groupId || (item.menus && item.menus.length > 0)) {
                    handleGroupItem(item, depth, options, flattenMenus);
                }
                // Handle menu items with children
                else if (item.children && item.children.length > 0) {
                    handleChildrenItem(item, depth, groupName, parentPath, flattenMenus);
                }
                // Handle direct menu items (leaf nodes)
                else if (item.url && item.url !== "#") {
                    handleLeafItem(item, depth, groupName, parentPath, options);
                }
            });
        };

        flattenMenus(menuData);

        console.log("✅ FINAL SEARCH OPTIONS:", options);
        console.log("📈 Total options:", options.length);

        setSearchOptions(options);
    }, [menuData]);

    // Listen for Ctrl+S to focus the search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (selectRef.current) {
                    selectRef.current.focus();
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleSelect = (selectedOption) => {
        if (selectedOption?.value) {
            navigate(selectedOption.value);
            // Clear selection after navigation
            if (selectRef.current) {
                selectRef.current.clearValue();
            }
        }
    };

    const customStyles = {
        control: (provided, state) => ({
            ...provided,
            minWidth: "200px",
            width: "100%",
            maxWidth: "500px",
            borderRadius: "6px",
            border: state.isFocused ? "2px solid var(--search-accent-color, #0ab39c)" : "1px solid #ddd",
            boxShadow: state.isFocused
                ? "0 0 0 2px var(--search-accent-shadow, rgba(10, 179, 156, 0.15))"
                : "none",
            "&:hover": {
                border: "1px solid var(--search-accent-color, #0ab39c)",
            },
            minHeight: "38px",
            cursor: "text",
        }),
        menu: (provided) => ({
            ...provided,
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 1050,
            marginTop: "4px",
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isFocused ? "var(--search-accent-color, #0ab39c)" : "white",
            color: state.isFocused ? "var(--search-accent-contrast, white)" : "#333",
            cursor: "pointer",
            padding: "10px 14px",
            fontSize: "13px",
            "&:active": {
                backgroundColor: "var(--search-accent-hover, #089380)",
            },
        }),
        placeholder: (provided) => ({
            ...provided,
            // Was #999, which is 2.85:1 on the white control - well under the
            // 4.5:1 AA floor. --vz-gray-600 is the same token the SCSS gives
            // every other placeholder (4.83:1 in light mode) and it is defined
            // per theme, so this also stops being wrong in dark mode. A CSS
            // variable rather than a hex keeps the palette the one source of
            // colour; the repo already carries too many literals in JSX.
            color: "var(--vz-gray-600)",
            fontSize: "13px",
        }),
        input: (provided) => ({
            ...provided,
            color: "#333",
            fontSize: "13px",
        }),
        valueContainer: (provided) => ({
            ...provided,
            padding: "2px 12px",
        }),
    };
 
    return (
        <div
            className="d-none d-md-flex"
            style={{
                flex: 1,
                justifyContent: "center",
                maxWidth: "600px",
                margin: "0 20px",
            }}
        >
            <Select
                ref={selectRef}
                inputId="global-menu-search"
                // react-select renders `placeholder` as a div, not an input
                // attribute, so it gives the field no accessible name.
                aria-label="Search menus"
                options={searchOptions}
                onChange={handleSelect}
                placeholder="Search menus... (Ctrl+S)"
                styles={customStyles}
                isClearable
                noOptionsMessage={() => "No menus found"}
            />
        </div>
    );
};

export default UniversalSearch;
