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
  Nav,
  NavItem,
  NavLink,
} from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  createMember,
  updateMember,
  deleteMember,
  searchMembers,
  listMemberPlans,
  renewMembership,
  addMemberPayment,
  setMemberPassword,
  revokeMemberPortalAccess,
} from "../../api/members.api";
import { listAllTrainers } from "../../api/trainers.api";
import { listWorkoutPlans } from "../../api/workoutPlans.api";
import { listBranches } from "../../api/branches.api";
import { fileUrl } from "@/utils/fileUrl";

const toInputDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

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

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/** Days until expiry — negative means already lapsed. */
const daysUntil = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

const membershipStatus = (member) => {
  const d = daysUntil(member.endDate);
  if (d < 0) return { label: `Expired ${Math.abs(d)}d ago`, color: "danger" };
  if (d === 0) return { label: "Expires today", color: "danger" };
  if (d <= 7) return { label: `${d}d left`, color: "warning" };
  return { label: "Active", color: "success" };
};

const initialState = {
  fullName: "",
  mobileNumber: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  address: "",
  // Seeded from the branch master on mount, so a new gym needs no code change.
  branch: "",
  trainerId: "",
  // "" means the member follows the gym default exercise plan.
  workoutPlanId: "",
  planCode: "MONTHLY",
  startDate: toInputDate(new Date()),
  endDate: "",
  totalFee: "",
  heightCm: "",
  notes: "",
  isActive: true,
  initialPayment: { amount: "", mode: "Cash", receiptNo: "", note: "" },
};

