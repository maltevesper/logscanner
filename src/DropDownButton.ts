/**
 * Usage Note: currently Chrome has issues with font definitions inside the shadow DOM.
 * Therefore we need to load the symbol font in the document root. As of now, this is implemented
 * as a manual workaround. Please add the following to your head tag:
 * 
 * <link rel="stylesheet" href="DropDownButtonSymbolFonts.css">
 */

//import * as dropdownstyles from "./DropDownButton.module.css" assert { type: "css" };
import dropdownstyles from "./DropDownButton.module.css" assert { type: "css" };

function load_template(template_string: string): HTMLTemplateElement {
    const fragment = new DOMParser().parseFromString(template_string, "text/html");

    const template = fragment.querySelector("template");

    if (template === null) {
        throw new Error("Template is missing <template> tag.");
    }

    return template;
}

function setText(node: HTMLElement, text: string) {
    const text_nodes = [...node.childNodes].filter((childNode) => {
        return (childNode.nodeType === Node.TEXT_NODE);
    });

    text_nodes.forEach((text_node: ChildNode) => { text_node.textContent = ""; });
    text_nodes[0].textContent = text;
}

abstract class TEDCustomElement extends HTMLElement {
    static template: HTMLTemplateElement /* = load_template( // TODO: remove this?
        `<template>
    beer
</template>`
    )*/;

    constructor() {
        super();
        this.attachShadow({ "mode": "open" });
        this.shadowRoot!.appendChild((this.constructor as typeof TEDCustomElement).template.content.cloneNode(true));
    }
}

/* Deactivation 
   - click outside
   - escape
*/
function addClassOnDeactivation(element: HTMLElement, css_class: string) {
    const outside_click_listener = (event: MouseEvent) => {
        if (!event.defaultPrevented && !element.contains(event.currentTarget as Node) && !element.classList.contains(css_class)) {
            deactivate();
        }
    };

    const keyboard_listener = (event: KeyboardEvent) => {
        if (!event.defaultPrevented) {
            switch (event.key) {
                case "Escape":
                    deactivate();
                    break;
            }
        }
    };

    const deactivate = () => {
        element.classList.add(css_class);
        document.removeEventListener("click", outside_click_listener);
        document.removeEventListener("keydown", keyboard_listener);
    };

    document.addEventListener("click", outside_click_listener);
    document.addEventListener("keydown", keyboard_listener);
}

class DropDownButton extends TEDCustomElement {
    static observedAttributes = ["label"];
    //static formAssociated = true;

    //#internals: ElementInternals;

    // <link rel="stylesheet" href="DropDownButtonSymbolFonts.css"> // would need to be added via css module, otherwise not inlined by webpack,
    // due to cheat of adding this to the root document since fonts are not loaded inside components we simply dont add it at all for now.
    static override template: HTMLTemplateElement = load_template(
        `<template>
    <div class="button-box" id="button-box">
        <div class="button" id="button">
            <span id="button-label">Front Button</span>
            <span id="dropdown-expander" class="icon-down-arrow"></span>
        </div>
        <div id="dropdown" class="hide"></div>
        <select class="hide"></select>
    </div>
    <slot></slot>
</template>`
    );

    select: HTMLSelectElement;
    dropdown: HTMLElement;
    mainbutton: HTMLElement;

    css_classes_for_option: string[] = [];

