import React, { useEffect } from "react";
import PropTypes from "prop-types";
import withRouter from "../Components/Common/withRouter";

const NonAuthLayout = ({ children }) => {
    useEffect(() => {
        // Set default to light mode for auth pages
        document.body.dataset.layoutMode = "light";
        return () => {
            delete document.body.dataset.layoutMode;
        };
    }, []);

    return <div>{children}</div>;
};

NonAuthLayout.propTypes = {
    children: PropTypes.any,
};

export default withRouter(NonAuthLayout);

