(() => {
	const EXTENSION_STYLE_ID = `hockey-nation-ext-styles`;

	if (document.getElementById(EXTENSION_STYLE_ID)) {
		return;
	}

	const cssRules = `
    [data-column] {
        background-color: transparent;
    }

    tr.own [data-column] {
        border-color: var(--border-green-300);
        border-bottom-width: 1px;
        border-top-width: 1px;
        background-color: var(--bg-green-100);
    }

    tr.ghost [data-column] {
        background-color: var(--bg-orange-300);
    }

    `;

	const styleElement = document.createElement("style");
	styleElement.id = EXTENSION_STYLE_ID;
	styleElement.textContent = cssRules;
	(document.head || document.documentElement).appendChild(styleElement);
})();
