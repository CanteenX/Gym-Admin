import PropTypes from "prop-types";
import { fileUrl } from "@/utils/fileUrl";
import {
  absoluteUrlFor,
  effectiveOgDescription,
  effectiveOgTitle,
} from "./seoRules";

/**
 * What a shared link looks like on WhatsApp, Facebook, LinkedIn or X.
 *
 * The title and description shown here fall back to the meta values exactly the
 * way the server does when the OG fields are blank, so the preview cannot claim
 * a card is empty when the crawler would actually see the meta text.
 */
const SocialPreview = ({ values }) => {
  const url = absoluteUrlFor(values.slug);
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    host = url;
  }
  const image = fileUrl(values.ogImage);
  const title = effectiveOgTitle(values) || "Untitled page";
  const description =
    effectiveOgDescription(values) ||
    "No description - the card will show the link on its own.";

  return (
    <div>
      <h6 className="mb-2">Shared link card</h6>
      <div
        className="border rounded overflow-hidden"
        style={{ maxWidth: "480px" }}
      >
        {image ? (
          <img
            src={image}
            alt={`Share image for ${title}`}
            className="w-100"
            style={{ maxHeight: "200px", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            className="bg-light d-flex flex-column align-items-center justify-content-center text-muted"
            style={{ height: "140px" }}
          >
            <i
              className="ri-image-line fs-3"
              aria-hidden="true"
            ></i>
            <small>No share image set</small>
          </div>
        )}
        <div className="p-2 bg-light">
          <div className="text-uppercase text-muted small text-break">
            {host}
          </div>
          <div className="fw-semibold text-body text-wrap">{title}</div>
          <div className="small text-muted text-wrap">{description}</div>
        </div>
      </div>
      <small className="text-muted">
        Type: {values.ogType || "website"}. Images render at roughly 1200x630;
        anything much smaller is upscaled and looks soft.
      </small>
    </div>
  );
};

SocialPreview.propTypes = {
  values: PropTypes.object.isRequired,
};

export default SocialPreview;
