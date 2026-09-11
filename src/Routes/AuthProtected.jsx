import React, { useContext } from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const AuthProtected = (props) => {
    const { role, isSessionVerified, loading } = useContext(AuthContext);

    // Full-screen spinner only on initial session check — not on later data refreshes
    // (otherwise getAdmin() setLoading(true) blanks the whole layout and looks like a reload)
    if (!isSessionVerified || (loading && !role)) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    // If session verified but no role, redirect to login
    if (!role) {
        return <Navigate to="/" replace />;
    }

    return <>{props.children}</>;
};

AuthProtected.propTypes = {
    children: PropTypes.node,
};

export { AuthProtected };
