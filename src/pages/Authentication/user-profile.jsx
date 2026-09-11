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
                                            <Label>Employee Name</Label>
                                            <Input
                                                value={adminData?.employeeName || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={4}>
                                        <div className="mb-3">
                                            <Label>Email</Label>
                                            <Input
                                                value={adminData?.emailOffice || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={4}>
                                        <div className="mb-3">
                                            <Label>Mobile Number</Label>
                                            <Input
                                                value={adminData?.mobileNumber || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={4}>
                                        <div className="mb-3">
                                            <Label>Department</Label>
                                            <Input
                                                value={adminData?.departmentId?.departmentName || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={4}>
                                        <div className="mb-3">
                                            <Label>Country</Label>
                                            <Input
                                                value={adminData?.countryId?.countryName || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={4}>
                                        <div className="mb-3">
                                            <Label>State</Label>
                                            <Input
                                                value={adminData?.stateId?.stateName || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={6}>
                                        <div className="mb-3">
                                            <Label>City</Label>
                                            <Input
                                                value={adminData?.cityId?.cityName || ""}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={6}>
                                        <div className="mb-3">
                                            <Label>Status</Label>
                                            <Input
                                                value={adminData?.isActive ? "Active" : "Inactive"}
                                                disabled
                                            />
                                        </div>
                                    </Col>

                                    <Col lg={12}>
                                        <div className="mb-3">
                                            <Label>Address</Label>
                                            <Input
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
