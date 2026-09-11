import React, { useState, useEffect, useContext } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardHeader,
  CardBody,
  Input,
  Label,
  Table,
  Button,
  FormGroup,
  Spinner,
  Badge,
  UncontrolledTooltip,
  Alert
} from "reactstrap";
import Select from "react-select";
import { toast } from "react-toastify";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { MenuContext } from "../../context/MenuContext";
import { AuthContext } from "../../context/AuthContext";
import { getAllRoles, getAdminCreatedRoles, getEmployeeCreatedRoles } from "../../api/roles.api";
import { getMenusByGroups } from "../../api/menus.api";
import { getEmployeeRolesByRoleId, createEmployeeRoles, updateEmployeeRoles } from "../../api/employeeRoles.api";

const createPermissionObject = (menuField, id, permission, isChecked) => {
  const permissions = {
    read: false,
    write: false,
    delete: false,
    edit: false,
    print: false,
    mail: false,
  };
  permissions[menuField] = id;
  permissions[permission] = isChecked;
  return permissions;
};

const createFullPermissionObject = (menuField, id, isChecked) => {
  return {
    [menuField]: id,
    read: isChecked,
    write: isChecked,
    delete: isChecked,
    edit: isChecked,
    print: isChecked,
    mail: isChecked,
  };
};

const collectAllMenuIds = (menus, resultList = []) => {
  if (!menus) return resultList;
  menus.forEach(menu => {
    resultList.push(menu.id);
    if (menu.children && menu.children.length > 0) {
      collectAllMenuIds(menu.children, resultList);
    }
  });
  return resultList;
};

const collectMenuAndGroupObjects = (menus, resultList) => {
  if (!menus) return;
  menus.forEach(menu => {
    resultList.push({ id: menu.id, isGroup: false });
    if (menu.children && menu.children.length > 0) {
      collectMenuAndGroupObjects(menu.children, resultList);
    }
  });
};

const appendMissingMenuPermissions = (menus, existingMenuIds, rolesArray, menuField, permission, isChecked) => {
  if (!menus) return;
  menus.forEach(menu => {
    if (!existingMenuIds.has(menu.id)) {
      rolesArray.push(createPermissionObject(menuField, menu.id, permission, isChecked));
    }
    if (menu.children && menu.children.length > 0) {
      appendMissingMenuPermissions(menu.children, existingMenuIds, rolesArray, menuField, permission, isChecked);
    }
  });
};

const addAllMenuPermissions = (menus, rolesArray, menuField, isChecked) => {
  if (!menus) return;
  menus.forEach(menu => {
    rolesArray.push(createFullPermissionObject(menuField, menu.id, isChecked));
    if (menu.children && menu.children.length > 0) {
      addAllMenuPermissions(menu.children, rolesArray, menuField, isChecked);
    }
  });
};

const findRoleIndex = (rolesArray, menuField, menuId) => {
  return rolesArray.findIndex(r => r[menuField] === menuId);
};

const updateAllMenuPermissions = (menus, rolesArray, menuField, isChecked) => {
  if (!menus) return;
  menus.forEach(menu => {
    const roleIndex = findRoleIndex(rolesArray, menuField, menu.id);
    if (roleIndex === -1) {
      rolesArray.push(createFullPermissionObject(menuField, menu.id, isChecked));
    } else {
      rolesArray[roleIndex].read = isChecked;
      rolesArray[roleIndex].write = isChecked;
      rolesArray[roleIndex].delete = isChecked;
      rolesArray[roleIndex].edit = isChecked;
      rolesArray[roleIndex].print = isChecked;
      rolesArray[roleIndex].mail = isChecked;
    }
    if (menu.children && menu.children.length > 0) {
      updateAllMenuPermissions(menu.children, rolesArray, menuField, isChecked);
    }
  });
};

const checkAllMenus = (menus, roles) => {
  return menus.every(menu => {
    const role = roles.find(r => r.menuId === menu.id);
    const hasAll = role?.read && role?.write && role?.delete && role?.edit && role?.print && role?.mail;
    if (menu.children && menu.children.length > 0) {
      return hasAll && checkAllMenus(menu.children, roles);
    }
    return hasAll;
  });
};

const checkAnyMenus = (menus, roles) => {
  return menus.some(menu => {
    const role = roles.find(r => r.menuId === menu.id);
    const hasAny = role?.read || role?.write || role?.delete || role?.edit || role?.print || role?.mail;
    if (menu.children && menu.children.length > 0) {
      return hasAny || checkAnyMenus(menu.children, roles);
    }
    return hasAny;
  });
};

