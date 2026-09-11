import React, { useEffect } from 'react';
const UiContent = () => {
    useEffect(() => {
        const checkbox = document.getElementsByClassName("code-switcher");
        Array.from(checkbox).forEach(function (check) {
            check.addEventListener('change', function () {
                const card = check.closest('.card');
                const preview = card.querySelector(".live-preview");
                const code = card.querySelector(".code-view");
                if (check.checked) {
                    // do this
                    preview.classList.add("d-none");
                    code.classList.remove("d-none");
                } else {
                    // do that
                    preview.classList.remove("d-none");
                    code.classList.add("d-none");
                }
            });
        });
    }, []);
    return (
        <div>
        </div>
    );
};
export default UiContent;