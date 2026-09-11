import React from "react";
import { Col, Container, Row } from "reactstrap";

const Footer = () => {
    return (
        <footer className="footer">
            <Container fluid>
                <Row className="gy-1">
                    <Col xs={12} sm={6} className="text-center text-sm-start">
                        {new Date().getFullYear()} © Barodaweb
                    </Col>
                    <Col xs={12} sm={6}>
                        <a
                            href="https://barodaweb.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-center text-sm-end text-dark d-block"
                            style={{ textDecoration: "none" }}
                        >
                            Powered by{" "}
                            <b>BarodaWeb: The e-Catalogue Designer</b>
                        </a>
                    </Col>
                </Row>
            </Container>
        </footer>
    );
};

export default Footer;
