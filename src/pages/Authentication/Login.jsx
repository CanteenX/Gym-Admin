import React, { useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    Card,
    CardBody,
    Col,
    Container,
    Input,
    Label,
    Row,
    Button,
    Form,
} from "reactstrap";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import withRouter from "../../Components/Common/withRouter";
import { AuthContext } from "../../context/AuthContext";
import bgImage from "../../assets/images/gym-logo.svg";
import { MenuContext } from "../../context/MenuContext";
import logo from "../../assets/images/gym-logo.svg";
import { getPublicCompanyDetails } from "../../api/companies.api";
import config from "../../config";
import {
    loginCompany,
    sendOtp,
    verifyOtp,
    resetPassword,
} from "../../api/auth.api";
import { useLoginAttempt } from "../../hooks/useLoginAttempt";

const initialState = {
    email: "",
    password: "",
};

// Format seconds to MM:SS
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
};

// Function to get user's IP address
const getUserIP = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Failed to get IP address:', error);
        return 'unknown';
    }
};

// Function to get user's location with high accuracy
const getUserLocation = () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn('Geolocation is not supported by this browser');
            resolve({ latitude: null, longitude: null });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Geolocation obtained:', {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy + ' meters'
                });
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                console.error('Geolocation error:', error);
                resolve({ latitude: null, longitude: null });
            },
            {
                timeout: 15000,
                maximumAge: 120000
            }
        );
    });
};