const selectOptionBackgroundColor = (isSelected, isFocused) => {
  if (isSelected) return '#0d6efd';
  if (isFocused) return '#e8f0fe';
  return 'white';
};

const formatOptionLabel = option => (
  <div>
    {option.label}
  </div>
);

const formatGroupLabel = (group) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <i className="bx bx-user text-primary"></i>
    <span>{group.label}</span>
    <span style={{
      marginLeft: 'auto',
      background: '#e8f0fe',
      color: '#0d6efd',
      borderRadius: '10px',
      padding: '1px 8px',
      fontSize: '11px',
      fontWeight: '600',
    }}>
      {group.options.length} roles
    </span>
  </div>
);

const EmployeeRoles = () => {
  // States
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [menuData, setMenuData] = useState([]);
  const [employeeRoles, setEmployeeRoles] = useState(null);
  const [rolesChanged, setRolesChanged] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [previewModal, setPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [employeeCreatedRoles, setEmployeeCreatedRoles] = useState([]);
  const [selectedEmployeeCreatedRole, setSelectedEmployeeCreatedRole] = useState(null);

  const { menuData: contextMenuData } = useContext(MenuContext);
  const { adminData, role } = useContext(AuthContext);

  // Fetch all roles and menu data
  useEffect(() => {
    if (role === "ADMIN") {
      fetchAdminRoles();
      fetchEmployeeCreatedRolesList();
    } else {
      fetchRoles();
    }
    fetchAllMenuData();
  }, []);

  // Fetch employee roles when an employee is selected
  useEffect(() => {
    const roleId = selectedRole?.value || selectedEmployeeCreatedRole?.value;
    if (roleId) {
      fetchEmployeeRoles(roleId);
    } else {
      setEmployeeRoles(null);
    }
  }, [selectedRole, selectedEmployeeCreatedRole]);

  // API Calls
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await getAllRoles();

      if (response.data.isOk) {
        // Format for react-select
        const formattedRoles = response.data.data.map(role => ({
          value: role._id,
          label: role.roleName,
        }));
        setRoles(formattedRoles);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminRoles = async () => {
    setLoading(true);
    try {
      const response = await getAdminCreatedRoles();
      if (response.data.isOk) {
        const formattedRoles = response.data.data.map(r => ({
          value: r._id,
          label: r.roleName,
        }));
        setRoles(formattedRoles);
      }
    } catch (error) {
      console.error("Error fetching admin roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeCreatedRolesList = async () => {
    try {
      const response = await getEmployeeCreatedRoles();
      if (response.data.isOk) {
        setEmployeeCreatedRoles(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching employee created roles:", error);
    }
  };

  // Fetch all menu data using the same API as MenuContext
  const fetchAllMenuData = async () => {
    setLoading(true);
    try {

      const response = await getMenusByGroups();

      if (response.data.isOk) {
        const menuGroupsData = response.data.data;


        if (Array.isArray(menuGroupsData)) {
          setMenuData(menuGroupsData);
        } else {
          console.error("Menu data is not an array");
          toast.error("Menu data is in an unexpected format");
        }
      } else {
        console.error("No data in API response or isOk is false");
        toast.error("Failed to load menu data");

        // If context data is available, use it as a fallback
        if (contextMenuData && contextMenuData.length > 0) {

          setMenuData(contextMenuData);
        }
      }
    } catch (error) {
      console.error("Error fetching menu data:", error);
      toast.error("Failed to load menus and menu groups");

      // If context data is available, use it as a fallback
      if (contextMenuData && contextMenuData.length > 0) {

        setMenuData(contextMenuData);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeRoles = async (roleId) => {
    setLoading(true);
    try {
      const response = await getEmployeeRolesByRoleId(roleId);

      if (response.data.data && response.data.data.length > 0) {

        setEmployeeRoles(response.data.data[0]);
      } else {
        // If no roles found, set to null
        setEmployeeRoles(null);
        toast.info(response.message)
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // No roles assigned yet, that's fine
        setEmployeeRoles(null);
      } else {
        toast.error("Failed to load employee roles");
      }
    } finally {
      setLoading(false);
      setRolesChanged(false);
    }
  };

  // Handle permission checkboxes
  const handlePermissionChange = (id, isGroup, permission, isChecked) => {
    setRolesChanged(true);

    const menuField = isGroup ? "menuGroupId" : "menuId";

    if (employeeRoles) {
      // Update existing roles
      const updatedRoles = { ...employeeRoles };

      // Find existing role by menuId or menuGroupId
      const roleIndex = updatedRoles.roles.findIndex(r =>
        (isGroup ? r.menuGroupId === id : r.menuId === id)
      );

      if (roleIndex === -1) {
        // Add new menu permission
        updatedRoles.roles.push(createPermissionObject(menuField, id, permission, isChecked));
      } else {
        // Update existing menu permission
        updatedRoles.roles[roleIndex][permission] = isChecked;
      }

      setEmployeeRoles(updatedRoles);
    } else {
      // Create new roles structure if none exists
      const newRoles = {
        roleId: selectedRole.value,
        roles: [createPermissionObject(menuField, id, permission, isChecked)]
      };
      setEmployeeRoles(newRoles);
    }
  };

  // Handle all permissions for a menu
  const handleAllPermissions = (id, isGroup, isChecked) => {
    setRolesChanged(true);

    const menuField = isGroup ? "menuGroupId" : "menuId";

    if (employeeRoles) {
      // Update existing roles
      const updatedRoles = { ...employeeRoles };

      // Find existing role by menuId or menuGroupId
      const roleIndex = updatedRoles.roles.findIndex(r =>
        (isGroup ? r.menuGroupId === id : r.menuId === id)
      );

      if (roleIndex === -1) {
        // Add new menu permission with all permissions set
        updatedRoles.roles.push({
          [menuField]: id,
          read: isChecked,
          write: isChecked,
          delete: isChecked,
          edit: isChecked,
          print: isChecked,
          mail: isChecked,
        });
      } else {
        // Update all permissions
        updatedRoles.roles[roleIndex].read = isChecked;
        updatedRoles.roles[roleIndex].write = isChecked;
        updatedRoles.roles[roleIndex].delete = isChecked;
        updatedRoles.roles[roleIndex].edit = isChecked;
        updatedRoles.roles[roleIndex].print = isChecked;
        updatedRoles.roles[roleIndex].mail = isChecked;
      }

      setEmployeeRoles(updatedRoles);
    } else {
      // Create new roles structure with all permissions
      const newRoles = {
        roleId: selectedRole.value,
        roles: [
          {
            [menuField]: id,
            read: isChecked,
            write: isChecked,
            delete: isChecked,
            edit: isChecked,
            print: isChecked,
            mail: isChecked,
          }
        ]
      };
      setEmployeeRoles(newRoles);
    }
  };

  // Handle column-wide permission changes
  const handleColumnPermissionChange = (permission, isChecked) => {
    setRolesChanged(true);

    if (employeeRoles) {
      // Update existing roles
      const updatedRoles = { ...employeeRoles };

      // Update all existing roles with the specified permission
      updatedRoles.roles.forEach(role => {
        role[permission] = isChecked;
      });

      // Add permissions for menus/groups that don't exist yet
      const existingMenuIds = new Set(updatedRoles.roles.map(r => r.menuId).filter(Boolean));
      const existingGroupIds = new Set(updatedRoles.roles.map(r => r.menuGroupId).filter(Boolean));

      menuData.forEach(group => {
        if (group.isLink && !existingGroupIds.has(group.groupId)) {
          updatedRoles.roles.push(createPermissionObject("menuGroupId", group.groupId, permission, isChecked));
        } else if (group.menus) {
          appendMissingMenuPermissions(group.menus, existingMenuIds, updatedRoles.roles, "menuId", permission, isChecked);
        }
      });

      setEmployeeRoles(updatedRoles);
    } else {
      // Create new roles structure with all menus having the specified permission
      const allMenuIds = [];
      const allGroupIds = [];

      // Collect all menu IDs and group IDs
      menuData.forEach(group => {
        if (group.isLink) {
          allGroupIds.push(group.groupId);
        } else if (group.menus) {
          collectAllMenuIds(group.menus, allMenuIds);
        }
      });

      const newRoles = {
        roleId: selectedRole.value,
        roles: [
          ...allMenuIds.map(menuId => createPermissionObject("menuId", menuId, permission, isChecked)),
          ...allGroupIds.map(groupId => createPermissionObject("menuGroupId", groupId, permission, isChecked))
        ]
      };
      setEmployeeRoles(newRoles);
    }
  };

  // Handle all permissions for a group
  const handleAllGroupPermissions = (groupId, isChecked) => {
    setRolesChanged(true);

    const group = menuData.find(g => g.groupId === groupId);
    if (!group) return;

    if (!employeeRoles) {
      // Create new roles structure for this group
      const newRoles = {
        roleId: selectedRole.value,
        roles: []
      };

      if (group.isLink) {
        newRoles.roles.push(createFullPermissionObject("menuGroupId", groupId, isChecked));
      } else if (group.menus) {
        addAllMenuPermissions(group.menus, newRoles.roles, "menuId", isChecked);
      }

      setEmployeeRoles(newRoles);
      return;
    }

    // Update existing roles
    const updatedRoles = { ...employeeRoles };

    if (group.isLink) {
      // Update group permissions
      const roleIndex = updatedRoles.roles.findIndex(r => r.menuGroupId === groupId);
      if (roleIndex === -1) {
        updatedRoles.roles.push(createFullPermissionObject("menuGroupId", groupId, isChecked));
      } else {
        const role = updatedRoles.roles[roleIndex];
        role.read = isChecked;
        role.write = isChecked;
        role.delete = isChecked;
        role.edit = isChecked;
        role.print = isChecked;
        role.mail = isChecked;
      }
    } else if (group.menus) {
      // Update all menu permissions in this group
      updateAllMenuPermissions(group.menus, updatedRoles.roles, "menuId", isChecked);
    }

    setEmployeeRoles(updatedRoles);
  };

  // Check if a menu has a particular permission
  const hasPermission = (id, isGroup, permission) => {
    if (!employeeRoles?.roles) return false;

    const role = employeeRoles.roles.find(r =>
      isGroup ? r.menuGroupId === id : r.menuId === id
    );

    return role?.[permission] || false;
  };

  // Check if all permissions are granted
  const hasAllPermissions = (id, isGroup) => {
    if (!employeeRoles?.roles) return false;

    const role = employeeRoles.roles.find(r =>
      isGroup ? r.menuGroupId === id : r.menuId === id
    );

    if (!role) return false;

    return (
      role.read &&
      role.write &&
      role.delete &&
      role.edit &&
      role.print &&
      role.mail
    );
  };

  // Check if any permissions are granted
  const hasAnyPermissions = (id, isGroup) => {
    if (!employeeRoles?.roles) return false;

    const role = employeeRoles.roles.find(r =>
      isGroup ? r.menuGroupId === id : r.menuId === id
    );

    if (!role) return false;

    return (
      role.read ||
      role.write ||
      role.delete ||
      role.edit ||
      role.print ||
      role.mail
    );
  };

  // Check if a column has all permissions
  const hasColumnAllPermissions = (permission) => {
    if (!employeeRoles?.roles) return false;

    // Get all menu and group IDs from menuData
    const allIds = [];
    menuData.forEach(group => {
      if (group.isLink) {
        allIds.push({ id: group.groupId, isGroup: true });
      } else if (group.menus) {
        collectMenuAndGroupObjects(group.menus, allIds);
      }
    });

    // Check if all IDs have the specified permission
    return allIds.every(({ id, isGroup }) => {
      const role = employeeRoles.roles.find(r =>
        isGroup ? r.menuGroupId === id : r.menuId === id
      );
      return !!role?.[permission];
    });
  };

  // Check if a group has all permissions
  const hasGroupAllPermissions = (groupId) => {
    if (!employeeRoles?.roles) return false;

    const group = menuData.find(g => g.groupId === groupId);
    if (!group) return false;

    if (group.isLink) {
      const role = employeeRoles.roles.find(r => r.menuGroupId === groupId);
      return !!(role?.read && role?.write && role?.delete && role?.edit && role?.print && role?.mail);
    } else if (group.menus) {
      return checkAllMenus(group.menus, employeeRoles.roles);
    }

    return false;
  };

  // Check if a group has any permissions
  const hasGroupAnyPermissions = (groupId) => {
    if (!employeeRoles?.roles) return false;

    const group = menuData.find(g => g.groupId === groupId);
    if (!group) return false;

    if (group.isLink) {
      const role = employeeRoles.roles.find(r => r.menuGroupId === groupId);
      return !!(role?.read || role?.write || role?.delete || role?.edit || role?.print || role?.mail);
    } else if (group.menus) {
      return checkAnyMenus(group.menus, employeeRoles.roles);
    }

    return false;
  };

  // Save employee roles
  // const saveEmployeeRoles = async () => {
  //   if (!selectedRole || !employeeRoles) return;

  //   setSaveLoading(true);
  //   try {
  //     if (employeeRoles._id) {
  //       // Update existing roles
  //       await updateEmployeeRoles(selectedRole.value, {
  //         roleId: selectedRole.value,
  //         roles: employeeRoles.roles
  //       });
  //       toast.success("Employee roles updated successfully");
  //     } else {
  //       // Create new roles
  //       await createEmployeeRoles({
  //         roleId: selectedRole.value,
  //         roles: employeeRoles.roles
  //       });
  //       toast.success("Employee roles created successfully");
  //     }

  //     // Refresh employee roles
  //     fetchEmployeeRoles(selectedRole.value);
  //     // Update the roles list to reflect that this employee now has roles
  //     setRoles(roles.map(role =>
  //       role.value === selectedRole.value ? { ...role } : role
  //     ));
  //   } catch (error) {
  //     console.error("Error saving employee roles:", error);
  //     if (error.response?.status === 403) {
  //       toast.error(error.response.data.message);
  //     } else {
  //       toast.error("Failed to save employee roles");
  //     }
  //   } finally {
  //     setSaveLoading(false);
  //   }
  // };
  const saveEmployeeRoles = async () => {
    const activeRole = selectedRole || selectedEmployeeCreatedRole;
    if (!activeRole || !employeeRoles) return;

    setSaveLoading(true);
    try {
      if (employeeRoles._id) {
        // Step 1: Preview check
        const previewRes = await updateEmployeeRoles(activeRole.value, {
          roleId: activeRole.value,
          roles: employeeRoles.roles,
          preview: true,
        });

        // Step 2: If impact found — show modal
        if (previewRes.data.hasImpact) {
          setPreviewData(previewRes.data);
          setPreviewModal(true);
          setSaveLoading(false);
          return;
        }

        // Step 3: No impact — save directly
        await updateEmployeeRoles(activeRole.value, {
          roleId: activeRole.value,
          roles: employeeRoles.roles,
          preview: false,
        });
        toast.success("Employee roles updated successfully");
      } else {
        await createEmployeeRoles({
          roleId: activeRole.value,
          roles: employeeRoles.roles,
        });
        toast.success("Employee roles created successfully");
      }

      fetchEmployeeRoles(activeRole.value);
      setRoles(roles.map(role =>
        role.value === activeRole.value ? { ...role } : role
      ));
    } catch (error) {
      console.error("Error saving employee roles:", error);
      if (error.response?.status === 403) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to save employee roles");
      }
    } finally {
      setSaveLoading(false);
    }
  };
  const confirmSave = async () => {
    const activeRole = selectedRole || selectedEmployeeCreatedRole;
    setPreviewModal(false);
    setSaveLoading(true);
    try {
      await updateEmployeeRoles(activeRole.value, {
        roleId: activeRole.value,
        roles: employeeRoles.roles,
        preview: false,
      });
      toast.success("Employee roles updated successfully");
      fetchEmployeeRoles(activeRole.value);
      setRoles(roles.map(role =>
        role.value === activeRole.value ? { ...role } : role
      ));
    } catch (error) {
      console.error("Error saving employee roles:", error);
      if (error.response?.status === 403) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to save employee roles");
      }
    } finally {
      setSaveLoading(false);
    }
  };

  // Get appropriate styles based on hover state and permissions
  const getRowStyles = (id, isGroup) => {
    const hasAny = hasAnyPermissions(id, isGroup);
    const isHovered = hoveredRow === id;

    let bgColor = '';

    if (isHovered) {
      bgColor = 'rgba(0, 123, 255, 0.05)';
    } else if (hasAny) {
      bgColor = 'rgba(40, 167, 69, 0.05)';
    }

    return {
      backgroundColor: bgColor,
      transition: 'background-color 0.2s'
    };
  };

  // Recursive function to render menu items and their checkboxes
  const renderMenuItems = (menuItems, depth = 0) => {
    if (!menuItems || menuItems.length === 0) return null;

    return menuItems.map(menu => {
      // Generate a unique, safe ID for the menu item
      const menuBadgeId = `menu-badge-${menu.id.toString().replace(/[^a-zA-Z0-9]/g, '-')}`;
      const toggleBtnId = `toggle-btn-${menu.id.toString().replace(/[^a-zA-Z0-9]/g, '-')}`;

      return (
        <React.Fragment key={menu.id}>
          <tr
            style={getRowStyles(menu.id, false)}
            onMouseEnter={() => setHoveredRow(menu.id)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <td style={{ paddingLeft: `${depth * 2}rem` }} className="menu-name-cell">
              {depth > 0 && (
                <i className="bx bx-subdirectory-right me-2 text-muted"></i>
              )}
              <span className={depth === 0 && menu.isParent ? "fw-bold" : ""}>
                {menu.isParent ? (
                  <i className="bx bx-folder me-1 text-primary"></i>
                ) : (
                  <i className="bx bx-file me-1 text-info"></i>
                )}
                {menu.name}
              </span>

              {hasAllPermissions(menu.id, false) && (
                <>
                  <Badge color="success" className="ms-2" pill id={menuBadgeId}>
                    All
                  </Badge>
                  <UncontrolledTooltip placement="top" target={menuBadgeId}>
                    Full access granted
                  </UncontrolledTooltip>
                </>
              )}

              <div className="float-end">
                <Button
                  color="light"
                  size="sm"
                  className="btn-sm py-0 px-1"
                  onClick={() => handleAllPermissions(menu.id, false, !hasAllPermissions(menu.id, false))}
                  id={toggleBtnId}
                >
                  {hasAllPermissions(menu.id, false) ? (
                    <i className="bx bx-x text-danger"></i>
                  ) : (
                    <i className="bx bx-check text-success"></i>
                  )}
                </Button>
                <UncontrolledTooltip placement="top" target={toggleBtnId}>
                  {hasAllPermissions(menu.id, false) ? "Revoke all permissions" : "Grant all permissions"}
                </UncontrolledTooltip>
              </div>
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "read")}
                onChange={(e) => handlePermissionChange(menu.id, false, "read", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "write")}
                onChange={(e) => handlePermissionChange(menu.id, false, "write", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "delete")}
                onChange={(e) => handlePermissionChange(menu.id, false, "delete", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "edit")}
                onChange={(e) => handlePermissionChange(menu.id, false, "edit", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "print")}
                onChange={(e) => handlePermissionChange(menu.id, false, "print", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "mail")}
                onChange={(e) => handlePermissionChange(menu.id, false, "mail", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
          </tr>
          {/* Recursively render children */}
          {menu.children && menu.children.length > 0 && renderMenuItems(menu.children, depth + 1)}
        </React.Fragment>
      );
    });
  };

  document.title = `Employee Roles | ${adminData.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Setup"
            title="Employee Roles"
            pageTitle="Setup"
          />

          <Card className="shadow-sm">
            <CardHeader className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bx bx-user-circle me-2 text-primary"></i>{" "}Role Management
              </h5>
              {(!menuData || menuData.length === 0) && (
                <Button
                  color="secondary"
                  size="sm"
                  onClick={fetchAllMenuData}
                >
                  <i className="bx bx-refresh me-1"></i>{" "}Reload Menus
                </Button>
              )}
            </CardHeader>
            <CardBody>
              <Row className="mb-4">
                <Col md={3}>
                  <FormGroup>
                    <Label htmlFor="employeeSelect" className="fw-bold">
                      <i className="bx bx-user me-1"></i>{" "}Select Role
                    </Label>
                    <Select
                      id="employeeSelect"
                      options={roles}
                      value={selectedRole}
                      onChange={(val) => {
                        setSelectedRole(val);
                        setSelectedEmployeeCreatedRole(null);
                      }}
                      className="basic-single"
                      classNamePrefix="select"
                      placeholder="Select a role..."
                      isDisabled={loading}
                      isClearable
                      formatOptionLabel={formatOptionLabel}
                    />
                  </FormGroup>
                </Col>
                {role === "ADMIN" && (
                  <Col md={3}>
                    <FormGroup>
                      <Label className="fw-bold">
                        <i className="bx bx-user-check me-1"></i> Employee Created Roles
                      </Label>
                      <Select
                        options={employeeCreatedRoles.map(emp => ({
                          label: emp.employeeName,
                          options: emp.roles.map(r => ({
                            value: r.value,
                            label: r.label,
                          }))
                        }))}
                        value={selectedEmployeeCreatedRole}
                        onChange={(val) => {
                          setSelectedEmployeeCreatedRole(val);
                          setSelectedRole(null);
                        }}
                        className="basic-single"
                        classNamePrefix="select"
                        placeholder="View employee roles..."
                        isClearable
                        isDisabled={loading}
                        styles={{
                          groupHeading: (base) => ({
                            ...base,
                            color: '#0d6efd',
                            fontWeight: '600',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            borderBottom: '1px solid #e0e0e0',
                            paddingBottom: '4px',
                            marginBottom: '4px',
                          }),
                          option: (base, state) => ({
                            ...base,
                            paddingLeft: '20px',
                            fontSize: '14px',
                            backgroundColor: selectOptionBackgroundColor(state.isSelected, state.isFocused),
                            color: state.isSelected ? 'white' : '#333',
                          }),
                        }}
                        formatGroupLabel={formatGroupLabel}
                      />
                    </FormGroup>
                  </Col>
                )}
                <Col md={role === "ADMIN" ? 6 : 9} className="d-flex align-items-end justify-content-end">
                  {(selectedRole || selectedEmployeeCreatedRole) && (
                    <Button
                      color="primary"
                      className="mt-md-0 mt-2"
                      onClick={saveEmployeeRoles}
                      disabled={saveLoading || !rolesChanged}
                    >
                      {saveLoading ? (
                        <>
                          <Spinner size="sm" className="me-1" /> Saving...
                        </>
                      ) : (
                        <>
                          <i className="bx bx-save me-1"></i> Save Roles
                        </>
                      )}
                    </Button>
                  )}
                </Col>
              </Row>

              {rolesChanged && (selectedRole || selectedEmployeeCreatedRole) && (
                <Alert color="warning" className="d-flex align-items-center mb-3">
                  <i className="bx bx-info-circle me-2 fs-5"></i>
                  <div>
                    You have unsaved changes to the permissions. Click "Save Roles" to apply the changes.
                  </div>
                </Alert>
              )}
              {(selectedRole || selectedEmployeeCreatedRole) ? (
                <div className="mt-4 menu-roles-table-container">
                  <div className="table-responsive">
                    <Table bordered hover className="menu-roles-table">
                      <thead>
                        <tr className="bg-light">
                          <th style={{ width: "40%" }}>Menu</th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Read</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("read")}
                                onChange={(e) => handleColumnPermissionChange("read", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Write</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("write")}
                                onChange={(e) => handleColumnPermissionChange("write", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Delete</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("delete")}
                                onChange={(e) => handleColumnPermissionChange("delete", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Edit</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("edit")}
                                onChange={(e) => handleColumnPermissionChange("edit", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Print</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("print")}
                                onChange={(e) => handleColumnPermissionChange("print", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Mail</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("mail")}
                                onChange={(e) => handleColumnPermissionChange("mail", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {menuData && menuData.length > 0 ? (
                          menuData.map((group, index) => {
                            // Generate safe IDs for group elements
                            const groupBadgeId = `group-badge-${group.groupId.toString().replace(/[^a-zA-Z0-9]/g, '-')}`;
                            const groupToggleId = `group-toggle-${group.groupId.toString().replace(/[^a-zA-Z0-9]/g, '-')}`;

                            return (
                              <React.Fragment key={group.groupId}>
                                {/* Menu Group Header */}
                                <tr className="table-primary">
                                  <td colSpan={7} className="fw-bold">
                                    <div className="d-flex align-items-center justify-content-between">
                                      <div className="d-flex align-items-center">
                                        <Input
                                          type="checkbox"
                                          checked={hasGroupAllPermissions(group.groupId)}
                                          onChange={(e) => handleAllGroupPermissions(group.groupId, e.target.checked)}
                                          className="permission-checkbox me-2"
                                          style={{ width: "16px", height: "16px" }}
                                        />
                                        <i className="bx bx-category me-2"></i>
                                        {group.groupName}
                                      </div>
                                      {hasGroupAnyPermissions(group.groupId) && (
                                        <Badge color="info" className="ms-2" pill>
                                          <i className="bx bx-check me-1"></i>{" "}Permissions Set
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                </tr>

                                {/* Direct Link Group */}
                                {group.isLink && (
                                  <tr
                                    style={getRowStyles(group.groupId, true)}
                                    onMouseEnter={() => setHoveredRow(group.groupId)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                  >
                                    <td className="menu-name-cell">
                                      <i className="bx bx-link me-1 text-success"></i>
                                      {group.groupName}

                                      {hasAllPermissions(group.groupId, true) && (
                                        <>
                                          <Badge color="success" className="ms-2" pill id={groupBadgeId}>
                                            All
                                          </Badge>
                                          <UncontrolledTooltip placement="top" target={groupBadgeId}>
                                            Full access granted
                                          </UncontrolledTooltip>
                                        </>
                                      )}

                                      <div className="float-end">
                                        <Button
                                          color="light"
                                          size="sm"
                                          className="btn-sm py-0 px-1"
                                          onClick={() => handleAllPermissions(group.groupId, true, !hasAllPermissions(group.groupId, true))}
                                          id={groupToggleId}
                                        >
                                          {hasAllPermissions(group.groupId, true) ? (
                                            <i className="bx bx-x text-danger"></i>
                                          ) : (
                                            <i className="bx bx-check text-success"></i>
                                          )}
                                        </Button>
                                        <UncontrolledTooltip placement="top" target={groupToggleId}>
                                          {hasAllPermissions(group.groupId, true) ? "Revoke all permissions" : "Grant all permissions"}
                                        </UncontrolledTooltip>
                                      </div>
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "read")}
                                        onChange={(e) =>
                                          handlePermissionChange(group.groupId, true, "read", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "write")}
                                        onChange={(e) =>
                                          handlePermissionChange(group.groupId, true, "write", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "delete")}
                                        onChange={(e) =>
                                          handlePermissionChange(group.groupId, true, "delete", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "edit")}
                                        onChange={(e) =>
                                          handlePermissionChange(group.groupId, true, "edit", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "print")}
                                        onChange={(e) =>
                                          handlePermissionChange(group.groupId, true, "print", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "mail")}
                                        onChange={(e) =>
                                          handlePermissionChange(group.groupId, true, "mail", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                  </tr>
                                )}

                                {/* Group's menus with their nested children */}
                                {!group.isLink && group.menus && group.menus.length > 0 && renderMenuItems(group.menus)}

                                {/* Empty group message */}
                                {!group.isLink && (!group.menus || group.menus.length === 0) && (
                                  <tr>
                                    <td colSpan={7} className="text-center text-muted">
                                      <i className="bx bx-info-circle me-1"></i>
                                      <i>No menus in this group</i>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center py-5">
                              <div className="text-muted">
                                <i className="bx bx-menu fs-1 d-block mb-2"></i>{" "}No menu data available
                              </div>
                              <Button
                                color="primary"
                                size="sm"
                                className="mt-2"
                                onClick={fetchAllMenuData}
                              >
                                <i className="bx bx-refresh me-1"></i>{" "}Reload Menus
                              </Button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>

                  {menuData && menuData.length > 0 && (
                    <div className="text-center text-muted small mt-3">
                      <i className="bx bx-bulb me-1"></i>{" "}Tip: Use the checkboxes in column headers to select entire columns, group headers to select all menus in a group, or individual checkboxes for specific permissions.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-5 my-4 border rounded bg-light">
                  <div className="avatar-lg mx-auto mb-4">
                    <div className="avatar-title bg-white text-primary display-5 rounded-circle shadow-sm">
                      <i className="bx bx-user-circle"></i>
                    </div>
                  </div>
                  <h5>Select a Role</h5>
                  <p className="text-muted">
                    Please select a role from the dropdown above to manage its permissions
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
          {/* Preview Impact Modal */}
          {previewModal && previewData && (
            <div
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              }}>
                {/* Header */}
                <div className="d-flex align-items-center mb-3">
                  <i className="bx bx-error-circle text-warning fs-3 me-2"></i>
                  <h5 className="mb-0">Impact Warning</h5>
                </div>

                {/* Message */}
                <p className="text-muted mb-3">
                  Saving these changes will strip <strong>{previewData.affectedCount}</strong> permission(s)
                  from the following sub-roles:
                </p>

                {/* Affected roles list */}
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {previewData.affectedRoles?.map((affectedRole) => (
                    <div key={affectedRole.roleId || affectedRole.roleName} className="border rounded p-2 mb-2">
                      <div className="d-flex align-items-center mb-1">
                        <i className="bx bx-user-circle me-2 text-primary"></i>{" "}
                        <strong>{affectedRole.roleName}</strong>
                      </div>
                      <div className="d-flex flex-wrap gap-1 ps-4">
                        {affectedRole.affectedPermissions?.map((perm, pIdx) => (
                          perm.permissions.map((key, kIdx) => (
                            <Badge key={`${pIdx}-${kIdx}`} color="danger" pill>
                              {key}
                            </Badge>
                          ))
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-muted small mt-3">
                  Do you want to continue? Sub-role permissions exceeding your new settings will be revoked.
                </p>

                {/* Buttons */}
                <div className="d-flex justify-content-end gap-2 mt-3">
                  <Button
                    color="secondary"
                    outline
                    onClick={() => {
                      setPreviewModal(false);
                      setPreviewData(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button color="primary" onClick={confirmSave}>
                    Yes, Save Anyway
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Container>
      </div>

      <style>{`
        .menu-roles-table th, .menu-roles-table td {
          vertical-align: middle;
        }
        
        .menu-name-cell {
          position: relative;
        }
        
        .permission-cell {
          width: 80px;
          text-align: center;
        }
        
        .permission-checkbox {
          cursor: pointer;
          width: 18px;
          height: 18px;
        }
        
        .table-responsive {
          max-height: calc(100vh - 300px);
          overflow-y: auto;
        }
        
        .table-primary td {
          background-color: rgba(13, 110, 253, 0.15) !important;
        }
      `}</style>
    </React.Fragment>
  );
};

export default EmployeeRoles;