/** Upload rules, mirrored on the server in routes/v1/members.routes.js. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp";
const ID_PROOF_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";

const humanSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// fileUrl now comes from @/utils/fileUrl. The local copy resolved against
// VITE_API_URL_DEV and fell back to http://localhost:7002, so member photos and
// ID proofs pointed at the developer's machine in every production build; it
// also could not handle the absolute URLs the Supabase and Blob backends store.

const STATUS_TABS = [
  { key: "", label: "All Members" },
  { key: "EXPIRING", label: "Expiring in 7 Days" },
  { key: "EXPIRED", label: "Expired / Payment Due" },
  { key: "ACTIVE", label: "Active" },
];

const Members = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const permissions = currentPagePermissions || {
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

  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  // Active exercise plans for the workout-plan picker.
  const [workoutPlans, setWorkoutPlans] = useState([]);
  // Physical branches only — a member can never be enrolled at a cost bucket
  // such as "Common".
  const [branches, setBranches] = useState([]);
  const [members, setMembers] = useState([]);

  // Selected File objects (not part of `values`, which is JSON-serialisable).
  const [photoFile, setPhotoFile] = useState(null);

  // The preview URL was built inline in the JSX, so React minted a fresh blob
  // on EVERY re-render of this 34-field form and never revoked the old one -
  // visible flicker plus an unbounded leak for as long as the modal stayed
  // open. Derive it once per file instead, and revoke on change/unmount.
  const photoPreview = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : ""),
    [photoFile],
  );
  useEffect(() => {
    if (!photoPreview) return undefined;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);
  const [idProofFile, setIdProofFile] = useState(null);
  // Paths already stored on the member, shown when editing.
  const [existingPhoto, setExistingPhoto] = useState("");
  const [existingIdProof, setExistingIdProof] = useState("");
  const [fileErrors, setFileErrors] = useState({});

  // Portal access: credentials are set through their own endpoints, never as
  // part of the member payload, so a password can't be changed by accident
  // while editing membership details.
  const [portalPassword, setPortalPassword] = useState("");
  const [portalLoginId, setPortalLoginId] = useState("");
  const [portalBusy, setPortalBusy] = useState(false);
  const [hasPortalAccess, setHasPortalAccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [column, setcolumn] = useState("endDate");
  const [sortDirection, setsortDirection] = useState("asc");

  const [statusTab, setStatusTab] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [modal_delete, setmodal_delete] = useState(false);

  // Payment + renewal modals
  const [payModal, setPayModal] = useState(false);
  const [renewModal, setRenewModal] = useState(false);
  const [activeMember, setActiveMember] = useState(null);
  const [payForm, setPayForm] = useState({
    amount: "",
    mode: "Cash",
    receiptNo: "",
    note: "",
  });
  const [renewForm, setRenewForm] = useState({
    planCode: "MONTHLY",
    startDate: "",
    totalFee: "",
    amount: "",
  });

  useEffect(() => {
    listMemberPlans()
      .then((res) => {
        if (res.data.isOk) setPlans(res.data.data || []);
      })
      .catch((err) => console.error("Error loading plans:", err));

    listAllTrainers()
      .then((res) => {
        if (res.data.isOk) setTrainers(res.data.data || []);
      })
      .catch((err) => console.error("Error loading trainers:", err));

    listWorkoutPlans()
      .then((res) => {
        if (res.data.isOk) {
          setWorkoutPlans((res.data.data || []).filter((p) => p.isActive));
        }
      })
      .catch((err) => console.error("Error loading workout plans:", err));

    // physicalOnly: cost buckets like "Common" are not places to enrol members.
    listBranches(true)
      .then((res) => {
        if (!res.data.isOk) return;
        const list = res.data.data || [];
        setBranches(list);
        // Default a new member to the first branch in display order. Only
        // fills a blank — never overwrites a branch the user already picked.
        const first = list[0]?.name;
        if (first) {
          setValues((v) => (v.branch ? v : { ...v, branch: first }));
        }
      })
      // A failed fetch leaves the list empty; the form still keeps whatever
      // branch the record already has rather than blocking the user.
      .catch((err) => console.error("Error loading branches:", err));
  }, []);

  // The trainer picker only appears for plans that need a dedicated coach —
  // driven by the plan master's requiresTrainer flag, not a hardcoded list.
  const planRequiresTrainer = useCallback(
    (code) => Boolean(plans.find((p) => p.code === code)?.requiresTrainer),
    [plans],
  );
  const trainerRequired = planRequiresTrainer(values.planCode);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;

    try {
      const response = await searchMembers({
        skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        branch: branchFilter || undefined,
        status: statusTab || undefined,
      });

      if (response.data?.data?.length > 0) {
        const resData = response.data.data[0];
        setMembers(resData.data || []);
        setTotalRows(resData.count || 0);
      } else {
        setMembers([]);
        setTotalRows(0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load members");
    } finally {
      setLoading(false);
    }
  }, [pageNo, perPage, column, sortDirection, query, branchFilter, statusTab]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  /** Clear file selections so nothing leaks between records. */
  const resetFiles = () => {
    setPhotoFile(null);
    setIdProofFile(null);
    setExistingPhoto("");
    setExistingIdProof("");
    setFileErrors({});
  };

  const tog_list = () => {
    setShowForm(false);
    setUpdateForm(false);
    setValues(initialState);
    setIsSubmit(false);
    setFormErrors({});
    resetFiles();
  };

  const handleOpenAddForm = () => {
    setShowForm(true);
    setUpdateForm(false);
    setValues({ ...initialState, branch: branches[0]?.name || "" });
    setIsSubmit(false);
    setFormErrors({});
    resetFiles();
  };

  /**
   * Validates size and extension before the file ever leaves the browser.
   * The server enforces the same limits (plus magic-byte checks) — this is
   * purely so the user finds out immediately instead of after an upload.
   */
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files?.[0];
    if (!file) {
      if (name === "photo") setPhotoFile(null);
      else setIdProofFile(null);
      setFileErrors((p) => ({ ...p, [name]: "" }));
      return;
    }

    const accept = name === "photo" ? PHOTO_ACCEPT : ID_PROOF_ACCEPT;
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;

    if (!accept.split(",").includes(ext)) {
      setFileErrors((p) => ({
        ...p,
        [name]: `Only ${accept.replaceAll(",", ", ")} files are allowed`,
      }));
      e.target.value = "";
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setFileErrors((p) => ({
        ...p,
        [name]: `File is ${humanSize(file.size)} — the limit is 2 MB`,
      }));
      e.target.value = "";
      return;
    }

    setFileErrors((p) => ({ ...p, [name]: "" }));
    if (name === "photo") setPhotoFile(file);
    else setIdProofFile(file);
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
      gender: row.gender || "",
      dateOfBirth: toInputDate(row.dateOfBirth),
      emergencyContactName: row.emergencyContactName || "",
      emergencyContactNumber: row.emergencyContactNumber || "",
      address: row.address || "",
      branch: row.branch || branches[0]?.name || "",
      trainerId: row.trainerId?._id || row.trainerId || "",
      workoutPlanId: row.workoutPlanId?._id || row.workoutPlanId || "",
      planCode: row.planCode || "MONTHLY",
      startDate: toInputDate(row.startDate),
      endDate: toInputDate(row.endDate),
      totalFee: row.totalFee ?? "",
      heightCm: row.heightCm ?? "",
      notes: row.notes || "",
      isActive: row.isActive !== undefined ? row.isActive : true,
      initialPayment: { amount: "", mode: "Cash", receiptNo: "", note: "" },
    });
    setPhotoFile(null);
    setIdProofFile(null);
    setExistingPhoto(row.photo || "");
    setExistingIdProof(row.idProof || "");
    setFileErrors({});
    setPortalPassword("");
    setPortalLoginId(row.loginId || "");
    setHasPortalAccess(Boolean(row.hasPortalAccess));
  };

  /** Grant or reset portal access for the member currently being edited. */
  const handleSetPortalPassword = async () => {
    if (!portalPassword || portalPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPortalBusy(true);
    try {
      const res = await setMemberPassword(
        selectedId,
        portalPassword,
        portalLoginId.trim(),
      );
      if (res.data.isOk) {
        toast.success(res.data.message);
        setPortalPassword("");
        setHasPortalAccess(true);
        fetchMembers();
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
    if (!window.confirm("Remove portal access for this member?")) return;
    setPortalBusy(true);
    try {
      const res = await revokeMemberPortalAccess(selectedId);
      if (res.data.isOk) {
        toast.success(res.data.message);
        setHasPortalAccess(false);
        fetchMembers();
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
    const { name, value } = e.target;

    // Choosing a plan pre-fills the fee so staff don't have to remember prices.
    if (name === "planCode") {
      const plan = plans.find((p) => p.code === value);
      setValues((v) => ({
        ...v,
        planCode: value,
        totalFee: plan ? plan.defaultFee : v.totalFee,
      }));
      return;
    }

    setValues((v) => ({ ...v, [name]: value }));
  };

  const handleCheck = (e) => {
    setValues({ ...values, [e.target.name]: e.target.checked });
  };

  const handlePaymentField = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({
      ...v,
      initialPayment: { ...v.initialPayment, [name]: value },
    }));
  };

  const validate = (val) => {
    const errors = {};
    if (!val.fullName.trim()) errors.fullName = "Member name is required!";
    if (!val.mobileNumber.trim()) {
      errors.mobileNumber = "Contact number is required!";
    } else if (!/^[+\d][\d\s-]{7,15}$/.test(val.mobileNumber.trim())) {
      errors.mobileNumber = "Enter a valid contact number";
    }
    if (!val.startDate) errors.startDate = "Start date is required!";
    if (
      val.endDate &&
      val.startDate &&
      new Date(val.endDate) < new Date(val.startDate)
    ) {
      errors.endDate = "End date cannot be before the start date";
    }
    if (val.totalFee !== "" && Number(val.totalFee) < 0) {
      errors.totalFee = "Fee cannot be negative";
    }
    if (planRequiresTrainer(val.planCode) && !val.trainerId) {
      const planLabel =
        plans.find((p) => p.code === val.planCode)?.label || "this";
      errors.trainerId = `Select a trainer for a ${planLabel} plan`;
    }
    return errors;
  };

  const buildPayload = () => {
    const payload = { ...values };
    // Send an explicit null so switching away from PT clears the trainer.
    payload.trainerId = payload.trainerId || null;
    // null resets the member to the gym default exercise plan.
    payload.workoutPlanId = payload.workoutPlanId || null;
    if (!payload.endDate) delete payload.endDate;
    if (payload.totalFee === "") delete payload.totalFee;
    if (!payload.initialPayment?.amount) delete payload.initialPayment;

    // The endpoints accept multipart/form-data so files can ride along.
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined) return;
      if (key === "initialPayment") {
        // Nested object — flatten so the server's body parser sees the fields.
        Object.entries(value).forEach(([k, v]) => {
          if (v !== "" && v !== undefined && v !== null) {
            form.append(`initialPayment[${k}]`, v);
          }
        });
        return;
      }
      form.append(key, value === null ? "" : value);
    });

    if (photoFile) form.append("photo", photoFile);
    if (idProofFile) form.append("idProof", idProofFile);

    return form;
  };

  const handleClick = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    createMember(buildPayload())
      .then((res) => {
        if (res.data.isOk) {
          toast.success("Member added successfully!");
          setShowForm(false);
          setValues(initialState);
          fetchMembers();
        } else {
          toast.error(res.data.message || "Failed to add member");
        }
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || "Failed to add member");
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
    updateMember(selectedId, buildPayload())
      .then((res) => {
        if (res.data.isOk) {
          toast.success("Member updated successfully!");
          setUpdateForm(false);
          fetchMembers();
        } else {
          toast.error(res.data.message || "Failed to update member");
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to update member");
      })
      .finally(() => setIsSaving(false));
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteMember(removeId);
      if (res.data.isOk) {
        toast.success("Member deleted successfully");
        fetchMembers();
        setmodal_delete(false);
      } else {
        toast.error(res.data.message || "Failed to delete member");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while deleting");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const openPayModal = (row) => {
    setActiveMember(row);
    setPayForm({
      amount: row.balanceAmount > 0 ? row.balanceAmount : "",
      mode: "Cash",
      receiptNo: "",
      note: "",
    });
    setPayModal(true);
  };

  const openRenewModal = (row) => {
    setActiveMember(row);
    const plan = plans.find((p) => p.code === row.planCode);
    setRenewForm({
      planCode: row.planCode,
      startDate: "",
      totalFee: plan ? plan.defaultFee : row.totalFee,
      amount: "",
    });
    setRenewModal(true);
  };

  const submitPayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) {
      toast.error("Enter a payment amount");
      return;
    }
    setIsSaving(true);
    try {
      const res = await addMemberPayment(activeMember._id, payForm);
      if (res.data.isOk) {
        toast.success("Payment recorded");
        setPayModal(false);
        fetchMembers();
      } else {
        toast.error(res.data.message || "Failed to record payment");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setIsSaving(false);
    }
  };

  const submitRenewal = async () => {
    setIsSaving(true);
    try {
      const body = {
        planCode: renewForm.planCode,
        totalFee:
          renewForm.totalFee === "" ? undefined : Number(renewForm.totalFee),
      };
      if (renewForm.startDate) body.startDate = renewForm.startDate;
      if (renewForm.amount) {
        body.payment = { amount: Number(renewForm.amount), mode: "Cash" };
      }
      const res = await renewMembership(activeMember._id, body);
      if (res.data.isOk) {
        toast.success("Membership renewed");
        setRenewModal(false);
        fetchMembers();
      } else {
        toast.error(res.data.message || "Failed to renew");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to renew");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (col, direction) => {
    setcolumn(col.sortField || "endDate");
    setsortDirection(direction);
  };

  const col = useMemo(
    () => [
      {
        name: "Member",
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
        name: "Plan / Branch",
        cell: (row) => (
          <div>
            <div>
              {plans.find((p) => p.code === row.planCode)?.label || row.planCode}
            </div>
            <div className="text-muted small">{row.branch}</div>
          </div>
        ),
        minWidth: "160px",
      },
      {
        name: "Period",
        cell: (row) => (
          <div className="small">
            <div>{formatDate(row.startDate)}</div>
            <div className="text-muted">to {formatDate(row.endDate)}</div>
          </div>
        ),
        sortable: true,
        sortField: "endDate",
        minWidth: "150px",
      },
      {
        name: "Trainer",
        cell: (row) =>
          row.trainerId ? (
            <div className="small">
              <div className="fw-semibold">
                {row.trainerId.fullName || "Assigned"}
              </div>
              {row.trainerId.mobileNumber && (
                <div className="text-muted">{row.trainerId.mobileNumber}</div>
              )}
            </div>
          ) : (
            <span className="text-muted small">—</span>
          ),
        minWidth: "150px",
      },
      {
        name: "Status",
        cell: (row) => {
          const s = membershipStatus(row);
          return <Badge color={s.color}>{s.label}</Badge>;
        },
        minWidth: "130px",
      },
      {
        name: "Fees",
        cell: (row) => (
          <div className="small">
            <div>{currency(row.totalFee)}</div>
            {row.balanceAmount > 0 ? (
              <div className="text-danger fw-semibold">
                Due {currency(row.balanceAmount)}
              </div>
            ) : (
              <div className="text-success">Paid</div>
            )}
          </div>
        ),
        minWidth: "130px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div className="d-flex align-items-center gap-1 flex-wrap py-1">
            {permissions.edit && row.balanceAmount > 0 && (
              <button
                className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                onClick={() => openPayModal(row)}
                title="Record a payment"
              >
                <i className="ri-money-rupee-circle-line"></i> Pay
              </button>
            )}
            {/* Renew is only offered once the term has actually ended —
                showing it on every active member made the row noisy and
                invited accidental early renewals. */}
            {permissions.edit && daysUntil(row.endDate) < 0 && (
              <button
                className="btn btn-sm btn-warning rounded-circle d-flex align-items-center justify-content-center p-0"
                style={{ width: 28, height: 28 }}
                onClick={() => openRenewModal(row)}
                title={`Renew membership — expired ${Math.abs(daysUntil(row.endDate))} day(s) ago`}
              >
                <i className="ri-refresh-line"></i>
              </button>
            )}
            {permissions.edit && (
              <button
                className="btn btn-sm btn-success d-flex align-items-center gap-1"
                onClick={() => handleTog_edit(row)}
                title="Edit member"
              >
                <i className="ri-pencil-line"></i>
              </button>
            )}
            {permissions.delete && (
              <button
                className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                onClick={() => tog_delete(row._id)}
                title="Delete member"
              >
                <i className="ri-delete-bin-line"></i>
              </button>
            )}
          </div>
        ),
        minWidth: "230px",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, pageNo, perPage, plans],
  );

  const renderForm = () => (
    <CardBody>
      <Form onSubmit={updateForm ? handleUpdate : handleClick}>
        <h6
          className="text-uppercase text-muted fw-bold mb-3"
          style={{ letterSpacing: "0.5px" }}
        >
          Member Details
        </h6>
        <Row>
          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-fullName" className="form-label fw-bold">
                Full Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="member-fullName"
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
              <Label htmlFor="member-mobileNumber" className="form-label fw-bold">
                Contact Number <span className="text-danger">*</span>
              </Label>
              <Input
                id="member-mobileNumber"
                name="mobileNumber"
                placeholder="e.g. 96872 94124"
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
              <Label htmlFor="member-email" className="form-label fw-bold">Email</Label>
              <Input
                id="member-email"
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
              <Label htmlFor="member-gender" className="form-label fw-bold">Gender</Label>
              <Input
                id="member-gender"
                type="select"
                name="gender"
                value={values.gender}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Input>
            </FormGroup>
          </Col>
          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-dateOfBirth" className="form-label fw-bold">Date of Birth</Label>
              <Input
                id="member-dateOfBirth"
                type="date"
                name="dateOfBirth"
                value={values.dateOfBirth}
                onChange={handleChange}
              />
            </FormGroup>
          </Col>
          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-branch" className="form-label fw-bold">Branch</Label>
              <Input
                id="member-branch"
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

          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-emergencyContactName" className="form-label fw-bold">
                Emergency Contact Name
              </Label>
              <Input
                id="member-emergencyContactName"
                name="emergencyContactName"
                value={values.emergencyContactName}
                onChange={handleChange}
              />
            </FormGroup>
          </Col>
          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-emergencyContactNumber" className="form-label fw-bold">
                Emergency Contact Number
              </Label>
              <Input
                id="member-emergencyContactNumber"
                name="emergencyContactNumber"
                value={values.emergencyContactNumber}
                onChange={handleChange}
              />
            </FormGroup>
          </Col>
          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-address" className="form-label fw-bold">Address</Label>
              <Input
                id="member-address"
                name="address"
                value={values.address}
                onChange={handleChange}
              />
            </FormGroup>
          </Col>
          <Col md={4}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-heightCm" className="form-label fw-bold">Height (cm)</Label>
              <Input
                id="member-heightCm"
                type="number"
                name="heightCm"
                min={50}
                max={260}
                step={0.5}
                placeholder="e.g. 172"
                value={values.heightCm}
                onChange={handleChange}
              />
              {/* Optional, but without it the member portal cannot show BMI
                  alongside their weight log. */}
              <small className="text-muted">
                Enables BMI in the member portal
              </small>
            </FormGroup>
          </Col>
        </Row>

        <hr className="my-4" />
        <h6
          className="text-uppercase text-muted fw-bold mb-3"
          style={{ letterSpacing: "0.5px" }}
        >
          Membership &amp; Fees
        </h6>
        <Row>
          <Col md={3}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-planCode" className="form-label fw-bold">Plan</Label>
              <Input
                id="member-planCode"
                type="select"
                name="planCode"
                value={values.planCode}
                onChange={handleChange}
              >
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label} ({p.months} mo)
                  </option>
                ))}
              </Input>
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-startDate" className="form-label fw-bold">
                Start Date <span className="text-danger">*</span>
              </Label>
              <Input
                id="member-startDate"
                type="date"
                name="startDate"
                value={values.startDate}
                onChange={handleChange}
              />
              {isSubmit && formErrors.startDate && (
                <p className="text-danger small mt-1">{formErrors.startDate}</p>
              )}
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-endDate" className="form-label fw-bold">End Date</Label>
              <Input
                id="member-endDate"
                type="date"
                name="endDate"
                value={values.endDate}
                onChange={handleChange}
              />
              <small className="text-muted">
                Leave blank to auto-calculate from the plan
              </small>
              {isSubmit && formErrors.endDate && (
                <p className="text-danger small mt-1">{formErrors.endDate}</p>
              )}
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-totalFee" className="form-label fw-bold">Total Fee (₹)</Label>
              <Input
                id="member-totalFee"
                type="number"
                name="totalFee"
                value={values.totalFee}
                onChange={handleChange}
              />
              {isSubmit && formErrors.totalFee && (
                <p className="text-danger small mt-1">{formErrors.totalFee}</p>
              )}
            </FormGroup>
          </Col>
        </Row>

        {/* Trainer picker — appears only for plans that need a dedicated coach. */}
        {trainerRequired && (
          <Row className="bg-light rounded p-2 mx-0 mb-3">
            <Col md={12}>
              <Label htmlFor="member-trainerId" className="form-label fw-bold mb-2">
                <i className="ri-user-star-line align-bottom me-1"></i>
                Assigned Trainer <span className="text-danger">*</span>
              </Label>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-2">
                <Input
                  id="member-trainerId"
                  type="select"
                  name="trainerId"
                  value={values.trainerId}
                  onChange={handleChange}
                >
                  <option value="">Select a trainer</option>
                  {trainers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.fullName} — {t.branch} ({t.mobileNumber})
                    </option>
                  ))}
                </Input>
                {isSubmit && formErrors.trainerId && (
                  <p className="text-danger small mt-1">
                    {formErrors.trainerId}
                  </p>
                )}
              </FormGroup>
            </Col>
            <Col md={6} className="d-flex align-items-center">
              <small className="text-muted">
                {trainers.length === 0
                  ? "No trainers yet — add one under Gym → Trainers first."
                  : "This member will appear on the trainer's roster."}
              </small>
            </Col>
          </Row>
        )}

        {/* Exercise plan — blank means the member follows the gym default. */}
        <Row className="mb-3">
          <Col md={6}>
            <FormGroup className="mb-0">
              <Label htmlFor="member-workoutPlanId" className="form-label fw-bold">
                <i className="ri-run-line align-bottom me-1"></i>
                Exercise Plan
              </Label>
              <Input
                id="member-workoutPlanId"
                type="select"
                name="workoutPlanId"
                value={values.workoutPlanId}
                onChange={handleChange}
              >
                <option value="">Gym default plan</option>
                {workoutPlans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                    {p.isDefault ? " (current default)" : ""}
                  </option>
                ))}
              </Input>
              <small className="text-muted">
                Leave on the default unless this member needs a different
                routine.
              </small>
            </FormGroup>
          </Col>
        </Row>

        {!updateForm && (
          <Row className="bg-light rounded p-2 mx-0 mb-3">
            <Col md={12}>
              <Label className="form-label fw-bold mb-2">
                Joining Payment (optional)
              </Label>
            </Col>
            <Col md={3}>
              <FormGroup className="mb-2">
                <Label htmlFor="join-amount" className="form-label small">Amount Received (₹)</Label>
                <Input
                  id="join-amount"
                  type="number"
                  name="amount"
                  value={values.initialPayment.amount}
                  onChange={handlePaymentField}
                />
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup className="mb-2">
                <Label htmlFor="join-mode" className="form-label small">Mode</Label>
                <Input
                  id="join-mode"
                  type="select"
                  name="mode"
                  value={values.initialPayment.mode}
                  onChange={handlePaymentField}
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Other</option>
                </Input>
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup className="mb-2">
                <Label htmlFor="join-receiptNo" className="form-label small">Receipt No.</Label>
                <Input
                  id="join-receiptNo"
                  name="receiptNo"
                  value={values.initialPayment.receiptNo}
                  onChange={handlePaymentField}
                />
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup className="mb-2">
                <Label htmlFor="join-note" className="form-label small">Note</Label>
                <Input
                  id="join-note"
                  name="note"
                  value={values.initialPayment.note}
                  onChange={handlePaymentField}
                />
              </FormGroup>
            </Col>
          </Row>
        )}

        <hr className="my-4" />
        <h6
          className="text-uppercase text-muted fw-bold mb-3"
          style={{ letterSpacing: "0.5px" }}
        >
          Photo &amp; ID Proof
        </h6>
        <Row>
          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-photo" className="form-label fw-bold">Member Photo</Label>
              <Input
                id="member-photo"
                type="file"
                name="photo"
                accept={PHOTO_ACCEPT}
                onChange={handleFileChange}
              />
              <small className="text-muted d-block mt-1">
                JPG, PNG or WebP · max 2 MB · converted to WebP automatically
              </small>
              {fileErrors.photo && (
                <p className="text-danger small mt-1 mb-0">{fileErrors.photo}</p>
              )}
              {photoFile && (
                <div className="d-flex align-items-center gap-2 mt-2">
                  <img
                    src={photoPreview}
                    alt="Selected preview"
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: 6,
                    }}
                  />
                  <span className="small text-muted">
                    {photoFile.name} ({humanSize(photoFile.size)})
                  </span>
                </div>
              )}
              {!photoFile && existingPhoto && (
                <div className="d-flex align-items-center gap-2 mt-2">
                  <img
                    src={fileUrl(existingPhoto)}
                    alt="Current member"
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: 6,
                    }}
                  />
                  <span className="small text-muted">
                    Current photo — choose a file to replace it
                  </span>
                </div>
              )}
            </FormGroup>
          </Col>

          <Col md={6}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-idProof" className="form-label fw-bold">ID Proof</Label>
              <Input
                id="member-idProof"
                type="file"
                name="idProof"
                accept={ID_PROOF_ACCEPT}
                onChange={handleFileChange}
              />
              <small className="text-muted d-block mt-1">
                Image or PDF · max 2 MB · PDFs are stored as-is
              </small>
              {fileErrors.idProof && (
                <p className="text-danger small mt-1 mb-0">
                  {fileErrors.idProof}
                </p>
              )}
              {idProofFile && (
                <div className="mt-2 small text-muted">
                  <i className="ri-attachment-2 align-bottom me-1"></i>
                  {idProofFile.name} ({humanSize(idProofFile.size)})
                </div>
              )}
              {!idProofFile && existingIdProof && (
                <div className="mt-2 small">
                  <a
                    href={fileUrl(existingIdProof)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="ri-external-link-line align-bottom me-1"></i>
                    View current ID proof
                  </a>
                  <span className="text-muted"> — choose a file to replace</span>
                </div>
              )}
            </FormGroup>
          </Col>
        </Row>

        {/* Portal access — edit mode only: a member must exist before
            credentials can be attached to them. */}
        {updateForm && (
          <>
            <hr className="my-4" />
            <h6
              className="text-uppercase text-muted fw-bold mb-3"
              style={{ letterSpacing: "0.5px" }}
            >
              Member Portal Access
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
                    <Badge color="light" className="ms-2">
                      No access yet
                    </Badge>
                  )}
                </span>
              </Col>
              <Col md={4}>
                <FormGroup className="mb-2">
                  <Label htmlFor="portal-loginId" className="form-label small">Login ID</Label>
                  <Input
                    id="portal-loginId"
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
                  <Label htmlFor="portal-password" className="form-label small">
                    {hasPortalAccess ? "Reset password" : "Set password"}
                  </Label>
                  <Input
                    id="portal-password"
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
                  The member is asked to change this password on first login.
                  Portal access requires an active membership with no pending
                  dues.
                </small>
              </Col>
            </Row>
          </>
        )}

        <Row>
          <Col md={9}>
            <FormGroup className="mb-3">
              <Label htmlFor="member-notes" className="form-label fw-bold">Notes</Label>
              <Input
                id="member-notes"
                type="textarea"
                rows="2"
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
                id="isActiveMember"
                name="isActive"
                checked={values.isActive}
                onChange={handleCheck}
              />
              <Label
                className="form-check-label ms-1 fw-semibold"
                htmlFor="isActiveMember"
              >
                Is Active
              </Label>
            </FormGroup>
          </Col>
        </Row>

        <div className="mt-3 d-flex justify-content-end gap-2">
          <Button type="button" color="light" onClick={tog_list}>
            Cancel
          </Button>
          <Button type="submit" color="success" disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : updateForm
                ? "Update Member"
                : "Save Member"}
          </Button>
        </div>
      </Form>
    </CardBody>
  );

  document.title = `Members | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Gym" title="Members" pageTitle="Members" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm
                      ? "Add Member"
                      : updateForm
                        ? "Edit Member"
                        : "Members"}
                  </h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {!showForm && !updateForm ? (
                      <>
                        <div style={{ minWidth: "140px" }}>
                          <Input
                            type="select"
                            className="form-select form-select-sm"
                            aria-label="Filter members by branch"
                            value={branchFilter}
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
                            Member
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
                    <Nav tabs className="nav-tabs-custom mb-3">
                      {STATUS_TABS.map((t) => (
                        <NavItem key={t.key || "all"}>
                          <NavLink
                            href="#"
                            className={
                              statusTab === t.key ? "active fw-semibold" : ""
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              setStatusTab(t.key);
                              setPageNo(1);
                            }}
                          >
                            {t.label}
                          </NavLink>
                        </NavItem>
                      ))}
                    </Nav>

                    <div className="table-responsive table-card mt-1 mb-1">
                      <DataTable
                        columns={col}
                        data={members}
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
                            No members found. Click <strong>Add Member</strong>{" "}
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

      {/* Record payment */}
      <Modal isOpen={payModal} toggle={() => setPayModal(false)} centered>
        <ModalHeader toggle={() => setPayModal(false)}>
          Record Payment — {activeMember?.fullName}
        </ModalHeader>
        <ModalBody>
          <p className="text-muted small mb-3">
            Total {currency(activeMember?.totalFee)} · Paid{" "}
            {currency(activeMember?.paidAmount)} ·{" "}
            <span className="text-danger fw-semibold">
              Due {currency(activeMember?.balanceAmount)}
            </span>
          </p>
          <FormGroup>
            <Label htmlFor="pay-amount" className="fw-bold">Amount (₹)</Label>
            <Input
              id="pay-amount"
              type="number"
              value={payForm.amount}
              onChange={(e) =>
                setPayForm({ ...payForm, amount: e.target.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="pay-mode" className="fw-bold">Mode</Label>
            <Input
              id="pay-mode"
              type="select"
              value={payForm.mode}
              onChange={(e) => setPayForm({ ...payForm, mode: e.target.value })}
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Bank Transfer</option>
              <option>Other</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="pay-receiptNo" className="fw-bold">Receipt No.</Label>
            <Input
              id="pay-receiptNo"
              value={payForm.receiptNo}
              onChange={(e) =>
                setPayForm({ ...payForm, receiptNo: e.target.value })
              }
            />
          </FormGroup>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button color="light" onClick={() => setPayModal(false)}>
              Cancel
            </Button>
            <Button color="primary" onClick={submitPayment} disabled={isSaving}>
              {isSaving ? "Saving..." : "Record Payment"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* Renew membership */}
      <Modal isOpen={renewModal} toggle={() => setRenewModal(false)} centered>
        <ModalHeader toggle={() => setRenewModal(false)}>
          Renew Membership — {activeMember?.fullName}
        </ModalHeader>
        <ModalBody>
          <p className="text-muted small mb-3">
            Current period ends {formatDate(activeMember?.endDate)}. Renewal
            starts the next day unless you pick a date.
          </p>
          <FormGroup>
            <Label htmlFor="renew-planCode" className="fw-bold">Plan</Label>
            <Input
              id="renew-planCode"
              type="select"
              value={renewForm.planCode}
              onChange={(e) => {
                const plan = plans.find((p) => p.code === e.target.value);
                setRenewForm({
                  ...renewForm,
                  planCode: e.target.value,
                  totalFee: plan ? plan.defaultFee : renewForm.totalFee,
                });
              }}
            >
              {plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label} ({p.months} mo)
                </option>
              ))}
            </Input>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="renew-startDate" className="fw-bold">Start Date (optional)</Label>
            <Input
              id="renew-startDate"
              type="date"
              value={renewForm.startDate}
              onChange={(e) =>
                setRenewForm({ ...renewForm, startDate: e.target.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="renew-totalFee" className="fw-bold">New Fee (₹)</Label>
            <Input
              id="renew-totalFee"
              type="number"
              value={renewForm.totalFee}
              onChange={(e) =>
                setRenewForm({ ...renewForm, totalFee: e.target.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="renew-amount" className="fw-bold">Amount Received Now (₹)</Label>
            <Input
              id="renew-amount"
              type="number"
              value={renewForm.amount}
              onChange={(e) =>
                setRenewForm({ ...renewForm, amount: e.target.value })
              }
            />
          </FormGroup>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button color="light" onClick={() => setRenewModal(false)}>
              Cancel
            </Button>
            <Button color="warning" onClick={submitRenewal} disabled={isSaving}>
              {isSaving ? "Saving..." : "Renew Membership"}
            </Button>
          </div>
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

export default Members;
