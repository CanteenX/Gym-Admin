import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Form,
  FormGroup,
  Input,
  Label,
  Row,
} from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  listWorkoutPlans,
  getWorkoutPlanById,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
} from "../../api/workoutPlans.api";

/** A plan always covers Day 1..Day 6 — the gym trains six days a week. */
const DAY_COUNT = 6;

const emptyExercise = () => ({
  name: "",
  targetSets: 3,
  targetReps: "10",
  notes: "",
});

/** A fresh plan starts with six labelled days, each holding one blank row. */
const buildEmptyDays = () =>
  Array.from({ length: DAY_COUNT }, (_, i) => ({
    dayNumber: i + 1,
    label: "",
    exercises: [emptyExercise()],
  }));

const initialState = {
  name: "",
  isDefault: false,
  isActive: true,
  days: buildEmptyDays(),
};

/**
 * Normalise whatever the server returns into exactly six days so the editor
 * never renders a partial week, even if a plan was saved with fewer days.
 */
const normaliseDays = (days) => {
  const source = Array.isArray(days) ? days : [];
  return Array.from({ length: DAY_COUNT }, (_, i) => {
    const dayNumber = i + 1;
    const match = source.find((d) => Number(d?.dayNumber) === dayNumber) || {};
    const exercises = Array.isArray(match.exercises) ? match.exercises : [];
    return {
      dayNumber,
      label: match.label || "",
      exercises:
        exercises.length > 0
          ? exercises.map((ex) => ({
              name: ex?.name || "",
              targetSets: ex?.targetSets ?? 3,
              targetReps: ex?.targetReps ?? "",
              notes: ex?.notes || "",
            }))
          : [emptyExercise()],
    };
  });
};

