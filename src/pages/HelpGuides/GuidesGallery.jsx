import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Row,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Nav,
  NavItem,
  NavLink,
} from "reactstrap";
import classnames from "classnames";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { searchGuides } from "../../api/guides.api";
import config from "../../config";
import { fileUrl } from "@/utils/fileUrl";

const GuidesGallery = () => {
  const { adminData } = useContext(AuthContext);

  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  // Modals for preview/reading details
  const [detailModal, setDetailModal] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState(null);

  // Modals for video playback
  const [videoModal, setVideoModal] = useState(false);
  const [videoType, setVideoType] = useState(""); // "YouTube" or "System Video"
  const [videoSource, setVideoSource] = useState("");

  const fetchGuides = async () => {
    setLoading(true);
    try {
      // Determine filtering type based on active tab
      let typeParam = undefined;
      if (activeTab === "YouTube") typeParam = "YouTube";
      else if (activeTab === "Videos") typeParam = "System Video";
      else if (activeTab === "Documents") typeParam = "Document";

      const response = await searchGuides({
        skip: 0,
        per_page: 100, // retrieve all matching active guides for visual view
        sorton: "sequence",
        sortdir: "asc",
        match: query,
        isActive: true, // Only show active guides in the gallery
        type: typeParam,
      });

      if (response.data?.data?.length > 0) {
        setGuides(response.data.data[0].data || []);
      } else {
        setGuides([]);
      }
    } catch (err) {
      console.error("Error fetching gallery guides:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, [query, activeTab]);

  const toggleDetailModal = (guide = null) => {
    setSelectedGuide(guide);
    setDetailModal(!detailModal);
  };

  const toggleVideoModal = (guide = null) => {
    if (guide) {
      setVideoType(guide.type);
      if (guide.type === "YouTube") {
        setVideoSource(getYoutubeEmbedUrl(guide.youtubeUrl));
      } else {
        const backendUrl = config.api.API_URL;
        setVideoSource(`${backendUrl}/${guide.filePath}`);
      }
    } else {
      setVideoSource("");
      setVideoType("");
    }
    setVideoModal(!videoModal);
  };

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : "";
  };

  const getGuideIcon = (type) => {
    switch (type) {
      case "YouTube":
        return (
          <div className="avatar-title rounded bg-danger-subtle text-danger fs-24">
            <i className="ri-youtube-fill"></i>
          </div>
        );
      case "System Video":
        return (
          <div className="avatar-title rounded bg-primary-subtle text-primary fs-24">
            <i className="ri-film-line"></i>
          </div>
        );
      case "Document":
        return (
          <div className="avatar-title rounded bg-info-subtle text-info fs-24">
            <i className="ri-file-text-line"></i>
          </div>
        );
      default:
        return (
          <div className="avatar-title rounded bg-light text-muted fs-24">
            <i className="ri-file-line"></i>
          </div>
        );
    }
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case "YouTube":
        return "bg-danger-subtle text-danger";
      case "System Video":
        return "bg-primary-subtle text-primary";
      case "Document":
        return "bg-info-subtle text-info";
      default:
        return "bg-light text-muted";
    }
  };

  const handleOpenGuide = (guide) => {
    if (guide.type === "YouTube") {
      window.open(guide.youtubeUrl, "_blank");
    } else if (guide.type === "System Video") {
      toggleVideoModal(guide);
    } else if (guide.type === "Document") {
      window.open(fileUrl(guide.filePath), "_blank");
    }
  };

  document.title = `Guides Gallery | ${adminData?.companyName || "Admin"}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Help and Guide" title="Guides Gallery" pageTitle="Guides" />

          {/* Filters and Search */}
          <Row className="mb-4 align-items-center">
            <Col md={4} sm={12} className="mb-3 mb-md-0">
              <div className="search-box" style={{ position: "relative" }}>
                <Input
                  aria-label="Search guides by title"
                  type="text"
                  placeholder="Search for guides..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ paddingLeft: "35px" }}
                />
                <i
                  className="ri-search-line search-icon"
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#878a99",
                  }}
                ></i>
              </div>
            </Col>
            <Col md={8} sm={12} className="d-flex justify-content-md-end justify-content-start">
              <Nav pills className="nav-success">
                {["All", "YouTube", "Videos", "Documents"].map((tab) => (
                  <NavItem key={tab}>
                    <NavLink
                      className={classnames({ active: activeTab === tab })}
                      onClick={() => setActiveTab(tab)}
                      style={{ cursor: "pointer", fontWeight: "500", borderRadius: "5px" }}
                    >
                      {tab}
                    </NavLink>
                  </NavItem>
                ))}
              </Nav>
            </Col>
          </Row>

          {/* Cards Grid */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : guides.length === 0 ? (
            <div className="text-center py-5">
              <i className="ri-customer-service-line text-muted display-4 mb-3 d-block"></i>
              <h5 className="text-muted">No guides found</h5>
              <p className="text-muted small">Try adjusting your search query or tab filters.</p>
            </div>
          ) : (
            <Row className="row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {guides.map((guide) => (
                <Col key={guide._id}>
                  <Card className="h-100 shadow-sm border-0 card-animate">
                    <CardBody className="d-flex flex-column p-4">
                      {/* Icon */}
                      <div className="d-flex align-items-center mb-3">
                        <div className="avatar-md flex-shrink-0 me-3" style={{ width: "48px", height: "48px" }}>
                          {getGuideIcon(guide.type)}
                        </div>
                        <div>
                          <span className={`badge uppercase fw-semibold ${getBadgeClass(guide.type)}`}>
                            {guide.type === "System Video" ? "VIDEO" : guide.type.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h5 className="fs-16 fw-semibold text-dark mb-2 text-capitalize">
                        {guide.title}
                      </h5>

                      {/* Excerpt of description */}
                      {guide.description && (
                        <div
                          className="text-muted small flex-grow-1 mb-3 text-truncate-2"
                          style={{
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                          dangerouslySetInnerHTML={{ __html: guide.description.replace(/<[^>]*>/g, "") }}
                        />
                      )}

                      {/* Footer Actions */}
                      <div className="d-flex align-items-center justify-content-between mt-auto pt-3 border-top border-light">
                        <Button
                          color="link"
                          className="text-muted p-0 d-flex align-items-center gap-1 fw-semibold text-decoration-none"
                          onClick={() => toggleDetailModal(guide)}
                        >
                          <i className="ri-information-line align-middle"></i> Details
                        </Button>
                        {guide.type === "YouTube" ? (
                          <Button
                            tag="a"
                            href={guide.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                          >
                            Open <i className="ri-external-link-line align-middle"></i>
                          </Button>
                        ) : guide.type === "Document" ? (
                          <Button
                            tag="a"
                            href={fileUrl(guide.filePath)}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                          >
                            Open <i className="ri-external-link-line align-middle"></i>
                          </Button>
                        ) : (
                          <Button
                            color="success"
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            onClick={() => handleOpenGuide(guide)}
                          >
                            Open <i className="ri-external-link-line align-middle"></i>
                          </Button>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          {/* Details Modal */}
          <Modal isOpen={detailModal} toggle={() => toggleDetailModal()} centered scrollable>
            <ModalHeader toggle={() => toggleDetailModal()} className="bg-light">
              <span className="text-capitalize">{selectedGuide?.title}</span>
            </ModalHeader>
            <ModalBody className="p-4">
              {selectedGuide?.description ? (
                <div
                  className="guide-description-content"
                  dangerouslySetInnerHTML={{ __html: selectedGuide.description }}
                />
              ) : (
                <p className="text-muted italic">No detailed description provided for this guide.</p>
              )}
            </ModalBody>
            <ModalFooter className="bg-light">
              <Button color="secondary" onClick={() => toggleDetailModal()}>
                Close
              </Button>
              {selectedGuide && (
                selectedGuide.type === "YouTube" ? (
                  <Button
                    tag="a"
                    href={selectedGuide.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="success"
                    onClick={() => toggleDetailModal()}
                  >
                    Open YouTube Video
                  </Button>
                ) : selectedGuide.type === "Document" ? (
                  <Button
                    tag="a"
                    href={fileUrl(selectedGuide.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="success"
                    onClick={() => toggleDetailModal()}
                  >
                    Open Guide File
                  </Button>
                ) : (
                  <Button
                    color="success"
                    onClick={() => {
                      toggleDetailModal();
                      handleOpenGuide(selectedGuide);
                    }}
                  >
                    Open Guide File
                  </Button>
                )
              )}
            </ModalFooter>
          </Modal>

          {/* Video Player Modal */}
          <Modal isOpen={videoModal} toggle={() => toggleVideoModal()} size="lg" centered>
            <ModalHeader toggle={() => toggleVideoModal()} className="bg-light">
              Video Guide Playback
            </ModalHeader>
            <ModalBody className="p-0 bg-dark text-center">
              {videoType === "YouTube" ? (
                <div className="ratio ratio-16x9">
                  <iframe
                    src={videoSource}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <div className="p-2">
                  <video controls width="100%" height="auto" autoPlay className="rounded">
                    <source src={videoSource} />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={() => toggleVideoModal()}>
                Close
              </Button>
            </ModalFooter>
          </Modal>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default GuidesGallery;
