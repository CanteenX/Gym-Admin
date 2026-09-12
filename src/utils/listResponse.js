/**
 * Unwraps a `…-by-params` list response.
 *
 * The house style returns the page and its total inside a one-element
 * aggregation array - `data: [{ data: [...], count: 42 }]` - because the
 * controllers use a $facet pipeline. Every page that reads `data[0].data`
 * inline therefore throws (or silently renders empty) the moment a controller
 * answers with a plain array instead, which is exactly what a hand-written
 * endpoint tends to do. Reading both shapes here keeps that difference from
 * becoming a blank screen with no error.
 *
 * @param {object} res - the raw axios response
 * @returns {{ rows: Array, count: number }}
 */
export const unwrapList = (res) => {
  const payload = res?.data?.data;

  if (Array.isArray(payload)) {
    const first = payload[0];
    if (first && Array.isArray(first.data)) {
      return { rows: first.data, count: Number(first.count) || 0 };
    }
    return { rows: payload, count: payload.length };
  }

  if (payload && Array.isArray(payload.data)) {
    return { rows: payload.data, count: Number(payload.count) || 0 };
  }

  return { rows: [], count: 0 };
};

export default unwrapList;
