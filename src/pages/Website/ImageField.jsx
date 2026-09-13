import { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { FormGroup, Input, Label } from "reactstrap";
import { fileUrl } from "@/utils/fileUrl";

/**
 * The one image picker the CMS screens share.
 *
 * It lived inside items/SiteItemForm.jsx until the page-sections editor needed
 * the same control. It is here rather than duplicated because the blob-url
 * lifecycle below is the kind of detail that gets fixed in one copy and left
 * broken in the other — which is exactly what happened between the adverts and
 * items screens before.
 *
 * The pattern it encodes: a free-text reference AND a file picker, never one
 * instead of the other. An external CDN link, a legacy path and a fresh upload
 * are all valid values for the same field, so removing the text box would strand
 * rows that were typed in by hand.
 */

/** The server's uploader accepts images only, up to 5 MB. */
export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.gif,.webp";
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const humanSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Client-side gate on a picked file.
 *
 * The server checks extension, MIME *and* magic bytes (middlewares/secureUpload)
 * and is the real authority; this only exists so the obvious mistakes fail
 * instantly instead of after a 5 MB round trip.
 *
 * @param {File|null} file
 * @returns {string} an error to show, or "" when the file is acceptable
 */
export const validateImageFile = (file) => {
  if (!file) return "";
  const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
  if (!IMAGE_ACCEPT.split(",").includes(ext)) {
    return `Only ${IMAGE_ACCEPT.replaceAll(",", ", ")} files are allowed`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is ${humanSize(file.size)} — the limit is 5 MB`;
  }
  return "";
};

/**
 * One photo: the stored reference (typed or uploaded) plus a file picker.
 *
 * The preview URL is derived ONCE per file and revoked on change. Calling
 * URL.createObjectURL() inline in JSX mints a new blob url on every render and
 * never releases the old one — the same leak that was fixed on the adverts
 * screen.
 *
 * The saved value goes through fileUrl(): an upload comes back as an absolute
 * Supabase url, which must pass through untouched, while older rows hold a
 * relative "uploads/…" path that needs the API origin in front of it.
 */
const ImageField = ({
  id,
  label,
  hint,
  placeholder,
  value,
  file,
  error,
  disabled,
  onUrlChange,
  onFileChange,
}) => {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const shown = preview || fileUrl(value);

  return (
    <FormGroup className="mb-3">
      <Label htmlFor={id} className="form-label fw-bold">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onUrlChange(e.target.value)}
      />
      <div className="mt-2">
        <Label htmlFor={`${id}Upload`} className="form-label mb-1">
          Upload a photo for {label.toLowerCase()}
        </Label>
        <Input
          id={`${id}Upload`}
          type="file"
          accept={IMAGE_ACCEPT}
          disabled={disabled}
          onChange={(e) => onFileChange(e.target.files?.[0] || null, e)}
        />
        <small className="text-muted d-block mt-1">
          {hint || "Paste a link, or upload a file to host it here."} JPG, PNG,
          GIF or WebP · max 5 MB.
        </small>
        {error ? <p className="text-danger small mt-1 mb-0">{error}</p> : null}
      </div>
      {shown ? (
        <div className="mt-2">
          <img
            src={shown}
            alt={`${label} preview`}
            className="img-thumbnail"
            style={{ maxWidth: "100%", width: 160, height: "auto" }}
          />
        </div>
      ) : null}
    </FormGroup>
  );
};

ImageField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  file: PropTypes.object,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  onUrlChange: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
};

export default ImageField;