const ForgotPasswordForm = ({
    forgotPasswordStep,
    setForgotPasswordStep,
    forgotPasswordEmail,
    setForgotPasswordEmail,
    isSendOtpLoading,
    handleSendOTP,
    handleBackToLogin,
    otp,
    setOtp,
    isVerifyOtpLoading,
    otpCountdown,
    handleVerifyOTP,
    otpResendDisabled,
    isResendOtpLoading,
    handleResendOTP,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isResetPasswordLoading,
    handleResetPassword,
}) => {
    switch (forgotPasswordStep) {
        case 1: // Email input
            return (
                <>
                    <div className="text-center">
                        <h2
                            className="mobile-heading"
                            style={{ color: "#0d6efd", fontWeight: "700" }}
                        >
                            FORGOT PASSWORD
                        </h2>
                        <p className="text-muted">
                            Enter your email to reset password
                        </p>
                    </div>
                    <div className="p-2 mt-4">
                        <div className="mb-3">
                            <Label
                                htmlFor="forgotPasswordEmail"
                                className="form-label"
                            >
                                Email
                            </Label>
                            <Input
                                id="forgotPasswordEmail"
                                className="form-control"
                                placeholder="Enter email"
                                type="email"
                                value={forgotPasswordEmail}
                                onChange={(e) =>
                                    setForgotPasswordEmail(e.target.value)
                                }
                                disabled={isSendOtpLoading}
                            />
                        </div>
                        <div className="mt-4">
                            <Button
                                color="primary"
                                className="w-100"
                                onClick={handleSendOTP}
                                disabled={isSendOtpLoading}
                            >
                                {isSendOtpLoading ? (
                                    <>
                                        <output
                                            className="spinner-border spinner-border-sm me-2"
                                            aria-hidden="true"
                                        ></output>
                                        Sending...
                                    </>
                                ) : (
                                    "Send OTP"
                                )}
                            </Button>
                        </div>
                        <div className="mt-3 text-center">
                            <p className="mb-0">
                                <button
                                    type="button"
                                    className="btn btn-link fw-medium text-primary p-0 border-0 align-baseline text-decoration-none"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleBackToLogin();
                                    }}
                                    disabled={isSendOtpLoading}
                                >
                                    Back to Login
                                </button>
                            </p>
                        </div>
                    </div>
                </>
            );
        case 2: // OTP verification
            return (
                <>
                    <div className="text-center">
                        <h2
                            className="mobile-heading"
                            style={{ color: "#0d6efd", fontWeight: "700" }}
                        >
                            VERIFY OTP
                        </h2>
                        <p className="text-muted">
                            Enter the OTP sent to your email
                        </p>
                    </div>
                    <div className="p-2 mt-4">
                        <div className="mb-3">
                            <Label htmlFor="otp" className="form-label">
                                OTP
                            </Label>
                            <Input
                                id="otp"
                                className="form-control"
                                placeholder="Enter 6-digit OTP"
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                disabled={isVerifyOtpLoading}
                            />
                            {otpCountdown > 0 && (
                                <small className="text-muted">
                                    You can resend OTP in{" "}
                                    {formatTime(otpCountdown)}
                                </small>
                            )}
                        </div>
                        <div className="mt-4">
                            <Button
                                color="primary"
                                className="w-100"
                                onClick={handleVerifyOTP}
                                disabled={isVerifyOtpLoading}
                            >
                                {isVerifyOtpLoading ? (
                                    <>
                                        <output
                                            className="spinner-border spinner-border-sm me-2"
                                            aria-hidden="true"
                                        ></output>
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify OTP"
                                )}
                            </Button>
                        </div>
                        <div className="mt-3 d-flex justify-content-between">
                            <p className="mb-0">
                                <button
                                    type="button"
                                    className="btn btn-link fw-medium text-primary p-0 border-0 align-baseline text-decoration-none"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setForgotPasswordStep(1);
                                    }}
                                    disabled={isVerifyOtpLoading}
                                >
                                    Back
                                </button>
                            </p>
                            <p className="mb-0">
                                <button
                                    type="button"
                                    className={`btn btn-link fw-medium p-0 border-0 align-baseline text-decoration-none ${otpResendDisabled ||
                                        isResendOtpLoading
                                        ? "text-muted"
                                        : "text-primary"
                                        }`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (
                                            !otpResendDisabled &&
                                            !isResendOtpLoading
                                        ) {
                                            handleResendOTP();
                                        }
                                    }}
                                    style={{
                                        cursor:
                                            otpResendDisabled ||
                                                isResendOtpLoading
                                                ? "default"
                                                : "pointer",
                                    }}
                                    disabled={otpResendDisabled || isResendOtpLoading}
                                >
                                    {isResendOtpLoading ? (
                                        <>
                                            <output
                                                className="spinner-border spinner-border-sm me-2"
                                                aria-hidden="true"
                                            ></output>
                                            Resending...
                                        </>
                                    ) : (
                                        "Resend OTP"
                                    )}
                                </button>
                            </p>
                        </div>
                    </div>
                </>
            );
        case 3: // Reset password
            return (
                <>
                    <div className="text-center">
                        <h2
                            className="mobile-heading"
                            style={{ color: "#0d6efd", fontWeight: "700" }}
                        >
                            RESET PASSWORD
                        </h2>
                        <p className="text-muted">
                            Enter your new password
                        </p>
                    </div>
                    <div className="p-2 mt-4">
                        <div className="mb-3">
                            <Label
                                htmlFor="newPassword"
                                className="form-label"
                            >
                                New Password
                            </Label>
                            <Input
                                id="newPassword"
                                className="form-control"
                                placeholder="Enter new password"
                                type="password"
                                value={newPassword}
                                onChange={(e) =>
                                    setNewPassword(e.target.value)
                                }
                                disabled={isResetPasswordLoading}
                            />
                        </div>
                        <div className="mb-3">
                            <Label
                                htmlFor="confirmPassword"
                                className="form-label"
                            >
                                Confirm Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                className="form-control"
                                placeholder="Confirm new password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                disabled={isResetPasswordLoading}
                            />
                        </div>
                        <div className="mt-4">
                            <Button
                                color="primary"
                                className="w-100"
                                onClick={handleResetPassword}
                                disabled={isResetPasswordLoading}
                            >
                                {isResetPasswordLoading ? (
                                    <>
                                        <output
                                            className="spinner-border spinner-border-sm me-2"
                                            aria-hidden="true"
                                        ></output>
                                        Resetting...
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </Button>
                        </div>
                    </div>
                </>
            );
        default:
            return null;
    }
};

ForgotPasswordForm.propTypes = {
    forgotPasswordStep: PropTypes.number.isRequired,
    setForgotPasswordStep: PropTypes.func.isRequired,
    forgotPasswordEmail: PropTypes.string.isRequired,
    setForgotPasswordEmail: PropTypes.func.isRequired,
    isSendOtpLoading: PropTypes.bool.isRequired,
    handleSendOTP: PropTypes.func.isRequired,
    handleBackToLogin: PropTypes.func.isRequired,
    otp: PropTypes.string.isRequired,
    setOtp: PropTypes.func.isRequired,
    isVerifyOtpLoading: PropTypes.bool.isRequired,
    otpCountdown: PropTypes.number.isRequired,
    handleVerifyOTP: PropTypes.func.isRequired,
    otpResendDisabled: PropTypes.bool.isRequired,
    isResendOtpLoading: PropTypes.bool.isRequired,
    handleResendOTP: PropTypes.func.isRequired,
    newPassword: PropTypes.string.isRequired,
    setNewPassword: PropTypes.func.isRequired,
    confirmPassword: PropTypes.string.isRequired,
    setConfirmPassword: PropTypes.func.isRequired,
    isResetPasswordLoading: PropTypes.bool.isRequired,
    handleResetPassword: PropTypes.func.isRequired,
};

