import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Label,
  Input,
  Row,
  Button,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalHeader,
  Badge,
  Spinner,
} from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  createTrainer,
  updateTrainer,
  deleteTrainer,
  searchTrainers,
  getTrainerMembers,
  assignMembersToTrainer,
  unassignMemberFromTrainer,
  listUnassignedMembers,
  setTrainerPassword,
  revokeTrainerPortalAccess,
} from "../../api/trainers.api";
import { listBranches } from "../../api/branches.api";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const initialState = {
  fullName: "",
  mobileNumber: "",
  email: "",
  // Seeded from the branch master on mount, so a new gym needs no code change.
  branch: "",
  notes: "",
  isActive: true,
};

const Trainers = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions, isAdmin } = useContext(MenuContext);
  // Same reasoning as Website/WebsiteAdverts.jsx: a super admin short-circuits
  // checkPermission on the server AND PermissionProtected on the client, so a
  // UI that insists on a MenuMaster permission row hides controls the server
  // would happily honour - and the owner is the one account guaranteed to hit
  // it, because the gym menus are seeded without blanket role grants.
  const permissions = isAdmin
    ? { read: true, write: true, edit: true, delete: true }
    : currentPagePermissions || {
        read: true,
        write: true,
        edit: true,
        delete: true,
      };

  const [values, setValues] = useState(initialState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [removeId, setRemoveId] = useState("");

  const [trainers, setTrainers] = useState([]);
  // Physical branches only — a trainer is posted to a real gym, never to a
  // cost bucket such as "Common".
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [column, setcolumn] = useState("fullName");
  const [sortDirection, setsortDirection] = useState("asc");
  const [branchFilter, setBranchFilter] = useState("");
  const [modal_delete, setmodal_delete] = useState(false);

  /**
   * Portal access (plan.md D4).
   *
   * Credentials go through their own two endpoints and are NEVER part of the
   * trainer payload, exactly as on the member screen: a password must not be
   * changeable by accident while somebody is fixing a phone number.
   *
   * `hasPortalAccess` is a real stored field on Trainer, not derived here -
   * `passwordHash` is select:false, so anything computed client-side from the
   * row would read "no access" for every trainer who can in fact log in.
   */
  const [portalPassword, setPortalPassword] = useState("");
  const [portalLoginId, setPortalLoginId] = useState("");
  const [portalBusy, setPortalBusy] = useState(false);
  const [hasPortalAccess, setHasPortalAccess] = useState(false);

  // Roster panel state
  const [rosterModal, setRosterModal] = useState(false);
  const [activeTrainer, setActiveTrainer] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [picked, setPicked] = useState([]);

  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;

    try {
      const response = await searchTrainers({
        skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        branch: branchFilter || undefined,
      });

      if (response.data?.data?.length > 0) {
        const resData = response.data.data[0];
        setTrainers(resData.data || []);
        setTotalRows(resData.count || 0);
      } else {
        setTrainers([]);
        setTotalRows(0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load trainers");
    } finally {
      setLoading(false);
    }
  }, [pageNo, perPage, column, sortDirection, query, branchFilter]);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  useEffect(() => {
    // physicalOnly: cost buckets are not gyms a trainer can be posted to.
    listBranches(true)
      .then((res) => {
        if (!res.data.isOk) return;
        const list = res.data.data || [];
        setBranches(list);
        // Default a new trainer to the first branch in display order. Only
        // fills a blank — never overwrites a branch the user already picked.
        const first = list[0]?.name;
        if (first) {
          setValues((v) => (v.branch ? v : { ...v, branch: first }));
        }
      })
      // On failure the list stays empty; the form still keeps whatever branch
      // the record already has rather than blocking the user.
      .catch((err) => console.error("Error loading branches:", err));
  }, []);

  /** Clearing the typed password on every exit: it must not survive the form. */
  const resetPortalFields = () => {
    setPortalPassword("");
    setPortalLoginId("");
    setHasPortalAccess(false);
  };

  const tog_list = () => {
    setShowForm(false);
    setUpdateForm(false);
    setValues(initialState);
    setIsSubmit(false);
    setFormErrors({});
    resetPortalFields();
  };

  const handleOpenAddForm = () => {
    setShowForm(true);
    setUpdateForm(false);
    setValues({ ...initialState, branch: branches[0]?.name || "" });
    setIsSubmit(false);
    setFormErrors({});
    resetPortalFields();
  };

  const tog_delete = (id) => {
    setmodal_delete(!modal_delete);
    setRemoveId(id);
  };

  const handleTog_edit = (row) => {
    setUpdateForm(true);
    setShowForm(false);
    setIsSubmit(false);
    setSelectedId(row._id);
    setValues({
      fullName: row.fullName || "",
      mobileNumber: row.mobileNumber || "",
      email: row.email || "",
      branch: row.branch || branches[0]?.name || "",
      notes: row.notes || "",
      isActive: row.isActive !== undefined ? row.isActive : true,
    });
    setPortalPassword("");
    setPortalLoginId(row.loginId || "");
    setHasPortalAccess(Boolean(row.hasPortalAccess));
  };

  /** Grant or reset portal access for the trainer currently being edited. */
  const handleSetPortalPassword = async () => {
    if (!portalPassword || portalPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPortalBusy(true);
    try {
      const res = await setTrainerPassword(
        selectedId,
        portalPassword,
        portalLoginId.trim(),
      );
      if (res.data.isOk) {
        // The server's message names the login ID it settled on, which may not
        // be what was typed (a blank one falls back to the mobile number), so
        // it is surfaced verbatim rather than replaced with a generic success.
        toast.success(res.data.message);
        setPortalPassword("");
        setHasPortalAccess(true);
        fetchTrainers();
      } else {
        toast.error(res.data.message || "Could not set password");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not set password");
    } finally {
      setPortalBusy(false);
    }
  };

  const handleRevokePortal = async () => {
    if (!window.confirm("Remove portal access for this trainer?")) return;
    setPortalBusy(true);
    try {
      const res = await revokeTrainerPortalAccess(selectedId);
      if (res.data.isOk) {
        toast.success(res.data.message);
        setHasPortalAccess(false);
        fetchTrainers();
      } else {
        toast.error(res.data.message || "Could not remove access");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not remove access");
    } finally {
      setPortalBusy(false);
    }
  };

  const handleChange = (e) => {
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  };

  const handleCheck = (e) => {
    setValues({ ...values, [e.target.name]: e.target.checked });
  };

  const validate = (val) => {
    const errors = {};
    if (!val.fullName.trim()) errors.fullName = "Trainer name is required!";
    if (!val.mobileNumber.trim()) {
      errors.mobileNumber = "Contact number is required!";
    } else if (!/^[+\d][\d\s-]{7,15}$/.test(val.mobileNumber.trim())) {
      errors.mobileNumber = "Enter a valid contact number";
    }
    return errors;
  };

  const handleClick = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    createTrainer(values)
      .then((res) => {
        if (res.data.isOk) {
          toast.success("Trainer added successfully!");
          setShowForm(false);
          setValues(initialState);
          fetchTrainers();
        } else {
          toast.error(res.data.message || "Failed to add trainer");
        }
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || "Failed to add trainer");
      })
      .finally(() => setIsSaving(false));
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    updateTrainer(selectedId, values)
      .then((res) => {
        if (res.data.isOk) {
          toast.success("Trainer updated successfully!");
          setUpdateForm(false);
          fetchTrainers();
        } else {
          toast.error(res.data.message || "Failed to update trainer");
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to update trainer");
      })
      .finally(() => setIsSaving(false));
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteTrainer(removeId);
      if (res.data.isOk) {
        toast.success("Trainer deleted successfully");
        fetchTrainers();
        setmodal_delete(false);
      } else {
        toast.error(res.data.message || "Failed to delete trainer");
      }
    } catch (error) {
      // The server refuses to delete a trainer who still has members and says
      // how many need reassigning — surface that message verbatim.
      toast.error(
        error.response?.data?.message || "An error occurred while deleting",
      );
      setmodal_delete(false);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  // ===== Roster panel =====

  const loadRoster = useCallback(async (trainerId) => {
    setRosterLoading(true);
    try {
      const res = await getTrainerMembers(trainerId);
      if (res.data.isOk) setRoster(res.data.data.members || []);
    } catch (err) {
      console.error(err);
      toast.error("Could not load the member list");
    } finally {
      setRosterLoading(false);
    }
  }, []);

  const loadCandidates = useCallback(async (branch, match) => {
    try {
      const res = await listUnassignedMembers({ branch, match });
      if (res.data.isOk) setCandidates(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const openRoster = async (row) => {
    setActiveTrainer(row);
    setPicked([]);
    setCandidateSearch("");
    setRosterModal(true);
    await Promise.all([loadRoster(row._id), loadCandidates("", "")]);
  };

  const togglePicked = (id) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const submitAssign = async () => {
    if (picked.length === 0) {
      toast.error("Select at least one member");
      return;
    }
    setIsSaving(true);
    try {
      const res = await assignMembersToTrainer(activeTrainer._id, picked);
      if (res.data.isOk) {
        toast.success(res.data.message);
        setPicked([]);
        await Promise.all([
          loadRoster(activeTrainer._id),
          loadCandidates("", candidateSearch),
        ]);
        fetchTrainers();
      } else {
        toast.error(res.data.message || "Failed to assign members");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign members");
    } finally {
      setIsSaving(false);
    }
  };

  const removeFromRoster = async (memberId) => {
    try {
      const res = await unassignMemberFromTrainer(activeTrainer._id, memberId);
      if (res.data.isOk) {
        toast.success(res.data.message);
        await Promise.all([
          loadRoster(activeTrainer._id),
          loadCandidates("", candidateSearch),
        ]);
        fetchTrainers();
      } else {
        toast.error(res.data.message || "Failed to remove member");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleSort = (col, direction) => {
    setcolumn(col.sortField || "fullName");
    setsortDirection(direction);
  };

  const col = useMemo(
    () => [
      {
        name: "Trainer",
        cell: (row) => (
          <div className="py-2">
            <div className="fw-semibold">{row.fullName}</div>
            <div className="text-muted small">
              <i className="ri-phone-line align-bottom me-1"></i>
              {row.mobileNumber}
            </div>
          </div>
        ),
        sortable: true,
        sortField: "fullName",
        minWidth: "200px",
      },
      {
        name: "Email",
        selector: (row) => row.email || "-",
        minWidth: "190px",
      },
      {
        name: "Branch",
        selector: (row) => row.branch,
        sortable: true,
        sortField: "branch",
        width: "110px",
      },
      {
        name: "Members",
        cell: (row) => (
          <Badge color={row.memberCount > 0 ? "primary" : "light"} pill>
            {row.memberCount || 0} assigned
          </Badge>
        ),
        width: "140px",
      },
      {
        name: "Status",
        cell: (row) => (
          <span className={`badge ${row.isActive ? "bg-success" : "bg-danger"}`}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        ),
        width: "110px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div className="d-flex align-items-center gap-1 flex-wrap py-1">
            <button
              className="btn btn-sm btn-primary d-flex align-items-center gap-1"
              onClick={() => openRoster(row)}
              title="View and assign members"
            >
              <i className="ri-team-line"></i> Members
            </button>
            {permissions.edit && (
              <button
                className="btn btn-sm btn-success d-flex align-items-center gap-1"
                onClick={() => handleTog_edit(row)}
                aria-label={`Edit ${row.fullName}`}
                title="Edit trainer"
              >
                <i className="ri-pencil-line"></i>
              </button>
            )}
            {permissions.delete && (
              <button
                className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                onClick={() => tog_delete(row._id)}
                aria-label={`Delete ${row.fullName}`}
                title="Delete trainer"
              >
                <i className="ri-delete-bin-line"></i>
              </button>
            )}
          </div>
        ),
        minWidth: "220px",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, pageNo, perPage],
  );

  const renderForm = () => (
    <CardBody>
      <Form onSubmit={updateForm ? handleUpdate : handleClick}>
        <Row>
          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="fullNameTrainer" className="form-label fw-bold">
                Trainer Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="fullNameTrainer"
                name="fullName"
                placeholder="e.g. Rohit Parmar"
                value={values.fullName}
                onChange={handleChange}
              />
              {isSubmit && formErrors.fullName && (
                <p className="text-danger small mt-1">{formErrors.fullName}</p>
              )}
            </FormGroup>
          </Col>
          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="mobileNumberTrainer" className="form-label fw-bold">
                Contact Number <span className="text-danger">*</span>
              </Label>
              <Input
                id="mobileNumberTrainer"
                name="mobileNumber"
                placeholder="e.g. 98000 00001"
                value={values.mobileNumber}
                onChange={handleChange}
              />
              {isSubmit && formErrors.mobileNumber && (
                <p className="text-danger small mt-1">
                  {formErrors.mobileNumber}
                </p>
              )}
            </FormGroup>
          </Col>
          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="emailTrainer" className="form-label fw-bold">Email</Label>
              <Input
                id="emailTrainer"
                type="email"
                name="email"
                placeholder="optional"
                value={values.email}
                onChange={handleChange}
              />
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="branchTrainer" className="form-label fw-bold">Branch</Label>
              <Input
                id="branchTrainer"
                type="select"
                name="branch"
                value={values.branch}
                onChange={handleChange}
              >
                {branches.map((b) => (
                  <option key={b._id} value={b.name}>
                    {b.displayName || b.name}
                  </option>
                ))}
                {/* Keep whatever the record already has selectable, even if the
                    branch list failed to load or that branch is now inactive. */}
                {values.branch &&
                  !branches.some((b) => b.name === values.branch) && (
                    <option value={values.branch}>{values.branch}</option>
                  )}
              </Input>
            </FormGroup>
          </Col>
          <Col md={5}>
            <FormGroup className="mb-3">
              <Label htmlFor="notesTrainer" className="form-label fw-bold">Notes</Label>
              <Input
                id="notesTrainer"
                name="notes"
                value={values.notes}
                onChange={handleChange}
              />
            </FormGroup>
          </Col>
          <Col md={3} className="d-flex align-items-center">
            <FormGroup className="form-check mb-0 mt-3">
              <Input
                type="checkbox"
                className="form-check-input"
                id="isActiveTrainer"
                name="isActive"
                checked={values.isActive}
                onChange={handleCheck}
              />
              <Label
                className="form-check-label ms-1 fw-semibold"
                htmlFor="isActiveTrainer"
              >
                Is Active
              </Label>
            </FormGroup>
          </Col>
        </Row>

        {/* ------------------------------------------------------------------
            Portal access - edit mode only, because a trainer has to exist
            before credentials can be attached to an _id.

            WHAT THE LOGIN IS FOR: a trainer signs in to the same member portal
            and records their own shift, which is what `subjectType: "TRAINER"`
            on an Attendance row attaches to. It is a PORTAL login, signed with
            the portal key - it is not a staff account and gives no access to
            this admin panel. Staff sign in with an express-session cookie and a
            different key set entirely; the two must never converge.

            Gated on `permissions.edit` (which includes isAdmin above): these
            two endpoints require a staff session server-side, so a role without
            edit would be shown a button that 403s.
           ------------------------------------------------------------------ */}
        {updateForm && permissions.edit && (
          <>
            <hr className="my-4" />
            <h6
              className="text-uppercase text-muted fw-bold mb-3"
              style={{ letterSpacing: "0.5px" }}
            >
              Trainer Portal Access
            </h6>
            <Row className="bg-light rounded p-2 mx-0 mb-3">
              <Col md={12} className="mb-2">
                <span className="small">
                  Portal status:
                  {hasPortalAccess ? (
                    <Badge color="success" className="ms-2">
                      Access enabled
                    </Badge>
                  ) : (
                    <Badge color="light" className="ms-2 text-body">
                      No access yet
                    </Badge>
                  )}
                </span>
              </Col>
              <Col md={4}>
                <FormGroup className="mb-2">
                  <Label htmlFor="trainer-portal-loginId" className="form-label small">
                    Login ID
                  </Label>
                  <Input
                    id="trainer-portal-loginId"
                    type="text"
                    value={portalLoginId}
                    placeholder={values.mobileNumber || "mobile number"}
                    onChange={(e) => setPortalLoginId(e.target.value)}
                  />
                  <small className="text-muted">
                    Email or any ID. Leave blank to use the contact number.
                  </small>
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup className="mb-2">
                  <Label htmlFor="trainer-portal-password" className="form-label small">
                    {hasPortalAccess ? "Reset password" : "Set password"}
                  </Label>
                  <Input
                    id="trainer-portal-password"
                    type="text"
                    autoComplete="new-password"
                    value={portalPassword}
                    placeholder="minimum 6 characters"
                    onChange={(e) => setPortalPassword(e.target.value)}
                  />
                </FormGroup>
              </Col>
              <Col md={7} className="d-flex align-items-end gap-2 mb-2">
                <Button
                  type="button"
                  color="primary"
                  size="sm"
                  disabled={portalBusy}
                  onClick={handleSetPortalPassword}
                >
                  {portalBusy
                    ? "Saving..."
                    : hasPortalAccess
                      ? "Reset Password"
                      : "Enable Portal Access"}
                </Button>
                {hasPortalAccess && (
                  <Button
                    type="button"
                    color="danger"
                    size="sm"
                    outline
                    disabled={portalBusy}
                    onClick={handleRevokePortal}
                  >
                    Remove Access
                  </Button>
                )}
              </Col>
              <Col md={12}>
                <small className="text-muted">
                  The trainer is asked to change this password on first login.
                  Removing access leaves the trainer and their roster untouched -
                  it only stops them signing in to the portal.
                </small>
              </Col>
            </Row>
          </>
        )}

        <div className="mt-3 d-flex justify-content-end gap-2">
          <Button type="button" color="light" onClick={tog_list}>
            Cancel
          </Button>
          <Button type="submit" color="success" disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : updateForm
                ? "Update Trainer"
                : "Save Trainer"}
          </Button>
        </div>
      </Form>
    </CardBody>
  );

  document.title = `Trainers | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Gym" title="Trainers" pageTitle="Trainers" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm
                      ? "Add Trainer"
                      : updateForm
                        ? "Edit Trainer"
                        : "Trainers"}
                  </h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {!showForm && !updateForm ? (
                      <>
                        <div style={{ minWidth: "140px" }}>
                          <Input
                            type="select"
                            className="form-select form-select-sm"
                            value={branchFilter}
                            aria-label="Filter trainers by branch"
                            onChange={(e) => {
                              setBranchFilter(e.target.value);
                              setPageNo(1);
                            }}
                          >
                            <option value="">All Branches</option>
                            {branches.map((b) => (
                              <option key={b._id} value={b.name}>
                                {b.displayName || b.name}
                              </option>
                            ))}
                          </Input>
                        </div>
                        <div
                          className="search-box mb-0"
                          style={{ position: "relative", minWidth: "220px" }}
                        >
                          <Input
                            type="text"
                            className="form-control form-control-sm search"
                            placeholder="Search name or number..."
                            aria-label="Search trainers by name or number"
                            style={{ paddingLeft: "30px", height: "30px" }}
                            value={query}
                            onChange={(e) => {
                              setQuery(e.target.value);
                              setPageNo(1);
                            }}
                          />
                          <i
                            className="ri-search-line search-icon"
                            style={{
                              position: "absolute",
                              left: "10px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#878a99",
                              fontSize: "12px",
                            }}
                          ></i>
                        </div>
                        {permissions.write && (
                          <Button
                            color="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            style={{ height: "30px" }}
                            onClick={handleOpenAddForm}
                          >
                            <i className="ri-add-line align-bottom"></i> Add
                            Trainer
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button color="dark" size="sm" onClick={tog_list}>
                        ≡ List
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {showForm || updateForm ? (
                  renderForm()
                ) : (
                  <CardBody>
                    <div className="table-responsive table-card mt-1 mb-1">
                      <DataTable
                        columns={col}
                        data={trainers}
                        progressPending={loading}
                        sortServer
                        onSort={handleSort}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={perPage}
                        paginationRowsPerPageOptions={[10, 25, 50, 100]}
                        onChangeRowsPerPage={(newPerPage) =>
                          setPerPage(newPerPage)
                        }
                        onChangePage={(page) => setPageNo(page)}
                        noDataComponent={
                          <div className="text-center py-4 text-muted">
                            No trainers yet. Click <strong>Add Trainer</strong>{" "}
                            to create one.
                          </div>
                        }
                      />
                    </div>
                  </CardBody>
                )}
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Roster: current members + assign more */}
      <Modal
        isOpen={rosterModal}
        toggle={() => setRosterModal(false)}
        size="lg"
        centered
      >
        <ModalHeader toggle={() => setRosterModal(false)}>
          Members of {activeTrainer?.fullName}
        </ModalHeader>
        <ModalBody>
          <Row>
            <Col md={6}>
              <h6 className="fw-bold mb-2">
                Assigned{" "}
                <Badge color="primary" pill>
                  {roster.length}
                </Badge>
              </h6>
              <div
                className="border rounded p-2"
                style={{ maxHeight: "340px", overflowY: "auto" }}
              >
                {rosterLoading ? (
                  <div className="text-center py-4">
                    <Spinner size="sm" color="primary" />
                  </div>
                ) : roster.length === 0 ? (
                  <p className="text-muted small text-center py-4 mb-0">
                    No members assigned yet. Pick some from the right.
                  </p>
                ) : (
                  roster.map((m) => (
                    <div
                      key={m._id}
                      className="d-flex align-items-center justify-content-between border-bottom py-2"
                    >
                      <div>
                        <div className="fw-semibold small">{m.fullName}</div>
                        <div
                          className="text-muted"
                          style={{ fontSize: "11px" }}
                        >
                          {m.mobileNumber} · {m.branch} · ends{" "}
                          {formatDate(m.endDate)}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-soft-danger"
                        onClick={() => removeFromRoster(m._id)}
                        aria-label={`Remove ${m.fullName} from this trainer`}
                        title="Remove from this trainer"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Col>

            <Col md={6}>
              <h6 className="fw-bold mb-2">Add Members (unassigned)</h6>
              <Input
                type="text"
                bsSize="sm"
                className="mb-2"
                placeholder="Search members..."
                aria-label="Search unassigned members by name or number"
                value={candidateSearch}
                onChange={(e) => {
                  setCandidateSearch(e.target.value);
                  loadCandidates("", e.target.value);
                }}
              />
              <div
                className="border rounded p-2"
                style={{ maxHeight: "290px", overflowY: "auto" }}
              >
                {candidates.length === 0 ? (
                  <p className="text-muted small text-center py-4 mb-0">
                    Every active member already has a trainer.
                  </p>
                ) : (
                  candidates.map((m) => (
                    <div
                      key={m._id}
                      className="form-check d-flex align-items-center gap-2 border-bottom py-2"
                    >
                      <Input
                        type="checkbox"
                        className="form-check-input mt-0"
                        id={`cand-${m._id}`}
                        checked={picked.includes(m._id)}
                        onChange={() => togglePicked(m._id)}
                      />
                      <Label
                        className="form-check-label mb-0"
                        htmlFor={`cand-${m._id}`}
                      >
                        <span className="fw-semibold small">{m.fullName}</span>
                        <span
                          className="text-muted d-block"
                          style={{ fontSize: "11px" }}
                        >
                          {m.mobileNumber} · {m.branch}
                        </span>
                      </Label>
                    </div>
                  ))
                )}
              </div>
              <Button
                color="primary"
                size="sm"
                className="mt-2 w-100"
                onClick={submitAssign}
                disabled={isSaving || picked.length === 0}
              >
                {isSaving
                  ? "Assigning..."
                  : `Assign ${picked.length || ""} Member${
                      picked.length === 1 ? "" : "s"
                    }`}
              </Button>
            </Col>
          </Row>
        </ModalBody>
      </Modal>

      <DeleteModal
        show={modal_delete}
        handleDelete={handleDelete}
        toggle={() => setmodal_delete(false)}
        setmodal_delete={setmodal_delete}
        disabled={isDeleteLoading}
      />
    </React.Fragment>
  );
};

export default Trainers;
