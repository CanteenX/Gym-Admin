import React, { useContext } from "react";
import {
    Container,
    Row,
    Col,
    Card,
    CardBody,
    Label,
    Input,
} from "reactstrap";
import { AuthContext } from "../../context/AuthContext";

const UserProfile = () => {
    const { adminData } = useContext(AuthContext);
    document.title = `Profile | Trivedi Associates & Tecknical Services Pvt. Ltd.`;
    return (
        <div className="page-content">
            <Container fluid>
                <Row>
                    <Col lg="12">
                        <Card>
                            <CardBody>
                                <Row>
                                    <Col lg={4}>
                                        <div className="mb-3">
                                            <Label htmlFor="profile-employee-name">Employee Name</Label>
                                            <Input id="profile-employee-name"
                                                value={adminData?.employeeName || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={4}>
                                        <div className="mb-3">
                                            <Label htmlFor="profile-email">Email</Label>
                                            <Input id="profile-email"
                                                value={adminData?.emailOffice || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={4}>
                                        <div className="mb-3">
                                            <Label htmlFor="profile-mobile-number">Mobile Number</Label>
                                            <Input id="profile-mobile-number"
                                                value={adminData?.mobileNumber || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={4}>
                                        <div className="mb-3">
                                            <Label htmlFor="profile-department">Department</Label>
                                            <Input id="profile-department"
                                                value={adminData?.departmentId?.departmentName || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={4}>
                                        <div className="mb-3">
                                            <Label htmlFor="profile-country">Country</Label>
                                            <Input id="profile-country"
                                                value={adminData?.countryId?.countryName || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={4}>
                                        <div className="mb-3">
                                            <Label htmlFor="profile-state">State</Label>
                                            <Input id="profile-state"
                                                value={adminData?.stateId?.stateName || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={6}>
                                        <div className="mb-3">
                                            <Label htmlFor="profile-city">City</Label>
                                            <Input id="profile-city"
                                                value={adminData?.cityId?.cityName || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={6}>
                                        <div className="mb-3">
                                            <Label htmlFor="profile-status">Status</Label>
                                            <Input id="profile-status"
                                                value={adminData?.isActive ? "Active" : "Inactive"}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={12}>
                                        <div className="mb-3">
                                            <Label htmlFor="profile-address">Address</Label>
                                            <Input id="profile-address"
                                                type="textarea"
                                                rows="4"
                                                value={adminData?.address || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default UserProfile;