const getLoginErrorMessage = (status, data) => {
    if (status === 423) {
        return data.message || "Your account is locked due to multiple failed login attempts.";
    }
    if (status === 401) {
        const remaining = data.attemptsRemaining;
        if (remaining === undefined) {
            return data.message || "Invalid credentials";
        } else {
            if (remaining === 0) {
                return "Your account has been locked due to too many failed attempts.";
            }
            return `Invalid credentials. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`;
        }
    }
    return null;
};

const validate = (values, setErrEmail, setErrPassword) => {
    const errors = {};
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (values.email) {
        if (regex.test(values.email)) {
            setErrEmail(false);
        } else {
            errors.email = "Invalid Email address!";
            setErrEmail(true);
        }
    } else {
        errors.email = "Email is required!";
        setErrEmail(true);
    }
    if (values.password) {
        setErrPassword(false);
    } else {
        errors.password = "Password is required!";
        setErrPassword(true);
    }
    return errors;
};

const handleLoginError = (err, updateFromResponse) => {
    if (err?.response) {
        const { status, data } = err.response;
        if (status === 423) {
            updateFromResponse(data);
            toast.error(
                data.message ||
                "Your account is locked due to multiple failed login attempts."
            );
        } else if (status === 401) {
            updateFromResponse(data);
            const remaining = data.attemptsRemaining;
            if (remaining === undefined) {
                toast.error(data.message || "Invalid credentials");
            } else {
                toast.error(
                    `Invalid credentials. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
                );
            }
        } else {
            toast.error(data.message || "Authentication failed!");
        }
    } else {
        toast.error(err.message || "Authentication failed!");
    }
};

const resetForgotPasswordState = (
    setForgotPasswordMode,
    setForgotPasswordStep,
    setForgotPasswordEmail,
    setOtp,
    setNewPassword,
    setConfirmPassword
) => {
    setForgotPasswordMode(false);
    setForgotPasswordStep(1);
    setForgotPasswordEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
};

const performSendOTP = (
    forgotPasswordEmail,
    setIsSendOtpLoading,
    setForgotPasswordStep,
    setOtpResendDisabled,
    setOtpCountdown
) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!forgotPasswordEmail || !regex.test(forgotPasswordEmail)) {
        toast.error("Please enter a valid email address");
        return;
    }

    setIsSendOtpLoading(true);
    sendOtp({
        email: forgotPasswordEmail,
    })
        .then((res) => {
            setIsSendOtpLoading(false);
            if (res.data.isOk) {
                toast.success("OTP sent to your email");
                setForgotPasswordStep(2);
                setOtpResendDisabled(true);
                setOtpCountdown(60);
            } else {
                toast.error(res.data.message || "Failed to send OTP");
                if (res.data.remainingTime) {
                    setOtpResendDisabled(true);
                    setOtpCountdown(res.data.remainingTime);
                }
            }
        })
        .catch((err) => {
            setIsSendOtpLoading(false);
            if (
                err?.response?.status === 429 &&
                err?.response?.data?.remainingTime
            ) {
                toast.error(
                    err.message || "Please wait before requesting a new OTP"
                );
                setOtpResendDisabled(true);
                setOtpCountdown(err?.response?.data?.remainingTime);
            } else {
                toast.error(
                    err?.response?.data?.message ||
                    err.message ||
                    "Failed to send OTP"
                );
            }
        });
};

const performResendOTP = (
    forgotPasswordEmail,
    otpResendDisabled,
    setIsResendOtpLoading,
    setOtpResendDisabled,
    setOtpCountdown
) => {
    if (otpResendDisabled) return;

    setIsResendOtpLoading(true);
    sendOtp({
        email: forgotPasswordEmail,
    })
        .then((res) => {
            setIsResendOtpLoading(false);
            if (res.data.isOk) {
                toast.success("OTP resent to your email");
                setOtpResendDisabled(true);
                setOtpCountdown(60);
            } else {
                toast.error(res.data.message || "Failed to resend OTP");
                if (res.data.remainingTime) {
                    setOtpResendDisabled(true);
                    setOtpCountdown(res.data.remainingTime);
                }
            }
        })
        .catch((err) => {
            setIsResendOtpLoading(false);
            if (
                err?.response?.status === 429 &&
                err?.response?.data?.remainingTime
            ) {
                toast.error(
                    err.message || "Please wait before requesting a new OTP"
                );
                setOtpResendDisabled(true);
                setOtpCountdown(err?.response?.data?.remainingTime);
            } else {
                toast.error(err.message || "Failed to resend OTP");
            }
        });
};

const performVerifyOTP = (
    forgotPasswordEmail,
    otp,
    setIsVerifyOtpLoading,
    setForgotPasswordStep
) => {
    if (otp?.length !== 6) {
        toast.error("Please enter a valid 6-digit OTP");
        return;
    }

    setIsVerifyOtpLoading(true);
    verifyOtp({
        email: forgotPasswordEmail,
        otp: otp,
    })
        .then((res) => {
            setIsVerifyOtpLoading(false);
            if (res.data.isOk) {
                toast.success("OTP verified successfully");
                setForgotPasswordStep(3);
            } else {
                toast.error(res.data.message || "Invalid OTP");
            }
        })
        .catch((err) => {
            setIsVerifyOtpLoading(false);
            toast.error(err.message || "Failed to verify OTP");
        });
};

const performResetPassword = ({
    forgotPasswordEmail,
    otp,
    newPassword,
    confirmPassword,
    setIsResetPasswordLoading,
    setForgotPasswordMode,
    setForgotPasswordStep,
    setForgotPasswordEmail,
    setOtp,
    setNewPassword,
    setConfirmPassword,
}) => {
    if (newPassword.length < 6) {
        toast.error("Password should be at least 6 characters long");
        return;
    }

    if (newPassword !== confirmPassword) {
        toast.error("Passwords don't match");
        return;
    }

    setIsResetPasswordLoading(true);
    resetPassword({
        email: forgotPasswordEmail,
        otp: otp,
        newPassword: newPassword,
    })
        .then((res) => {
            setIsResetPasswordLoading(false);
            if (res.data.isOk) {
                toast.success("Password reset successfully");
                setForgotPasswordMode(false);
                setForgotPasswordStep(1);
                setForgotPasswordEmail("");
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                toast.error(res.message || "Failed to reset password");
            }
        })
        .catch((err) => {
            setIsResetPasswordLoading(false);
            toast.error(err.message || "Failed to reset password");
        });
};

const handleLoginResponse = (res, updateFromResponse, setAdminData, setRole, fetchMenus, navigate) => {
    const status = res.status || res.data?.status;

    if (status === 423 || status === 401) {
        updateFromResponse(res.data);
        const errorMsg = getLoginErrorMessage(status, res.data);
        if (errorMsg) {
            toast.error(errorMsg);
        }
        return;
    }

    if (res.data.isOk) {
        const rawRole = typeof res.data.role === "string"
            ? res.data.role.toUpperCase().trim()
            : (res.data.data?.role ? res.data.data.role.toUpperCase().trim() : "");
        const sanitizedRole = (rawRole === "ADMIN" || rawRole === "EMPLOYEE") ? rawRole : "";
        localStorage.setItem("role", sanitizedRole);
        if (setRole) setRole(sanitizedRole);
        setAdminData({ ...res.data.data });
        fetchMenus();
        navigate("/dashboard", { replace: true });
    } else {
        toast.error(res.data.message || "Authentication failed!");
    }
};

const executeLogin = async ({
    values,
    locationConsent,
    ipConsent,
    updateFromResponse,
    setAdminData,
    setRole,
    fetchMenus,
    navigate,
    setIsLoginLoading,
    fetchLoginStatus
}) => {
    setIsLoginLoading(true);
    try {
        const userLocation = await getUserLocation();
        const securityHeaders = {
            'X-Client-Latitude': userLocation.latitude?.toString() || '',
            'X-Client-Longitude': userLocation.longitude?.toString() || '',
        };

        const res = await loginCompany({
            email: values.email,
            password: values.password,
            locationConsent: locationConsent,
            ipConsent: ipConsent,
            clientLatitude: userLocation.latitude,
            clientLongitude: userLocation.longitude,
        }, securityHeaders);

        handleLoginResponse(res, updateFromResponse, setAdminData, setRole, fetchMenus, navigate);
    } catch (error) {
        handleLoginError(error, updateFromResponse);
    } finally {
        setIsLoginLoading(false);
        fetchLoginStatus();
    }
};

const performLogin = async (e, {
    values,
    setErrEmail,
    setErrPassword,
    setIsSubmit,
    setFormErrors,
    locationConsent,
    ipConsent,
    isLocked,
    formattedTime,
    updateFromResponse,
    setAdminData,
    setRole,
    fetchMenus,
    navigate,
    setIsLoginLoading,
    fetchLoginStatus
}) => {
    if (e) {
        e.preventDefault();
    }

    setIsSubmit(true);
    const errors = validate(values, setErrEmail, setErrPassword);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;
    if (!locationConsent || !ipConsent) return;

    const confirmMessage = `By proceeding, you confirm that you agree to share:

• Your IP Address - for security logging
• Your Location - for security verification

This information will be used to monitor and protect your account from unauthorized access.

Do you want to continue?`;

    if (!globalThis.confirm(confirmMessage)) {
        toast.info("Login cancelled. Please accept the sharing consent to continue.");
        return;
    }

    if (isLocked) {
        toast.error(`Your account is locked. Try again in ${formattedTime}`);
        return;
    }

    await executeLogin({
        values,
        locationConsent,
        ipConsent,
        updateFromResponse,
        setAdminData,
        setRole,
        fetchMenus,
        navigate,
        setIsLoginLoading,
        fetchLoginStatus
    });
};

const Login = () => {
    const { fetchMenus } = useContext(MenuContext);
    const { setAdminData, setRole } = useContext(AuthContext);
    const navigate = useNavigate();

    const [publicCompany, setPublicCompany] = useState(null);

    const logoSrc = publicCompany?.logo
        ? (publicCompany.logo.startsWith("http") ? publicCompany.logo : `${config.api.API_URL}/${publicCompany.logo.replace(/^\/+/, "")}`)
        : logo;

    const sideLogoSrc = publicCompany?.loginBanner
        ? (publicCompany.loginBanner.startsWith("http") ? publicCompany.loginBanner : `${config.api.API_URL}/${publicCompany.loginBanner.replace(/^\/+/, "")}`)
        : bgImage;

    const loadBranding = (emailVal = "") => {
        getPublicCompanyDetails(emailVal)
            .then((res) => {
                if (res.data.isOk && res.data.data) {
                    setPublicCompany(res.data.data);
                    
                    // Update favicon dynamically on login page mount
                    if (res.data.data.favicon) {
                        const faviconUrl = `${config.api.API_URL}/${res.data.data.favicon.replace(/^\/+/, "")}`;
                        let link = document.querySelector("link[rel~='icon']");
                        if (!link) {
                            link = document.createElement("link");
                            link.rel = "icon";
                            document.getElementsByTagName("head")[0].appendChild(link);
                        }
                        link.href = faviconUrl;
                    }
                }
            })
            .catch((err) => {
                console.error("Failed to load public company details:", err);
            });
    };

    useEffect(() => {
        loadBranding("");
    }, []);
    const [values, setValues] = useState(initialState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmit, setIsSubmit] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errEmail, setErrEmail] = useState(false);
    const [errPassword, setErrPassword] = useState(false);

    // Forgot password states
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Loading states
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [isSendOtpLoading, setIsSendOtpLoading] = useState(false);
    const [isResendOtpLoading, setIsResendOtpLoading] = useState(false);
    const [isVerifyOtpLoading, setIsVerifyOtpLoading] = useState(false);
    const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);

    // Countdown timer for OTP resend
    const [otpCountdown, setOtpCountdown] = useState(0);
    const [otpResendDisabled, setOtpResendDisabled] = useState(false);

    // Consent checkboxes for location and IP tracking
    const [locationConsent, setLocationConsent] = useState(false);
    const [ipConsent, setIpConsent] = useState(false);

    // Login attempt limitation hook
    const {
        isLocked,
        attemptsRemaining,
        formattedTime,
        updateFromResponse,
        fetchStatus: fetchLoginStatus,
    } = useLoginAttempt(values.email);

    // Timer interval ref
    const timerRef = React.useRef(null);

    // Handle timer effect
    React.useEffect(() => {
        if (otpCountdown > 0) {
            timerRef.current = setInterval(() => {
                setOtpCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setOtpResendDisabled(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [otpCountdown]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues({ ...values, [name]: value });

        if (name === "email") {
            const emailVal = value.trim();
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
                loadBranding(emailVal);
            } else if (emailVal === "") {
                loadBranding("");
            }
        }
    };

    const login = async (e) => {
        await performLogin(e, {
            values,
            setErrEmail,
            setErrPassword,
            setIsSubmit,
            setFormErrors,
            locationConsent,
            ipConsent,
            isLocked,
            formattedTime,
            updateFromResponse,
            setAdminData,
            setRole,
            fetchMenus,
            navigate,
            setIsLoginLoading,
            fetchLoginStatus
        });
    };

    // Handle forgot password email submission with countdown
    const handleSendOTP = () => {
        performSendOTP(
            forgotPasswordEmail,
            setIsSendOtpLoading,
            setForgotPasswordStep,
            setOtpResendDisabled,
            setOtpCountdown
        );
    };

    // Handle OTP resend
    const handleResendOTP = () => {
        performResendOTP(
            forgotPasswordEmail,
            otpResendDisabled,
            setIsResendOtpLoading,
            setOtpResendDisabled,
            setOtpCountdown
        );
    };

    // Handle OTP verification
    const handleVerifyOTP = () => {
        performVerifyOTP(
            forgotPasswordEmail,
            otp,
            setIsVerifyOtpLoading,
            setForgotPasswordStep
        );
    };

    // Handle password reset
    const handleResetPassword = () => {
        performResetPassword({
            forgotPasswordEmail,
            otp,
            newPassword,
            confirmPassword,
            setIsResetPasswordLoading,
            setForgotPasswordMode,
            setForgotPasswordStep,
            setForgotPasswordEmail,
            setOtp,
            setNewPassword,
            setConfirmPassword,
        });
    };

    // Handle back to login
    const handleBackToLogin = () => {
        resetForgotPasswordState(
            setForgotPasswordMode,
            setForgotPasswordStep,
            setForgotPasswordEmail,
            setOtp,
            setNewPassword,
            setConfirmPassword
        );
    };

    document.title = `Sign in | Barodaweb`;



    return (
        <>
            <style>
                {`
                    @media (max-width: 767px) {
                        .auth-wrapper {
                            flex-direction: column;
                            overflow-y: auto;
                        }
                        .left-panel {
                            display: none !important;
                        }
                        .right-panel {
                            width: 100% !important;
                            min-height: 100vh !important;
                            height: auto !important;
                        }
                        .mobile-logo {
                            width: 80px !important;
                        }
                        .mobile-heading {
                            font-size: 1.5rem !important;
                        }
                        .mobile-card-body {
                            padding: 2rem 1.5rem !important;
                        }
                    }
                    @media (min-width: 768px) and (max-width: 991px) {
                        .left-panel {
                            width: 50% !important;
                        }
                        .right-panel {
                            width: 50% !important;
                        }
                    }
                `}
            </style>
            <div className="auth-wrapper d-flex" style={{ height: "100vh" }}>
                <div
                    className="left-panel d-flex align-items-center justify-content-center"
                    style={{
                        backgroundColor: "#e7f3ff",
                        width: "70%",
                        height: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    <img src={sideLogoSrc} alt="Background" style={{ height: "300px", maxWidth: "80%", objectFit: "contain" }} />
                </div>
                <div
                    className="right-panel d-flex align-items-center justify-content-center"
                    style={{
                        width: "30%",
                        backgroundColor: "white",
                        height: "100vh",
                    }}
                >
                    <Container>
                        <Row className="justify-content-center">
                            <Col xs={12} sm={12} md={10} lg={6} xl={12}>
                                <Card
                                    style={{
                                        border: "none",
                                        boxShadow: "0 4px 24px rgba(0,0,0,0)",
                                        borderRadius: "12px",
                                    }}
                                >
                                    <CardBody className="p-5 mobile-card-body">
                                         {forgotPasswordMode ? (
                                             <ForgotPasswordForm
                                                 forgotPasswordStep={forgotPasswordStep}
                                                 setForgotPasswordStep={setForgotPasswordStep}
                                                 forgotPasswordEmail={forgotPasswordEmail}
                                                 setForgotPasswordEmail={setForgotPasswordEmail}
                                                 isSendOtpLoading={isSendOtpLoading}
                                                 handleSendOTP={handleSendOTP}
                                                 handleBackToLogin={handleBackToLogin}
                                                 otp={otp}
                                                 setOtp={setOtp}
                                                 isVerifyOtpLoading={isVerifyOtpLoading}
                                                 otpCountdown={otpCountdown}
                                                 handleVerifyOTP={handleVerifyOTP}
                                                 otpResendDisabled={otpResendDisabled}
                                                 isResendOtpLoading={isResendOtpLoading}
                                                 handleResendOTP={handleResendOTP}
                                                 newPassword={newPassword}
                                                 setNewPassword={setNewPassword}
                                                 confirmPassword={confirmPassword}
                                                 setConfirmPassword={setConfirmPassword}
                                                 isResetPasswordLoading={isResetPasswordLoading}
                                                 handleResetPassword={handleResetPassword}
                                             />
                                         ) : (
                                            <>
                                                <div className="text-center mb-4">
                                                    <div className="d-flex justify-content-center mb-4">
                                                        <img
                                                            src={logoSrc}
                                                            alt="Logo"
                                                            style={{
                                                                width: "100px",
                                                                height: "100px",
                                                                objectFit: "contain",
                                                            }}
                                                            className="mobile-logo"
                                                        />
                                                    </div>
                                                    <h2
                                                        className="mobile-heading"
                                                        style={{
                                                            color: "#0d6efd",
                                                            fontWeight: "700",
                                                            letterSpacing:
                                                                "1px",
                                                        }}
                                                    >
                                                        LOGIN
                                                    </h2>
                                                    <p
                                                        className="text-muted"
                                                        style={{
                                                            fontSize: "0.9rem",
                                                        }}
                                                    >
                                                        Welcome back! Please
                                                        login to your account.
                                                    </p>
                                                </div>
                                                <Form>
                                                    {/* Account Lock Warning */}
                                                    {isLocked && (
                                                        <div
                                                            style={{
                                                                backgroundColor: "#ff7675",
                                                                color: "white",
                                                                padding: "12px 16px",
                                                                borderRadius: "8px",
                                                                marginBottom: "16px",
                                                                borderLeft: "4px solid #d63031",
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                                                                🔒 Account Locked
                                                            </div>
                                                            <div style={{ fontSize: "0.9rem" }}>
                                                                Your account is locked due to multiple failed login attempts.
                                                                {formattedTime && (
                                                                    <span>
                                                                        {" "}Try again in <strong>{formattedTime}</strong>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ marginTop: "8px", fontSize: "0.85rem" }}>
                                                                <a
                                                                    href="#forgot"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setForgotPasswordMode(true);
                                                                    }}
                                                                    style={{
                                                                        color: "white",
                                                                        textDecoration: "underline",
                                                                    }}
                                                                >
                                                                    Forgot Password?
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Low Attempts Warning */}
                                                    {!isLocked && attemptsRemaining > 0 && attemptsRemaining < 3 && (
                                                        <div
                                                            style={{
                                                                backgroundColor: "#ffeaa7",
                                                                color: "#856404",
                                                                padding: "12px 16px",
                                                                borderRadius: "8px",
                                                                marginBottom: "16px",
                                                                borderLeft: "4px solid #fdcb6e",
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: "600" }}>
                                                                ⚠️ Warning: {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining
                                                            </div>
                                                            <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                                                                Your account will be locked after {attemptsRemaining} more failed {attemptsRemaining === 1 ? "attempt" : "attempts"}.
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="p-2 mt-4">
                                                        <div className="mb-3">
                                                            <Label
                                                                htmlFor="email"
                                                                className="form-label"
                                                                style={{
                                                                    fontWeight:
                                                                        "500",
                                                                    color: "#495057",
                                                                }}
                                                            >
                                                                Email
                                                            </Label>
                                                            <Input
                                                                onSubmit={login}
                                                                name="email"
                                                                className={
                                                                    errEmail &&
                                                                        isSubmit
                                                                        ? "form-control is-invalid"
                                                                        : "form-control"
                                                                }
                                                                placeholder="Enter email"
                                                                type="email"
                                                                onChange={
                                                                    handleChange
                                                                }
                                                                value={
                                                                    values.email
                                                                }
                                                                style={{
                                                                    borderRadius:
                                                                        "8px",
                                                                    padding:
                                                                        "0.65rem 1rem",
                                                                }}
                                                            />
                                                            {isSubmit &&
                                                                formErrors.email && (
                                                                    <p className="text-danger">
                                                                        {
                                                                            formErrors.email
                                                                        }
                                                                    </p>
                                                                )}
                                                        </div>
                                                        <div className="mb-3">
                                                            <Label
                                                                className="form-label"
                                                                htmlFor="password-input"
                                                                style={{
                                                                    fontWeight:
                                                                        "500",
                                                                    color: "#495057",
                                                                }}
                                                            >
                                                                Password
                                                            </Label>
                                                            <div className="position-relative auth-pass-inputgroup mb-3">
                                                                <Input
                                                                    onSubmit={
                                                                        login
                                                                    }
                                                                    name="password"
                                                                    type={
                                                                        showPassword
                                                                            ? "text"
                                                                            : "password"
                                                                    }
                                                                    className={
                                                                        errPassword &&
                                                                            isSubmit
                                                                            ? "form-control is-invalid"
                                                                            : "form-control pe-5"
                                                                    }
                                                                    placeholder="Enter Password"
                                                                    onChange={
                                                                        handleChange
                                                                    }
                                                                    value={
                                                                        values.password
                                                                    }
                                                                    style={{
                                                                        borderRadius:
                                                                            "8px",
                                                                        padding:
                                                                            "0.65rem 1rem",
                                                                    }}
                                                                />
                                                                <button
                                                                    className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted"
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setShowPassword(
                                                                            !showPassword
                                                                        )
                                                                    }
                                                                >
                                                                    {showPassword ? (
                                                                        <i className="ri-eye-off-fill align-middle"></i>
                                                                    ) : (
                                                                        <i className="ri-eye-fill align-middle"></i>
                                                                    )}
                                                                </button>
                                                            </div>
                                                            {isSubmit &&
                                                                formErrors.password && (
                                                                    <p className="text-danger">
                                                                        {formErrors.password}
                                                                    </p>
                                                                )}
                                                           
                                                        </div>

                                                        {/* Consent Checkboxes */}
                                                        <div
                                                            className="consent-section mb-3 p-3"
                                                            style={{
                                                                backgroundColor: "#f8f9fa",
                                                                borderRadius: "8px",
                                                                border: "1px solid #e9ecef",
                                                            }}
                                                        >
                                                            <p
                                                                className="mb-2"
                                                                style={{
                                                                    fontSize: "0.85rem",
                                                                    color: "#6c757d",
                                                                    fontWeight: "500"
                                                                }}
                                                            >
                                                                <i className="ri-shield-check-line me-1"></i> Security Consent Required
                                                            </p>
                                                            <div className="form-check mb-2">
                                                                <Input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    id="locationConsent"
                                                                    checked={locationConsent}
                                                                    onChange={(e) => setLocationConsent(e.target.checked)}
                                                                    style={{
                                                                        cursor: "pointer",
                                                                        width: "18px",
                                                                        height: "18px"
                                                                    }}
                                                                />
                                                                <Label
                                                                    className="form-check-label"
                                                                    htmlFor="locationConsent"
                                                                    style={{
                                                                        fontSize: "0.85rem",
                                                                        cursor: "pointer",
                                                                        marginLeft: "4px"
                                                                    }}
                                                                >
                                                                    <i className="ri-map-pin-line me-1" style={{ color: "#0d6efd" }}></i> I consent to location tracking for security purposes
                                                                    {isSubmit && !locationConsent && (
                                                                        <span className="text-danger ms-1" style={{ fontSize: "0.8rem" }}>*Required</span>
                                                                    )}
                                                                </Label>
                                                            </div>
                                                            <div className="form-check">
                                                                <Input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    id="ipConsent"
                                                                    checked={ipConsent}
                                                                    onChange={(e) => setIpConsent(e.target.checked)}
                                                                    style={{
                                                                        cursor: "pointer",
                                                                        width: "18px",
                                                                        height: "18px"
                                                                    }}
                                                                />
                                                                <Label
                                                                    className="form-check-label"
                                                                    htmlFor="ipConsent"
                                                                    style={{
                                                                        fontSize: "0.85rem",
                                                                        cursor: "pointer",
                                                                        marginLeft: "4px"
                                                                    }}
                                                                >
                                                                    <i className="ri-global-line me-1" style={{ color: "#0d6efd" }}></i> I consent to IP address tracking for security purposes
                                                                    {isSubmit && !ipConsent && (
                                                                        <span className="text-danger ms-1" style={{ fontSize: "0.8rem" }}>*Required</span>
                                                                    )}
                                                                </Label>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4">
                                                            <Button
                                                                type="button"
                                                                className="w-100"
                                                                onClick={login}
                                                                disabled={
                                                                    isLoginLoading || isLocked
                                                                }
                                                                style={{
                                                                    backgroundColor:
                                                                        "#0d6efd",
                                                                    borderColor:
                                                                        "#0d6efd",
                                                                    padding:
                                                                        "0.65rem 1rem",
                                                                    borderRadius:
                                                                        "8px",
                                                                    fontWeight:
                                                                        "600",
                                                                    letterSpacing:
                                                                        "0.5px",
                                                                    transition:
                                                                        "all 0.3s ease",
                                                                }}
                                                                onMouseEnter={(
                                                                    e
                                                                ) => {
                                                                    if (
                                                                        !isLoginLoading
                                                                    ) {
                                                                        e.target.style.backgroundColor =
                                                                            "#0b5ed7";
                                                                        e.target.style.boxShadow =
                                                                            "0 4px 12px rgba(13,110,253,0.3)";
                                                                    }
                                                                }}
                                                                onMouseLeave={(
                                                                    e
                                                                ) => {
                                                                    e.target.style.backgroundColor =
                                                                        "#0d6efd";
                                                                    e.target.style.boxShadow =
                                                                        "none";
                                                                }}
                                                            >
                                                                {isLoginLoading ? (
                                                                    <>
                                                                        <output
                                                                            className="spinner-border spinner-border-sm me-2"
                                                                            aria-hidden="true"
                                                                        ></output>
                                                                        Logging
                                                                        in...
                                                                    </>
                                                                ) : (
                                                                    "Login"
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Form>
                                            </>
                                         )}
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    </Container>
                </div>
            </div>
        </>
    );
};

export default withRouter(Login);
