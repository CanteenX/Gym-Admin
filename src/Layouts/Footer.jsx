import React from "react";
import { Col, Container, Row } from "reactstrap";

const Footer = () => {
    return (
        <footer className="footer">
            <Container fluid>
                <Row className="gy-1">
                    <Col xs={12} sm={6} className="text-center text-sm-start">
                        {new Date().getFullYear()} © Mid City Gym
                    </Col>
                    <Col xs={12} sm={6}>
                        <span className="text-center text-sm-end text-dark d-block">
                            Mid City Gym · Vadodara — <b>Vasna &amp; Gotri</b>
                        </span>
                    </Col>
                </Row>
            </Container>
        </footer>
    );
};

export default Footer;
