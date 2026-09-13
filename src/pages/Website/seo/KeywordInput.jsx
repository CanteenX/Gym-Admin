import { useState } from "react";
import PropTypes from "prop-types";
import { Button, Input, Label } from "reactstrap";
import { KEYWORD_MAX } from "./seoRules";

/**
 * Keywords as removable chips.
 *
 * Enter or a comma commits the word; a comma-separated paste is split in one
 * go. Backspace on an empty box removes the last chip, which is what every
 * tag input does and what people try first.
 *
 * The explicit "Add" button is not redundant: on a touch keyboard Enter is
 * often a newline and there is no comma key without switching layouts, so
 * without it the field is unusable on a phone.
 */
const KeywordInput = ({ inputId, keywords, onChange, disabled }) => {
  const [draft, setDraft] = useState("");

  const commit = (raw) => {
    const parts = String(raw)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (!parts.length) return;
    // Case-insensitive de-dupe: "Gym" and "gym" are one keyword to a crawler.
    const seen = new Set(keywords.map((k) => k.toLowerCase()));
    const next = [...keywords];
    for (const part of parts) {
      if (seen.has(part.toLowerCase())) continue;
      seen.add(part.toLowerCase());
      next.push(part);
    }
    onChange(next);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      // Enter would otherwise submit the whole form and save a half-filled row.
      e.preventDefault();
      commit(draft);
      return;
    }
    if (e.key === "Backspace" && !draft && keywords.length) {
      onChange(keywords.slice(0, -1));
    }
  };

  return (
    <div>
      <Label htmlFor={inputId} className="form-label fw-bold">
        Keywords
      </Label>
      {keywords.length ? (
        <div className="d-flex flex-wrap gap-1 mb-2">
          {keywords.map((keyword) => (
            <span
              key={keyword}
              className="badge bg-light text-body border d-inline-flex align-items-center gap-1"
            >
              <span className="text-wrap">{keyword}</span>
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-danger lh-1"
                aria-label={`Remove keyword ${keyword}`}
                title={`Remove keyword ${keyword}`}
                disabled={disabled}
                onClick={() =>
                  onChange(keywords.filter((k) => k !== keyword))
                }
              >
                <i className="ri-close-line" aria-hidden="true"></i>
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="d-flex gap-2 flex-wrap">
        <Input
          id={inputId}
          className="flex-grow-1"
          style={{ minWidth: "160px" }}
          value={draft}
          disabled={disabled}
          aria-describedby={`${inputId}-help`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
        />
        <Button
          type="button"
          color="light"
          disabled={disabled || !draft.trim()}
          onClick={() => commit(draft)}
        >
          Add keyword
        </Button>
      </div>
      <small id={`${inputId}-help`} className="text-muted">
        Press Enter or type a comma to add. Keep it to {KEYWORD_MAX} or fewer -
        a long list reads as keyword stuffing.
      </small>
      {keywords.length > KEYWORD_MAX ? (
        <p className="text-danger small mb-0 mt-1">
          {keywords.length} keywords. Remove {keywords.length - KEYWORD_MAX} to
          get back under the limit.
        </p>
      ) : null}
    </div>
  );
};

KeywordInput.propTypes = {
  inputId: PropTypes.string.isRequired,
  keywords: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default KeywordInput;