    constructor() {
        super();
        //this.#internals = this.attachInternals();
        //TODO: this should be a custom form-associated element (make sure we react to form reset properly)
        const select = this.shadowRoot!.querySelector("select");

        if (select === null) {
            throw Error("Could not find select tag in template");
        }


        this.select = select;
        const dropdown = this.shadowRoot!.getElementById("dropdown");

        if (dropdown === null) {
            throw Error("Failed to locate dropdown area by id `dropdown`");
        }

        this.dropdown = dropdown;

        const mainbutton = this.shadowRoot!.getElementById("button");

        if (mainbutton === null) {
            throw Error("Failed to locate buttonbox area by id `button`");
        }

        this.mainbutton = mainbutton;

        const dropdown_stylesheet = new CSSStyleSheet();
        this.shadowRoot!.adoptedStyleSheets.push(dropdown_stylesheet);
        this.shadowRoot!.adoptedStyleSheets.push(dropdownstyles);
        //this.shadowRoot!.adoptedStyleSheets.push(dropdownstyles.default);
        //console.log(dropdownstyles);
        //console.log(dropdownstyles.hide);
        /*
          Unfortunately <select><slot></slot></select> does not work,
          since in that case <option> is not a direct child of <select>

          so as a workaround we move the nodes...
        */
        this.shadowRoot!.addEventListener("slotchange", () => {
            const node = this.querySelector("option");

            if (node == null) {
                return;
            }

            select.append(node);

            const optionItem = document.createElement("div");
            optionItem.innerText = node.innerText;
            optionItem.dataset.value = node.value;
            optionItem.classList.add(...[...node.classList.values()]);
            optionItem.addEventListener("click", () => { select.value = node.value; select.dispatchEvent(new Event("change", { bubbles: true, composed: true })); });

            dropdown.appendChild(optionItem);

            dropdown_stylesheet.insertRule(`.button-box[data-selected="${node.value}"] #dropdown div[data-value="${node.value}"] {box-shadow: inset 0em 0em 0em 10em rgba(255, 255, 255, 0.3);}`);

            if ((this.shadowRoot!.host as HTMLElement).dataset.selected == undefined) {
                this.selectedIndex = 0;
            }

            if (node.hasAttribute("selected")) {
                this.selectedIndex = this.select.length - 1;
            }
        });

        this.shadowRoot!.getElementById("button")!.addEventListener("click", this.clicked.bind(this));
        this.shadowRoot!.getElementById("dropdown-expander")!.addEventListener("click", (event) => {
            addClassOnDeactivation(dropdown, "hide");
            dropdown.classList.toggle("hide");
            event.preventDefault();
            event.stopPropagation();
        });

        this.select.addEventListener("change", () => {
            this.mainbutton.classList.remove(...this.css_classes_for_option);

            if (!select.options.length) {
                return;
            }

            const current_option = select.options[select.selectedIndex];

            this.css_classes_for_option = [...current_option.classList];
            this.mainbutton.classList.add(...current_option.classList);

            if (!this.shadowRoot!.host.hasAttribute("label")) {
                setText(this.shadowRoot!.getElementById("button-label")!, current_option.text);
            }

            this.shadowRoot!.getElementById("button-box")!.dataset.selected = current_option.value;
            (this.shadowRoot!.host as HTMLElement).dataset.selected = current_option.value;
        });
        this.addEventListener("keydown", (key_event) => {
            switch (key_event.key) {
                case "ArrowDown":
                    this.selectedIndex = (this.selectedIndex + 1) % this.select.options.length;
                    break;
                case "ArrowUp":
                    this.selectedIndex = (this.selectedIndex + this.select.options.length - 1) % this.select.options.length;
                    break;
            }
        });

        this.tabIndex = 0;
    }

    // connectedCallback() {
    //     console.log("Custom element added to page.");
    // }

    // disconnectedCallback() {
    //     console.log("Custom element removed from page.");
    // }

    // adoptedCallback() {
    //     console.log("Custom element moved to new page.");
    // }

    attributeChangedCallback(name: string, oldValue: any, newValue: any) {
        switch (name) {
            case "label":
                if (newValue !== null) {
                    setText(this.shadowRoot!.getElementById("button-label")!, newValue);
                }
                //TODO: if the new value is null we should apply the value of the current selected option,
                // careful with attemtping to use a change event to generate this update, since we get a
                // attributeChangedCallback on initial load, in which case some elements might not be there
                // yet, thus causing the changed routines to fail (maybe those routines just need some hardenning anyways)
                //this.select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
                break;
        }
    }

    clicked() {
        let option_to_select = this.select.selectedOptions[0]!;

        for (let i = 1; i < this.select.options.length; i++) {
            option_to_select = this.select.options.item((this.select.options.selectedIndex + i) % this.select.options.length)!;

            if (option_to_select.dataset.tedSkip === undefined) {
                break;
            }
        }

        this.value = option_to_select.value;
        //this.select.value = option_to_select.value;
        //this.select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

        //label.classList.remove(previous_option.className);
        //label.classList.add(option_to_select.className);

        //this.#table_body.classList.remove(previous_option.value);
        //this.#table_body.classList.add(option_to_select.value);
    }

    // TODO: expose underlying select API (use a Proxy?, or is there a better method?)
    get selectedOptions() {
        return this.select.selectedOptions;
    }

    get value() {
        return this.select.value;
    }

    set value(new_value) {
        this.select.value = new_value;
        this.select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }

    get selectedIndex() {
        return this.select.selectedIndex;
    }

    set selectedIndex(index) {
        this.select.selectedIndex = index;
        this.select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }

    get length() {
        return this.select.length;
    }
}

customElements.define("ted-dropdown", DropDownButton);