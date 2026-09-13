import React from 'react';
import { Input } from 'reactstrap';
import PropTypes from 'prop-types';

export const Filter = ({ column }) => {
  return (
    <div style={{ marginTop: 5 }}>
      {column.canFilter && column.render('Filter')}
    </div>
  );
};

Filter.propTypes = {
  column: PropTypes.shape({
    canFilter: PropTypes.bool,
    render: PropTypes.func.isRequired,
  }).isRequired,
};

export const DefaultColumnFilter = ({
  column: {
    filterValue,
    setFilter,
    preFilteredRows: { length },
  },
}) => {
  return (
    <Input
      aria-label="Search this column"
      value={filterValue || ''}
      onChange={(e) => {
        setFilter(e.target.value || undefined);
      }}
      placeholder={`search (${length}) ...`}
    />
  );
};

DefaultColumnFilter.propTypes = {
  column: PropTypes.shape({
    filterValue: PropTypes.any,
    setFilter: PropTypes.func.isRequired,
    preFilteredRows: PropTypes.shape({
      length: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
};

export const SelectColumnFilter = ({
  column: { filterValue, setFilter, preFilteredRows, id },
}) => {
  const options = React.useMemo(() => {
    const options = new Set();
    preFilteredRows.forEach((row) => {
      options.add(row.values[id]);
    });
    return [...options.values()];
  }, [id, preFilteredRows]);

  return (
    <select
      aria-label="Filter this column"
      id='custom-select'
      className="form-select"
      value={filterValue}
      onChange={(e) => {
        setFilter(e.target.value || undefined);
      }}
    >
      <option value=''>All</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};

SelectColumnFilter.propTypes = {
  column: PropTypes.shape({
    filterValue: PropTypes.any,
    setFilter: PropTypes.func.isRequired,
    preFilteredRows: PropTypes.array.isRequired,
    id: PropTypes.any.isRequired,
  }).isRequired,
};
