import React, { useContext, useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
    Card,
    CardBody,
    CardHeader,
    Col,
    Container,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Label,
    Input,
    Row,
} from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import FormsFooter from "../../Components/Common/FormAddFooter";
import FormUpdateFooter from "../../Components/Common/FormUpdateFooter";
import { toast } from "react-toastify";
import {
    createMenu,
    deleteMenu,
    getMenuById,
    updateMenu,
    searchMenus,
    getAllMenuGroups,
    getAllMenus,
} from "../../api/menus.api";
import Select from "react-select";
import { MenuContext } from "../../context/MenuContext";
import IconPicker from "../../Components/Common/IconPicker";

const MenuActions = ({ row, currentPagePermissions, handleTog_edit, tog_delete }) => (
    <div className="d-flex gap-2">
        <div className="edit">
            {currentPagePermissions.edit && (
                <button
                    className="btn btn-sm btn-success edit-item-btn "
                    data-bs-toggle="modal"
                    data-bs-target="#showModal"
                    onClick={() => handleTog_edit(row._id)}
                >
                    Edit
                </button>
            )}
            {currentPagePermissions.delete && (
                <button
                    className="btn btn-sm btn-danger remove-item-btn"
                    data-bs-toggle="modal"
                    data-bs-target="#deleteRecordModal"
                    onClick={() => tog_delete(row._id)}
                >
                    Remove
                </button>
            )}
            {!currentPagePermissions.edit && !currentPagePermissions.delete && (
                <span className="text-muted">No actions available</span>
            )}
        </div>
    </div>
);

MenuActions.propTypes = {
    row: PropTypes.shape({
        _id: PropTypes.string.isRequired,
    }).isRequired,
    currentPagePermissions: PropTypes.shape({
        edit: PropTypes.bool,
        delete: PropTypes.bool,
    }).isRequired,
    handleTog_edit: PropTypes.func.isRequired,
    tog_delete: PropTypes.func.isRequired,
};

const initialState = {
    menuName: "",
    menuGroup: "",
    menuUrl: "",
    sequence: "",
    isActive: false,
    isParent: false,
    parentMenu: null,
    icon: "",
};

const findMenuById = (menuList, targetId) => {
    return menuList.find(menu => menu._id === targetId);
};

const getColumns = ({ currentPagePermissions, handleTog_edit, tog_delete }) => [
    {
        name: "Sr No",
        selector: (row, index) => index + 1,
        sortable: true,
        sortField: "createdAt",
        maxWidth: "20px",
    },
    {
        name: "Menu Name",
        selector: (row) => row.menuName,
        sortable: true,
        sortField: "menuName",
        minWidth: "130px",
    },
    {
        name: "Menu Group",
        selector: (row) => row.menuGroup,
        sortable: true,
        sortField: "menuGroup",
        minWidth: "130px",
    },
    {
        name: "Menu URL",
        selector: (row) => row.menuUrl,
        minWidth: "150px",
    },
    {
        name: "Sequence",
        selector: (row) => row.sequence,
        sortable: true,
        sortField: "sequence",
        minWidth: "130px",
    },
    {
        name: "Action",
        cell: (row) => (
            <MenuActions
                row={row}
                currentPagePermissions={currentPagePermissions}
                handleTog_edit={handleTog_edit}
                tog_delete={tog_delete}
            />
        ),
        sortable: false,
        minWidth: "180px",
    },
];

