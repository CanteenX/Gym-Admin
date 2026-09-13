import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { uploadSiteContentImage } from "../../../api/siteContent.api";
import { validateImageFile } from "../ImageField";

/**
 * The picked-but-not-yet-uploaded image for the section editor.
 *
 * It is a hook rather than state inside WebsitePages because the upload is a
 * SECOND request that only makes sense after the row is saved: POST
 * /site/content/:id/image is keyed by the row's id, so a new section has no id
 * to upload against until create() answers. Keeping that ordering in one place
 * stops the add and edit paths from drifting apart.
 *
 * The free-text `imageUrl` box is untouched by all of this — a section can still
 * be pointed at an external CDN and never involve an upload at all.
 */
export const useSectionImage = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setFile(null);
    setError("");
  }, []);

  /**
   * @param {File|null} picked
   * @param {Event} [event] the change event, so a rejected file can be cleared
   *   from the input — otherwise the browser keeps showing its name next to an
   *   error message, which reads as "it is still going to upload this".
   */
  const onFileChange = useCallback((picked, event) => {
    const message = validateImageFile(picked);
    if (message) {
      if (event?.target) event.target.value = "";
      setFile(null);
      setError(message);
      return;
    }
    setError("");
    setFile(picked || null);
  }, []);

  /**
   * Uploads the pending file, if there is one, against a row that now exists.
   *
   * Failure is reported as a WARNING, not an error: the section itself saved, so
   * saying "failed to save" would be wrong and would invite a second save that
   * the unique (pageKey, sectionKey) index then rejects as a duplicate. The
   * server's own message is preferred because it is the one that explains the
   * real cause — a file the magic-byte check rejected, the hourly upload rate
   * limit, or a missing `edit` permission on the row that was just created with
   * `write`.
   *
   * @param {string} id the saved row's _id
   * @returns {Promise<boolean>} whether an image was actually stored
   */
  const uploadIfPending = useCallback(
    async (id) => {
      if (!file || !id) return false;
      try {
        const res = await uploadSiteContentImage(id, file);
        // An HTTP 200 carrying isOk:false is still a failure — the house
        // envelope reports refusals in the body, not only in the status.
        if (!res?.data?.isOk) {
          toast.warn(
            res?.data?.message ||
              "The section saved, but the image could not be uploaded",
          );
          return false;
        }
        return true;
      } catch (err) {
        console.error(err);
        toast.warn(
          err.response?.data?.message ||
            "The section saved, but the image could not be uploaded",
        );
        return false;
      }
    },
    [file],
  );

  return { file, error, reset, onFileChange, uploadIfPending };
};

export default useSectionImage;
