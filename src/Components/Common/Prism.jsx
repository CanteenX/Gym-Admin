import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Prism from "prismjs";

const PrismCode = (props) => {
    const ref = useRef();

    useEffect(() => {
        highlight();
    }, []);

    const highlight = () => {
        if (ref?.current) {
            Prism.highlightElement(ref.current);
        }
    };

    const { code, language } = props;
    return (
        <pre className="line-numbers">
            <code ref={ref} className={`language-${language}`}>
                {code.trim()}
            </code>
        </pre>
    );
};

PrismCode.propTypes = {
    code: PropTypes.string.isRequired,
    language: PropTypes.string.isRequired,
};

export default PrismCode;