const MenuMaster = () => {
    const { currentPagePermissions } = useContext(MenuContext);
    const [values, setValues] = useState(initialState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmit, setIsSubmit] = useState(false);
    const [filter, setFilter] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const [departments, setDepartments] = useState([]);

    const [selectedMenuGroup, setSelectedMenuGroup] = useState(null);
    const [menuGroupList, setMenuGroupList] = useState([]);
    const [selectedParentMenu, setSelectedParentMenu] = useState(null);
    const [parentMenuList, setParentMenuList] = useState([]);

    const fetchMenuGroupList = async () => {
        const response = await getAllMenuGroups();
        setMenuGroupList(response.data.data);
    };

    const fetchParentMenus = async (groupId) => {
        if (!groupId) return;

        try {
            const response = await getAllMenus();

            // Check the response structure and extract the data array
            const menuData = response.data.data;

            // Build parent-child relationships and menu paths for display
            const menuMap = new Map();

            // First, create a map of all menus
            menuData.forEach(menu => {
                if (menu.menuGroup._id === groupId || menu.menuGroup === groupId) {
                    menuMap.set(menu._id.toString(), {
                        ...menu,
                        path: menu.menuName,
                        children: []
                    });
                }
            });

            // Build hierarchy and paths
            menuData.forEach(menu => {
                if (menu.menuGroup._id === groupId || menu.menuGroup === groupId) {
                    const menuId = menu._id.toString();

                    // If menu has parent and parent exists in our map
                    if (menu.parentMenu && menuMap.has(menu.parentMenu.toString())) {
                        const parentId = menu.parentMenu.toString();
                        const parent = menuMap.get(parentId);

                        // Add this menu as child to parent
                        parent.children.push(menuId);

                        // Update path to include parent path
                        const menuWithPath = menuMap.get(menuId);
                        menuWithPath.path = `${parent.path} > ${menuWithPath.path}`;
                        menuMap.set(menuId, menuWithPath);
                    }
                }
            });

            // Filter menus that can be parents (and aren't the current menu being edited)
            // Allow any menu to be a parent except itself (to prevent circular references)
            const validParentMenus = Array.from(menuMap.values())
                .filter(menu => {
                    // In edit mode, don't allow selecting self as parent
                    if (selectedMenuId && menu._id.toString() === selectedMenuId.toString()) {
                        return false;
                    }

                    // Return all menus that are marked as isParent, regardless of whether they have parents
                    return menu.isParent === true;
                })
                .map(menu => ({
                    _id: menu._id,
                    menuName: menu.path, // Use path for display to show hierarchy
                    isParent: menu.isParent
                }));

            setParentMenuList(validParentMenus);
        } catch (error) {
            console.error("Error fetching parent menus:", error);
        }
    };

    useEffect(() => {
        fetchMenuGroupList();
    }, []);

    useEffect(() => {
        if (selectedMenuGroup) {
            fetchParentMenus(selectedMenuGroup.value);
        }
    }, [selectedMenuGroup]);

    const [query, setQuery] = useState("");

    const [selectedMenuId, setSelectedMenuId] = useState("");
    const [remove_id, setRemove_id] = useState("");

    useEffect(() => {
        if (Object.keys(formErrors).length === 0 && isSubmit) {
            console.log("no errors");
        }
    }, [formErrors, isSubmit]);

    const [modal_list, setmodal_list] = useState(false);
    const tog_list = () => {
        setmodal_list(!modal_list);
        setValues(initialState);
        setIsSubmit(false);
    };

    const [modal_delete, setmodal_delete] = useState(false);
    const tog_delete = (_id) => {
        setmodal_delete(!modal_delete);
        setRemove_id(_id);
    };

    const [modal_edit, setmodal_edit] = useState(false);

    const handleTog_edit = async (_id) => {
        setmodal_edit(!modal_edit);
        setIsSubmit(false);
        setSelectedMenuId(_id);
        setIsLoading(true);
        try {
            const res = await getMenuById(_id);
            setValues({
                ...values,
                menuName: res.data.data.menuName,
                menuGroup: res.data.data.menuGroup,
                menuUrl: res.data.data.menuUrl,
                sequence: res.data.data.sequence,
                isActive: res.data.data.isActive,
                isParent: res.data.data.isParent || false,
                parentMenu: res.data.data.parentMenu || null,
                icon: res.data.data.icon || "",
            });
            setSelectedMenuGroup({
                value: res.data.data.menuGroup._id,
                label: res.data.data.menuGroup.menuGroupName,
            });

            // Set parent menu if exists
            if (res.data.data.parentMenu) {
                await fetchParentMenus(res.data.data.menuGroup._id);
                const parent = findMenuById(parentMenuList, res.data.data.parentMenu);
                if (parent) {
                    setSelectedParentMenu({
                        value: parent._id,
                        label: parent.menuName,
                    });
                }
            }
        } catch (err) {
            console.log(err);
            toast.error("Failed to fetch menu details");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
    };

    const handleCheck = (e) => {
        const { name, checked } = e.target;
        setValues({ ...values, [name]: checked });
    };

    const handleSubmitCancel = () => {
        setmodal_list(false);
        setValues(initialState);
        setIsSubmit(false);
    };

    const handleClick = (e) => {
        e.preventDefault();
        setFormErrors({});
        let errors = validate(values);
        setFormErrors(errors);
        setIsSubmit(true);

        // If isParent is true, make sure we mark it accordingly
        const dataToSend = {
            ...values,
            menuGroup: selectedMenuGroup.value,
            parentMenu: selectedParentMenu ? selectedParentMenu.value : null,
            isParent: values.isParent
        };

        if (Object.keys(errors).length === 0) {
            setIsLoading(true);
            createMenu(dataToSend)
                .then((res) => {
                    if (res.data.isOk) {
                        toast.success("Menu Added Successfully!");
                        setmodal_list(!modal_list);
                        setValues(initialState);
                        setSelectedParentMenu(null);
                        fetchDepartments();
                    }
                })
                .catch((error) => {
                    console.log("Error creating menu master:", error);
                    toast.error("Failed to add menu. Please try again.");
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    };

    const handleDelete = (e) => {
        e.preventDefault();
        setIsDeleteLoading(true);
        deleteMenu(remove_id)
            .then((res) => {
                setmodal_delete(!modal_delete);
                toast.success("Menu Removed Successfully!");
                fetchDepartments();
            })
            .catch((err) => {
                console.log(err);
                toast.error("Failed to remove menu. Please try again.");
            })
            .finally(() => {
                setIsDeleteLoading(false);
            });
    };

    const handleDeleteClose = (e) => {
        e.preventDefault();
        setmodal_delete(false);
    };

    const handleUpdateCancel = (e) => {
        setmodal_edit(false);
        setIsSubmit(false);
        setFormErrors({});
        setValues(initialState);
        setSelectedMenuGroup(null);
        setSelectedParentMenu(null);
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        let erros = validate(values);
        setFormErrors(erros);
        setIsSubmit(true);

        if (Object.keys(erros).length === 0) {
            setIsLoading(true);
            const dataToSend = {
                ...values,
                menuGroup: selectedMenuGroup.value,
                parentMenu: selectedParentMenu ? selectedParentMenu.value : null,
            };
            updateMenu(selectedMenuId, dataToSend)
                .then((res) => {
                    setmodal_edit(!modal_edit);
                    setValues(initialState);
                    setSelectedMenuGroup(null);
                    setSelectedParentMenu(null);
                    fetchDepartments();
                    toast.success("Menu Updated Successfully!");
                })
                .catch((err) => {
                    console.log("Error updating menu master:", err);
                    toast.error("Failed to update menu. Please try again.");
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    };

    const validate = (values) => {
        const errors = {};

        if (values.menuName === "") {
            errors.menuName = "Menu Name is required!";
        }

        if (selectedMenuGroup === null) {
            errors.menuGroup = "Menu Group is required!";
        }

        // Only require URL for non-parent menus
        if (!values.isParent && values.menuUrl === "") {
            errors.menuUrl = "Menu URL is required for non-parent menus!";
        }

        if (values.sequence === "") {
            errors.sequence = "Sequence is required!";
        }

        // Allow a menu to be both a parent and have a parent for multi-level hierarchy
        // We've removed the restriction that prevented an item from being both a parent and having a parent

        return errors;
    };

    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(100);
    const [pageNo, setPageNo] = useState(0);
    const [column, setcolumn] = useState();
    const [sortDirection, setsortDirection] = useState();

    const handleSort = (column, sortDirection) => {
        setcolumn(column.sortField);
        setsortDirection(sortDirection);
    };

    useEffect(() => {
        fetchDepartments();
    }, [pageNo, perPage, column, sortDirection, query, filter]);

    const fetchDepartments = async () => {
        setLoading(true);
        let skip = (pageNo - 1) * perPage;
        if (skip < 0) {
            skip = 0;
        }

        await searchMenus({
            skip: skip,
            per_page: perPage,
            sorton: column,
            sortdir: sortDirection,
            match: query,
            isActive: filter,
        })
            .then((response) => {
                if (response.data.data.length > 0) {
                    let res = response.data.data[0];
                    setLoading(false);
                    setTotalRows(res.count);
                    setDepartments(res.data);
                } else {
                    setDepartments([]);
                }
            });

        setLoading(false);
    };

    const handlePageChange = (page) => {
        setPageNo(page);
    };

    const handlePerRowsChange = async (newPerPage, page) => {
        setPerPage(newPerPage);
    };
    const handleFilter = (e) => {
        setPageNo(1);
        setFilter(e.target.checked);
    };
    const col = useMemo(
        () =>
            getColumns({
                currentPagePermissions,
                handleTog_edit,
                tog_delete,
            }),
        [currentPagePermissions, handleTog_edit, tog_delete]
    );

    document.title = `Menu Master | Shree Balaji Trade-Wing`;

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb
                        maintitle="Master"
                        title="Menu Master"
                        pageTitle="Master"
                    />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <FormsHeader
                                        formName="Menu Master"
                                        filter={filter}
                                        handleFilter={handleFilter}
                                        tog_list={tog_list}
                                        setQuery={setQuery}
                                        currentPagePermissions={currentPagePermissions}
                                        showAddButton={currentPagePermissions.write}
                                    />
                                </CardHeader>

                                <CardBody>
                                    <div id="customerList">
                                        <div className="table-responsive table-card mt-1 mb-1 text-right">
                                            <DataTable
                                                columns={col}
                                                data={departments}
                                                progressPending={loading}
                                                sortServer
                                                onSort={(
                                                    column,
                                                    sortDirection,
                                                    sortedRows
                                                ) => {
                                                    handleSort(
                                                        column,
                                                        sortDirection
                                                    );
                                                }}
                                                pagination
                                                paginationServer
                                                paginationTotalRows={totalRows}
                                                paginationPerPage={100}
                                                paginationRowsPerPageOptions={[
                                                    50,
                                                    100,
                                                    200,
                                                    300,
                                                    totalRows,
                                                ]}
                                                onChangeRowsPerPage={
                                                    handlePerRowsChange
                                                }
                                                onChangePage={handlePageChange}
                                            />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Add Modal */}
            <Modal
                isOpen={modal_list}
                toggle={() => {
                    tog_list();
                }}
                centered
            >
                <ModalHeader
                    className="bg-light p-3"
                    toggle={() => {
                        setmodal_list(false);
                        setIsSubmit(false);
                    }}
                >
                    Add Menu Master
                </ModalHeader>
                <form>
                    <ModalBody>
                        <div className="form-floating mb-3">
                            <Select
                                inputId="menuGroupSelectAdd"
                                className="basic-single"
                                classNamePrefix="select"
                                placeholder=""
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        minHeight: "58px",
                                        height: "58px",
                                        backgroundColor: "transparent",
                                    }),
                                    placeholder: (base) => ({
                                        ...base,
                                        marginTop: "8px",
                                    }),
                                    valueContainer: (base) => ({
                                        ...base,
                                        marginTop: "8px",
                                    }),
                                }}
                                options={menuGroupList.map((menuGroup) => ({
                                    value: menuGroup._id,
                                    label: menuGroup.menuGroupName,
                                }))}
                                value={selectedMenuGroup}
                                onChange={(selectedOption) => {
                                    setSelectedMenuGroup(selectedOption);
                                }}
                            />
                            <label
                                htmlFor="menuGroupSelectAdd"
                                className="form-label"
                                style={{
                                    opacity: 0.7,
                                    transform:
                                        "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                                }}
                            >
                                Menu Group <span className="text-danger"> *</span>
                            </label>
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                                type="text"
                                id="menuNameAdd"
                                required
                                name="menuName"
                                value={values.menuName}
                                onChange={handleChange}
                            />
                            <Label htmlFor="menuNameAdd">
                                Menu Name <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.menuName}
                                </p>
                            )}
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                                type="text"
                                id="menuUrlAdd"
                                required
                                name="menuUrl"
                                value={values.menuUrl}
                                onChange={handleChange}
                            />
                            <Label htmlFor="menuUrlAdd">
                                Menu URL <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.menuUrl}
                                </p>
                            )}
                        </div>
                        <IconPicker
                            value={values.icon}
                            onChange={(icon) => setValues({ ...values, icon })}
                            label="Menu Icon"
                        />
                        <div className="form-floating mb-3">
                            <Input
                                type="number"
                                id="sequenceAdd"
                                required
                                name="sequence"
                                value={values.sequence}
                                onChange={handleChange}
                                onWheel={(e) => e.target.blur()}
                            />
                            <Label htmlFor="sequenceAdd">
                                Sequence <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.sequence}
                                </p>
                            )}
                        </div>
                        <div className=" mb-3">
                            <Input
                                type="checkbox"
                                id="isActiveAdd"
                                className="form-check-input"
                                name="isActive"
                                value={values.isActive}
                                onChange={handleCheck}
                            />
                            <Label htmlFor="isActiveAdd" className="form-check-label ms-1">
                                Is Active
                            </Label>
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                                type="checkbox"
                                className="form-check-input"
                                name="isParent"
                                checked={values.isParent}
                                onChange={handleCheck}
                                id="isParentCheckbox"
                            />
                            <Label className="form-check-label ms-1" htmlFor="isParentCheckbox">
                                Is Parent Menu (can contain child menus)
                            </Label>
                            {isSubmit && formErrors.isParent && (
                                <p className="text-danger mt-2">
                                    {formErrors.isParent}
                                </p>
                            )}
                        </div>

                        <div className="form-floating mb-3">
                            <Select
                                inputId="parentMenuSelectAdd"
                                className="basic-single"
                                classNamePrefix="select"
                                placeholder="Select a parent menu"
                                isClearable
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        minHeight: "58px",
                                        height: "58px",
                                        backgroundColor: "transparent",
                                    }),
                                    placeholder: (base) => ({
                                        ...base,
                                        marginTop: "8px",
                                    }),
                                    valueContainer: (base) => ({
                                        ...base,
                                        marginTop: "8px",
                                    }),
                                }}
                                options={parentMenuList.map((menu) => ({
                                    value: menu._id,
                                    label: menu.menuName, // This now shows the full path
                                }))}
                                value={selectedParentMenu}
                                onChange={(selectedOption) => {
                                    setSelectedParentMenu(selectedOption);
                                }}
                            />
                            <label
                                htmlFor="parentMenuSelectAdd"
                                className="form-label"
                                style={{
                                    opacity: 0.7,
                                    transform:
                                        "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                                }}
                            >
                                Parent Menu (optional)
                            </label>
                            <small className="form-text text-muted">
                                Select a parent menu to nest this menu under. The path shows the hierarchy.
                            </small>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <FormsFooter
                            handleSubmit={handleClick}
                            handleSubmitCancel={handleSubmitCancel}
                            isLoading={isLoading}
                        />
                    </ModalFooter>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={modal_edit}
                toggle={() => {
                    handleTog_edit();
                }}
                centered
            >
                <ModalHeader
                    className="bg-light p-3"
                    toggle={() => {
                        setmodal_edit(false);
                        setIsSubmit(false);
                    }}
                >
                    Edit Menu Group
                </ModalHeader>
                <form>
                    <ModalBody>
                        <div className="form-floating mb-3">
                            <Select
                                inputId="menuGroupSelectEdit"
                                className="basic-single"
                                classNamePrefix="select"
                                placeholder=""
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        minHeight: "58px",
                                        height: "58px",
                                        backgroundColor: "transparent",
                                    }),
                                    placeholder: (base) => ({
                                        ...base,
                                        marginTop: "8px",
                                    }),
                                    valueContainer: (base) => ({
                                        ...base,
                                        marginTop: "8px",
                                    }),
                                }}
                                options={menuGroupList.map((menuGroup) => ({
                                    value: menuGroup._id,
                                    label: menuGroup.menuGroupName,
                                }))}
                                value={selectedMenuGroup}
                                onChange={(selectedOption) => {
                                    setSelectedMenuGroup(selectedOption);
                                }}
                            />
                            <label
                                htmlFor="menuGroupSelectEdit"
                                className="form-label"
                                style={{
                                    opacity: 0.7,
                                    transform:
                                        "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                                }}
                            >
                                Menu Group
                            </label>
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                                type="text"
                                id="menuNameEdit"
                                required
                                name="menuName"
                                value={values.menuName}
                                onChange={handleChange}
                            />
                            <Label htmlFor="menuNameEdit">
                                Menu Name <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.menuName}
                                </p>
                            )}
                        </div>

                        <div className="form-floating mb-3">
                            <Input
                                type="text"
                                id="menuUrlEdit"
                                required
                                name="menuUrl"
                                value={values.menuUrl}
                                onChange={handleChange}
                            />
                            <Label htmlFor="menuUrlEdit">
                                Menu URL <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.menuUrl}
                                </p>
                            )}
                        </div>
                        <IconPicker
                            value={values.icon}
                            onChange={(icon) => setValues({ ...values, icon })}
                            label="Menu Icon"
                        />
                        <div className="form-floating mb-3">
                            <Input
                                type="number"
                                id="sequenceEdit"
                                required
                                name="sequence"
                                value={values.sequence}
                                onChange={handleChange}
                                min={1}
                                onWheel={(e) => e.target.blur()}
                            />
                            <Label htmlFor="sequenceEdit">
                                Sequence <span className="text-danger">*</span>
                            </Label>
                            {isSubmit && (
                                <p className="text-danger">
                                    {formErrors.sequence}
                                </p>
                            )}
                        </div>
                        <div className=" mb-3">
                            <Input
                                type="checkbox"
                                id="isActiveEdit"
                                className="form-check-input"
                                name="isActive"
                                value={values.isActive}
                                checked={values.isActive}
                                onChange={handleCheck}
                            />
                            <Label htmlFor="isActiveEdit" className="form-check-label ms-1">
                                Is Active
                            </Label>
                        </div>
                        <div className="form-floating mb-3">
                            <Input
                                type="checkbox"
                                className="form-check-input"
                                name="isParent"
                                checked={values.isParent}
                                onChange={handleCheck}
                                id="isParentCheckboxEdit"
                            />
                            <Label className="form-check-label ms-1" htmlFor="isParentCheckboxEdit">
                                Is Parent Menu (can contain child menus)
                            </Label>
                            {isSubmit && formErrors.isParent && (
                                <p className="text-danger mt-2">
                                    {formErrors.isParent}
                                </p>
                            )}
                        </div>

                        <div className="form-floating mb-3">
                            <Select
                                inputId="parentMenuSelectEdit"
                                className="basic-single"
                                classNamePrefix="select"
                                placeholder="Select a parent menu"
                                isClearable
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        minHeight: "58px",
                                        height: "58px",
                                        backgroundColor: "transparent",
                                    }),
                                    placeholder: (base) => ({
                                        ...base,
                                        marginTop: "8px",
                                    }),
                                    valueContainer: (base) => ({
                                        ...base,
                                        marginTop: "8px",
                                    }),
                                }}
                                options={parentMenuList.map((menu) => ({
                                    value: menu._id,
                                    label: menu.menuName, // This now shows the full path
                                }))}
                                value={selectedParentMenu}
                                onChange={(selectedOption) => {
                                    setSelectedParentMenu(selectedOption);
                                }}
                            />
                            <label
                                htmlFor="parentMenuSelectEdit"
                                className="form-label"
                                style={{
                                    opacity: 0.7,
                                    transform:
                                        "scale(0.85) translateY(-0.5rem) translateX(0.15rem)",
                                }}
                            >
                                Parent Menu (optional)
                            </label>
                            <small className="form-text text-muted">
                                Select a parent menu to nest this menu under. The path shows the hierarchy.
                            </small>
                        </div>
                    </ModalBody>

                    <ModalFooter>
                        <FormUpdateFooter
                            handleUpdate={handleUpdate}
                            handleUpdateCancel={handleUpdateCancel}
                            isLoading={isLoading}
                        />
                    </ModalFooter>
                </form>
            </Modal>

            <DeleteModal
                show={modal_delete}
                handleDelete={handleDelete}
                toggle={handleDeleteClose}
                setmodal_delete={setmodal_delete}
                disabled={isDeleteLoading}
            />
        </React.Fragment>
    );
};

export default MenuMaster;
