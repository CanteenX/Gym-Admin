import React, { useState, useContext } from "react";
import {
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
} from "reactstrap";


import logo from "../../assets/images/gym-logo.svg";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { logout } from "../../api/auth.api";
import config from "../../config";
import { fileUrl } from "@/utils/fileUrl";

const ProfileDropdown = () => {
    const navigate = useNavigate();
    const { adminData, setAdminData, role } = useContext(AuthContext);

    const logoSrc = adminData?.logo
        ? fileUrl(adminData.logo)
        : logo;

    const handleLogout = async () => {
        setAdminData(null);
        await logout(); // This will call the server and clear localStorage
        // Note: logout() already redirects to "/", so no need to navigate here
    };

    //Dropdown Toggle
    const [isProfileDropdown, setIsProfileDropdown] = useState(false);

    /**
     * The header used to print `role`, which is not a job title.
     *
     * `role` is only WHICH TABLE the session came from — CompanyMaster gives
     * "ADMIN", Employee gives "EMPLOYEE". So the branch admin's own header
     * called them "EMPLOYEE" while the front desk beside them, on a
     * deliberately smaller permission set, said exactly the same thing. Two
     * different jobs, one label, and it read as a bug because it looked like
     * the account had the wrong level.
     *
     * Privilege actually lives on `isSuperAdmin`, and the useful facts about a
     * branch login are the person's name and which branch they run. Those are
     * shown instead. Admin-vs-staff is NOT inferred here: `/auth/me` returns a
     * roleId but no role name, and guessing a seniority the response does not
     * carry is how the old label got it wrong in the first place.
     */
    const displayName =
        adminData?.employeeName || adminData?.companyName || adminData?.emailOffice || adminData?.email || "";
    const displayRole = adminData?.isSuperAdmin
        ? "Super Admin"
        : adminData?.branch
          ? `${adminData.branch} branch`
          : role || "";
    const toggleProfileDropdown = () => {
        setIsProfileDropdown(!isProfileDropdown);
    };
    return (
        <Dropdown
            isOpen={isProfileDropdown}
            toggle={toggleProfileDropdown}
            className="ms-sm-3 header-item topbar-user"
        
        >
            <DropdownToggle tag="button" type="button" className="btn">
                <span className="d-flex align-items-center">
                    <img
                        className="rounded-circle header-profile-user"
                        src={logoSrc}
                        alt="Header Avatar"
                        style={{ objectFit: "contain" }}
                    />
                    <span className="text-start ms-xl-2">
                        <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text">
                            {displayName}
                        </span>
                        <span className="d-none d-xl-block ms-1 fs-12 text-muted user-name-sub-text">
                            {displayRole}
                        </span>
                    </span>
                </span>
            </DropdownToggle>
            <DropdownMenu className="dropdown-menu-end">
                <h6 className="dropdown-header">
                    Welcome {adminData?.companyName || adminData?.employeeName}!
                </h6>
                <DropdownItem
                    onClick={() => navigate(role === "ADMIN" ? "/company-details" : "/profile")}
                >
                    <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>
                    <span className="align-middle">Profile</span>
                </DropdownItem>

                <DropdownItem onClick={handleLogout}>
                    <i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i>{" "}
                    <span className="align-middle" data-key="t-logout">
                        Logout
                    </span>
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
};

export default ProfileDropdown;
