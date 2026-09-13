import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import DataTable from "@/Components/Common/DataTableBase";
import { toast } from "react-toastify";

const dragHandleCol = {
    name: "⋮⋮",
    selector: () => (
        <div
            style={{
                cursor: "grab",
                fontSize: "16px",
                color: "#6c757d",
                userSelect: "none",
                padding: "4px",
            }}
            title="Drag to reorder"
        >
            ⋮⋮
        </div>
    ),
    sortable: false,
    maxWidth: "50px",
    center: true,
};

const DraggableDataTable = ({
    columns = [],
    data = [],
    onSequenceUpdate,
    dragHandleColumn = true,
    dragTip = "💡 Tip: Click and drag the ⋮⋮ icon or any row to reorder items",
    sequenceFieldName = "menuSequence",
    idFieldName = "_id",
    onDataRefresh,
    ...dataTableProps
}) => {
    const [draggedRowId, setDraggedRowId] = useState(null);
    const [dragOverRowId, setDragOverRowId] = useState(null);

    const handleRowDragStart = useCallback(
        (e, row, index) => {
            setDraggedRowId(row[idFieldName]);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/html", index);
            e.dataTransfer.setData(
                "application/json",
                JSON.stringify({
                    rowId: row[idFieldName],
                    index,
                    currentSequence: row[sequenceFieldName],
                })
            );
        },
        [idFieldName, sequenceFieldName]
    );

    const handleRowDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }, []);

    const handleRowDragEnter = useCallback(
        (e, row) => {
            e.preventDefault();
            setDragOverRowId(row[idFieldName]);
        },
        [idFieldName]
    );

    const handleRowDragLeave = useCallback(() => {
        setDragOverRowId(null);
    }, []);

    const handleRowDrop = useCallback(
        async (e, targetRow, targetIndex) => {
            e.preventDefault();

            try {
                const dragData = JSON.parse(
                    e.dataTransfer.getData("application/json")
                );
                const sourceIndex = dragData.index;

                if (sourceIndex === targetIndex) {
                    setDraggedRowId(null);
                    setDragOverRowId(null);
                    return;
                }

                // Calculate new sequence based on target position (1-based indexing)
                const newSequence = targetIndex + 1;

                // Update sequence on server
                if (onSequenceUpdate) {
                    await onSequenceUpdate(dragData.rowId, newSequence);
                    toast.success("Sequence updated successfully!");
                }

                // Refresh data to ensure consistency
                if (onDataRefresh) {
                    await onDataRefresh();
                }
            } catch (error) {
                console.error("Error updating sequence:", error);
                toast.error("Failed to update sequence. Please try again.");

                // Refresh data to revert any local changes
                if (onDataRefresh) {
                    await onDataRefresh();
                }
            } finally {
                setDraggedRowId(null);
                setDragOverRowId(null);
            }
        },
        [onSequenceUpdate, onDataRefresh]
    );



    // Combine columns with drag handle if needed
    const finalColumns = dragHandleColumn
        ? [dragHandleCol, ...columns]
        : columns;

    const setupRowDragHandlers = useCallback(
        (row, index) => {
            const itemId = data[index]?.[idFieldName];
            if (!itemId) return;

            // Remove existing event listeners
            row.removeEventListener("dragstart", row._dragStartHandler);
            row.removeEventListener("dragover", row._dragOverHandler);
            row.removeEventListener("dragenter", row._dragEnterHandler);
            row.removeEventListener("dragleave", row._dragLeaveHandler);
            row.removeEventListener("drop", row._dropHandler);

            // Make row draggable
            row.draggable = true;
            row.style.cursor = "grab";

            // Create and store event handlers
            row._dragStartHandler = (e) =>
                handleRowDragStart(e, data[index], index);
            row._dragOverHandler = handleRowDragOver;
            row._dragEnterHandler = (e) =>
                handleRowDragEnter(e, data[index]);
            row._dragLeaveHandler = handleRowDragLeave;
            row._dropHandler = (e) => handleRowDrop(e, data[index], index);

            // Add event listeners
            row.addEventListener("dragstart", row._dragStartHandler);
            row.addEventListener("dragover", row._dragOverHandler);
            row.addEventListener("dragenter", row._dragEnterHandler);
            row.addEventListener("dragleave", row._dragLeaveHandler);
            row.addEventListener("drop", row._dropHandler);

            // Add grab cursor on mouse down
            row.addEventListener("mousedown", () => {
                row.style.cursor = "grabbing";
            });

            row.addEventListener("mouseup", () => {
                row.style.cursor = "grab";
            });
        },
        [
            data,
            idFieldName,
            handleRowDragStart,
            handleRowDragOver,
            handleRowDragEnter,
            handleRowDragLeave,
            handleRowDrop,
        ]
    );

    // Add drag and drop functionality after DataTable renders
    useEffect(() => {
        const addDragHandlers = () => {
            const tableRows = document.querySelectorAll(
                ".draggable-data-table .rdt_TableRow"
            );
            tableRows.forEach(setupRowDragHandlers);
        };

        // Add drag handlers after a small delay to ensure DataTable has rendered
        const timeoutId = setTimeout(addDragHandlers, 100);

        return () => {
            clearTimeout(timeoutId);
            // Cleanup event listeners
            const tableRows = document.querySelectorAll(
                ".draggable-data-table .rdt_TableRow"
            );
            tableRows.forEach((row) => {
                if (row._dragStartHandler) {
                    row.removeEventListener("dragstart", row._dragStartHandler);
                    row.removeEventListener("dragover", row._dragOverHandler);
                    row.removeEventListener("dragenter", row._dragEnterHandler);
                    row.removeEventListener("dragleave", row._dragLeaveHandler);
                    row.removeEventListener("drop", row._dropHandler);
                }
            });
        };
    }, [
        data,
        handleRowDragStart,
        handleRowDragOver,
        handleRowDragEnter,
        handleRowDragLeave,
        handleRowDrop,
        idFieldName,
    ]);

    return (
        <div className="draggable-data-table">
            {dragTip && (
                <div className="mb-2">
                    <small className="text-muted">{dragTip}</small>
                </div>
            )}
            <DataTable
                columns={finalColumns}
                data={data}
                customStyles={{
                    rows: {
                        style: {
                            minHeight: "45px",
                            "&:hover": {
                                backgroundColor: "#f8f9fa",
                            },
                        },
                    },
                    headRow: {
                        style: {
                            backgroundColor: "#f8f9fa",
                            fontWeight: "bold",
                        },
                    },
                    ...dataTableProps.customStyles,
                }}
                conditionalRowStyles={[
                    {
                        when: (row) => row[idFieldName] === draggedRowId,
                        style: {
                            opacity: "0.5",
                            backgroundColor: "#e3f2fd",
                        },
                    },
                    {
                        when: (row) => row[idFieldName] === dragOverRowId,
                        style: {
                            backgroundColor: "#f8f9fa",
                            borderLeft: "3px solid #007bff",
                        },
                    },
                    ...(dataTableProps.conditionalRowStyles || []),
                ]}
                onRowClicked={(row, event) => {
                    // Prevent row click when dragging
                    if (draggedRowId) return;
                    // Call original onRowClicked if provided
                    if (dataTableProps.onRowClicked) {
                        dataTableProps.onRowClicked(row, event);
                    }
                }}
                pointerOnHover={!draggedRowId}
                {...dataTableProps}
            />
            <style dangerouslySetInnerHTML={{ __html: `
                .draggable-data-table .rdt_TableRow {
                    cursor: grab;
                }
                .draggable-data-table .rdt_TableRow:active {
                    cursor: grabbing;
                }
                .draggable-data-table .dragging {
                    opacity: 0.5;
                }
                .draggable-data-table .drag-over {
                    background-color: #f8f9fa !important;
                    border-left: 3px solid #007bff;
                }
            ` }} />
        </div>
    );
};

DraggableDataTable.propTypes = {
    columns: PropTypes.array,
    data: PropTypes.array,
    onSequenceUpdate: PropTypes.func,
    dragHandleColumn: PropTypes.bool,
    dragTip: PropTypes.string,
    sequenceFieldName: PropTypes.string,
    idFieldName: PropTypes.string,
    onDataRefresh: PropTypes.func,
};

export default DraggableDataTable;