const MemberExercisePlan = () => {
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
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [updateForm, setUpdateForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [modal_delete, setmodal_delete] = useState(false);

  /**
   * An accordion rather than tabs: a six-day plan is a vertical checklist an
   * admin reviews top to bottom, and the accordion lets one day stay open
   * while the rest collapse — so the form never becomes a wall of 30 inputs.
   * BlogMaster.jsx already uses the same reactstrap Accordion for its SEO
   * block, so this matches the template's existing component vocabulary.
   */
  const [accordionOpen, setAccordionOpen] = useState("day-1");
  const toggleAccordion = (id) =>
    setAccordionOpen(accordionOpen === id ? "" : id);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listWorkoutPlans();
      if (res.data?.isOk) {
        setPlans(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setPlans([]);
        toast.error(res.data?.message || "Could not load exercise plans");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Could not load exercise plans",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  /** Client-side filter — the list endpoint returns every plan at once. */
  const visiblePlans = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) => String(p.name || "").toLowerCase().includes(q));
  }, [plans, query]);

  const tog_list = () => {
    setShowForm(false);
    setUpdateForm(false);
    setValues(initialState);
    setSelectedId("");
    setIsSubmit(false);
    setFormErrors({});
    setAccordionOpen("day-1");
  };

  const handleOpenAddForm = () => {
    setShowForm(true);
    setUpdateForm(false);
    setValues({ ...initialState, days: buildEmptyDays() });
    setSelectedId("");
    setIsSubmit(false);
    setFormErrors({});
    setAccordionOpen("day-1");
  };

  /** Re-fetch the single plan so the editor always works on full day detail. */
  const handleTog_edit = async (row) => {
    setUpdateForm(true);
    setShowForm(false);
    setIsSubmit(false);
    setFormErrors({});
    setSelectedId(row._id);
    setAccordionOpen("day-1");
    setValues({
      name: row.name || "",
      isDefault: Boolean(row.isDefault),
      isActive: row.isActive !== undefined ? row.isActive : true,
      days: normaliseDays(row.days),
    });

    setIsLoadingPlan(true);
    try {
      const res = await getWorkoutPlanById(row._id);
      if (res.data?.isOk && res.data.data) {
        const plan = res.data.data;
        setValues({
          name: plan.name || "",
          isDefault: Boolean(plan.isDefault),
          isActive: plan.isActive !== undefined ? plan.isActive : true,
          days: normaliseDays(plan.days),
        });
      } else {
        toast.error(res.data?.message || "Could not load the plan");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Could not load the plan");
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const handleChange = (e) =>
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const handleCheck = (e) =>
    setValues((v) => ({ ...v, [e.target.name]: e.target.checked }));

  const handleDayLabel = (dayIndex, label) =>
    setValues((v) => {
      const days = v.days.map((d, i) => (i === dayIndex ? { ...d, label } : d));
      return { ...v, days };
    });

  const handleExerciseField = (dayIndex, exIndex, field, value) =>
    setValues((v) => {
      const days = v.days.map((d, i) => {
        if (i !== dayIndex) return d;
        const exercises = d.exercises.map((ex, j) =>
          j === exIndex ? { ...ex, [field]: value } : ex,
        );
        return { ...d, exercises };
      });
      return { ...v, days };
    });

  const addExercise = (dayIndex) =>
    setValues((v) => {
      const days = v.days.map((d, i) =>
        i === dayIndex ? { ...d, exercises: [...d.exercises, emptyExercise()] } : d,
      );
      return { ...v, days };
    });

  /** Always leave one row behind so a day never collapses to nothing. */
  const removeExercise = (dayIndex, exIndex) =>
    setValues((v) => {
      const days = v.days.map((d, i) => {
        if (i !== dayIndex) return d;
        if (d.exercises.length <= 1) return { ...d, exercises: [emptyExercise()] };
        return { ...d, exercises: d.exercises.filter((_, j) => j !== exIndex) };
      });
      return { ...v, days };
    });

  /**
   * Errors are keyed either "name" or "day-<i>-ex-<j>" so each bad exercise
   * row can show its message inline next to the offending input.
   */
  const validate = (val) => {
    const errors = {};
    if (!String(val.name).trim()) errors.name = "Plan name is required!";

    val.days.forEach((day, dayIndex) => {
      day.exercises.forEach((ex, exIndex) => {
        if (!String(ex.name).trim()) {
          errors[`day-${dayIndex}-ex-${exIndex}`] = "Exercise name is required!";
        }
      });
    });
    return errors;
  };

  /** First day that failed validation, so we can open it for the admin. */
  const firstInvalidDay = (errors) => {
    const key = Object.keys(errors).find((k) => k.startsWith("day-"));
    if (!key) return null;
    return `day-${Number(key.split("-")[1]) + 1}`;
  };

  const buildPayload = () => ({
    name: String(values.name).trim(),
    isDefault: values.isDefault,
    isActive: values.isActive,
    days: values.days.map((d) => ({
      dayNumber: d.dayNumber,
      label: String(d.label || "").trim(),
      exercises: d.exercises.map((ex) => ({
        name: String(ex.name).trim(),
        targetSets: Number(ex.targetSets) || 0,
        targetReps: String(ex.targetReps || "").trim(),
        notes: String(ex.notes || "").trim(),
      })),
    })),
  });

  const submit = (e, isUpdate) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) {
      const day = firstInvalidDay(errors);
      if (day) setAccordionOpen(day);
      return;
    }

    setIsSaving(true);
    const call = isUpdate
      ? updateWorkoutPlan(selectedId, buildPayload())
      : createWorkoutPlan(buildPayload());

    call
      .then((res) => {
        if (res.data.isOk) {
          toast.success(
            res.data.message ||
              (isUpdate
                ? "Exercise Plan Updated Successfully!"
                : "Exercise Plan Added Successfully!"),
          );
          tog_list();
          fetchPlans();
        } else {
          toast.error(res.data.message || "Save failed");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(err.response?.data?.message || "Save failed");
      })
      .finally(() => setIsSaving(false));
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    try {
      const res = await deleteWorkoutPlan(removeId);
      if (res.data.isOk) {
        toast.success(res.data.message || "Exercise Plan Deleted Successfully");
        fetchPlans();
        setmodal_delete(false);
      } else {
        toast.error(res.data.message || "Delete failed");
        setmodal_delete(false);
      }
    } catch (error) {
      // The server returns 400 when the plan is the gym default or still has
      // members assigned, and explains which — surface that message verbatim.
      console.error(error);
      toast.error(error.response?.data?.message || "Delete failed");
      setmodal_delete(false);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const col = useMemo(
    () => [
      {
        name: "Sr No",
        selector: (row, index) => index + 1,
        width: "80px",
      },
      {
        name: "Plan Name",
        cell: (row) => (
          <div className="py-2">
            <div className="fw-semibold">{row.name}</div>
            {row.isDefault && (
              <div className="text-muted small">
                Followed by every member without a specific plan
              </div>
            )}
          </div>
        ),
        minWidth: "260px",
      },
      {
        name: "Default",
        cell: (row) =>
          row.isDefault ? (
            <Badge color="primary" pill>
              Gym Default
            </Badge>
          ) : (
            <span className="text-muted small">—</span>
          ),
        width: "140px",
      },
      {
        name: "Days",
        cell: (row) => (
          <span className="fw-semibold">{(row.days || []).length}</span>
        ),
        width: "100px",
      },
      {
        name: "Exercises",
        cell: (row) => (
          <span className="text-muted">
            {(row.days || []).reduce(
              (sum, d) => sum + (d.exercises?.length || 0),
              0,
            )}
          </span>
        ),
        width: "120px",
      },
      {
        name: "Status",
        cell: (row) => (
          <span className={`badge ${row.isActive ? "bg-success" : "bg-danger"}`}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        ),
        width: "120px",
      },
      {
        name: "Action",
        cell: (row) => (
          <div
            className="d-flex align-items-center gap-1"
            style={{ height: "28px" }}
          >
            {permissions.edit && (
              <button
                className="btn btn-sm btn-success edit-item-btn d-flex align-items-center gap-1"
                style={{ height: "28px" }}
                onClick={() => handleTog_edit(row)}
              >
                <i className="ri-pencil-line"></i> Edit
              </button>
            )}
            {permissions.delete && (
              <button
                className="btn btn-sm btn-danger remove-item-btn d-flex align-items-center gap-1"
                style={{ height: "28px" }}
                onClick={() => {
                  setRemoveId(row._id);
                  setmodal_delete(true);
                }}
              >
                <i className="ri-delete-bin-line"></i> Delete
              </button>
            )}
          </div>
        ),
        minWidth: "180px",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions],
  );

  const renderDay = (day, dayIndex) => {
    const accordionId = `day-${day.dayNumber}`;
    const filled = day.exercises.filter((ex) => String(ex.name).trim()).length;

    return (
      <AccordionItem key={accordionId}>
        <AccordionHeader targetId={accordionId}>
          <span className="fw-semibold me-2">Day {day.dayNumber}</span>
          {day.label && <span className="text-muted me-2">— {day.label}</span>}
          <Badge color="light" className="text-body" pill>
            {filled} exercise{filled === 1 ? "" : "s"}
          </Badge>
        </AccordionHeader>
        <AccordionBody accordionId={accordionId}>
          <Row className="mb-3">
            <Col md={6}>
              <FormGroup className="mb-0">
                <Label className="form-label fw-bold">Day Focus</Label>
                <Input
                  placeholder="e.g. Chest & Triceps"
                  value={day.label}
                  onChange={(e) => handleDayLabel(dayIndex, e.target.value)}
                />
              </FormGroup>
            </Col>
          </Row>

          <div className="table-responsive">
            <table className="table table-sm align-middle mb-2">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "32%" }}>
                    Exercise <span className="text-danger">*</span>
                  </th>
                  <th style={{ width: "12%" }}>Sets</th>
                  <th style={{ width: "16%" }}>Reps</th>
                  <th style={{ width: "32%" }}>Note</th>
                  <th style={{ width: "8%" }}></th>
                </tr>
              </thead>
              <tbody>
                {day.exercises.map((ex, exIndex) => {
                  const errorKey = `day-${dayIndex}-ex-${exIndex}`;
                  return (
                    <tr key={`${accordionId}-ex-${exIndex}`}>
                      <td>
                        <Input
                          bsSize="sm"
                          placeholder="e.g. Bench Press"
                          value={ex.name}
                          onChange={(e) =>
                            handleExerciseField(
                              dayIndex,
                              exIndex,
                              "name",
                              e.target.value,
                            )
                          }
                        />
                        {isSubmit && formErrors[errorKey] && (
                          <p className="text-danger small mt-1 mb-0">
                            {formErrors[errorKey]}
                          </p>
                        )}
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          type="number"
                          min="0"
                          value={ex.targetSets}
                          onChange={(e) =>
                            handleExerciseField(
                              dayIndex,
                              exIndex,
                              "targetSets",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          placeholder="e.g. 10 or 8-12"
                          value={ex.targetReps}
                          onChange={(e) =>
                            handleExerciseField(
                              dayIndex,
                              exIndex,
                              "targetReps",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          placeholder="optional"
                          value={ex.notes}
                          onChange={(e) =>
                            handleExerciseField(
                              dayIndex,
                              exIndex,
                              "notes",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          title="Remove exercise"
                          onClick={() => removeExercise(dayIndex, exIndex)}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            color="light"
            size="sm"
            onClick={() => addExercise(dayIndex)}
          >
            <i className="ri-add-line align-bottom"></i> Add Exercise
          </Button>
        </AccordionBody>
      </AccordionItem>
    );
  };

  document.title = `Member Exercise Plan | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Master"
            title="Member Exercise Plan"
            pageTitle="Member Exercise Plan"
          />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
                  <h5 className="card-title mb-0 flex-grow-1">
                    {showForm
                      ? "Add Exercise Plan"
                      : updateForm
                        ? "Edit Exercise Plan"
                        : "Member Exercise Plans"}
                  </h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {!showForm && !updateForm ? (
                      <>
                        <div
                          className="search-box mb-0"
                          style={{ position: "relative", minWidth: "200px" }}
                        >
                          <Input
                            type="text"
                            className="form-control form-control-sm search"
                            placeholder="Search plans..."
                            style={{ paddingLeft: "30px", height: "30px" }}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
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
                            <i className="ri-add-line align-bottom"></i> Add Plan
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
                  <CardBody>
                    <Form onSubmit={(e) => submit(e, updateForm)}>
                      <Row>
                        <Col md={6}>
                          <FormGroup className="mb-3">
                            <Label className="form-label fw-bold">
                              Plan Name <span className="text-danger">*</span>
                            </Label>
                            <Input
                              name="name"
                              placeholder="e.g. Beginner 6 Day Split"
                              value={values.name}
                              onChange={handleChange}
                            />
                            {isSubmit && formErrors.name && (
                              <p className="text-danger small mt-1">
                                {formErrors.name}
                              </p>
                            )}
                          </FormGroup>
                        </Col>

                        <Col md={3} className="d-flex align-items-center">
                          <FormGroup className="form-check mb-0 mt-3">
                            <Input
                              type="checkbox"
                              className="form-check-input"
                              id="planIsDefault"
                              name="isDefault"
                              checked={values.isDefault}
                              onChange={handleCheck}
                            />
                            <Label
                              className="form-check-label ms-1 fw-semibold"
                              htmlFor="planIsDefault"
                            >
                              Gym default plan
                            </Label>
                          </FormGroup>
                        </Col>

                        <Col md={3} className="d-flex align-items-center">
                          <FormGroup className="form-check mb-0 mt-3">
                            <Input
                              type="checkbox"
                              className="form-check-input"
                              id="planIsActive"
                              name="isActive"
                              checked={values.isActive}
                              onChange={handleCheck}
                            />
                            <Label
                              className="form-check-label ms-1 fw-semibold"
                              htmlFor="planIsActive"
                            >
                              Is Active
                            </Label>
                          </FormGroup>
                        </Col>
                      </Row>

                      <div className="d-flex align-items-center justify-content-between mb-2 mt-2">
                        <Label className="form-label fw-bold mb-0">
                          Weekly Schedule
                        </Label>
                        {isLoadingPlan && (
                          <small className="text-muted">Loading plan…</small>
                        )}
                      </div>

                      <Accordion open={accordionOpen} toggle={toggleAccordion}>
                        {values.days.map(renderDay)}
                      </Accordion>

                      <div className="mt-4 d-flex justify-content-end gap-2">
                        <Button type="button" color="light" onClick={tog_list}>
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          color="success"
                          disabled={isSaving}
                        >
                          {isSaving
                            ? "Saving..."
                            : updateForm
                              ? "Update Plan"
                              : "Save Plan"}
                        </Button>
                      </div>
                    </Form>
                  </CardBody>
                ) : (
                  <CardBody>
                    <div className="table-responsive table-card mt-1 mb-1">
                      <DataTable
                        columns={col}
                        data={visiblePlans}
                        progressPending={loading}
                        pagination
                        paginationPerPage={10}
                        paginationRowsPerPageOptions={[10, 25, 50]}
                        noDataComponent={
                          <div className="text-center py-4 text-muted">
                            No exercise plans found. Click{" "}
                            <strong>Add Plan</strong> to create one.
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

export default MemberExercisePlan;
