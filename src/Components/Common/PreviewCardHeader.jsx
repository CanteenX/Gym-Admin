import React from 'react';
import PropTypes from 'prop-types';
import { CardHeader, Input, Label } from 'reactstrap';

const PreviewCardHeader = ({ title }) => {
    return (
        <CardHeader className="align-items-center d-flex">
            <h4 className="card-title mb-0 flex-grow-1">{title}</h4>
            <div className="flex-shrink-0">
                <div className="form-check form-switch form-switch-right form-switch-md">
                    <Label className="form-label text-muted">Show Code</Label>
                    <Input aria-label="Show code" className="form-check-input code-switcher" type="checkbox" />
                </div>
            </div>
        </CardHeader>
    );
}

PreviewCardHeader.propTypes = {
    title: PropTypes.string.isRequired,
};

export default PreviewCardHeader;