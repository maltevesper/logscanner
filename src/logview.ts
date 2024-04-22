// TODO: we should specify a log json format...
// type JSONValue =
//     | string
//     | number
//     | boolean
//     | { [x: string]: JSONValue }
//     | Array<JSONValue>

type LogType = {
    records: Array<LogRecord>;
}

type LogRecord = {
    message: string;
    level: number;
    logger: string;
}

enum LogLevel {
    NOTSET = 0,
    DEBUG = 10,
    INFO = 20,
    WARN = 30,
    ERROR = 40,
    CRITICAL = 50,
}

type SelectOption = {
    label: string;
    value: string;
    class: string;
}

function* iterateEnum(enum_instance: {}) {
    for (const key of Object.keys(enum_instance)) {
        if (isNaN(Number(key))) {
            yield key;
        }
    }
}

function toLevelCategory(numeric_level: number): LogLevel {
    let level: LogLevel = LogLevel.NOTSET;

    // TODO: use iterateEnum? might be worse, since this quits walking the enum early
    Object.keys(LogLevel).every((key) => {
        const key_index = Number(key);

        // Once we reach the text keys we are done
        if (isNaN(key_index)) {
            return false;
        }

        if (key_index <= numeric_level) {
            level = key_index;
            return true;
        }

        return false;
    });

    return level;
}

class TreeNode {
    name: string;
    children: Array<TreeNode>;
    parent: TreeNode | undefined;

    constructor(name: string) {
        this.name = name;
        this.children = [];
        this.parent = undefined;
    }

    addChild(node: TreeNode) {
        this.children.push(node);
    }
}

class Tree {
    #root: TreeNode;

    constructor() {
        this.#root = new TreeNode("__root__");
    }

    #insertNode(name: string, parent: TreeNode): [boolean, TreeNode] {
        let created: boolean = false;
        let node = parent.children.find((node) => { return node.name == name; });
        if (node === undefined) {
            node = new TreeNode(name);
            node.parent = parent;
            parent.children.push(node);
            created = true;
        }

        return [created, node];
    }

    insertPath(path: Array<string>) {
        let parent = this.#root;
        let inserted = false;

        for (const path_segment of path) {
            let insertion;
            [insertion, parent] = this.#insertNode(path_segment, parent);
            inserted ||= insertion;
        }

        return inserted;
    }

    *walkDepthFirst() {
        const stack: Array<{ "node": TreeNode, "visited": boolean }> = [{ "node": this.#root, "visited": false }];
        let annotated_node;
        while (annotated_node = stack.at(-1)) {
            if (annotated_node.visited) {
                yield annotated_node.node;
                stack.pop();
            } else {
                annotated_node.visited = true;
                annotated_node.node.children.map((child) => { stack.push({ "node": child, "visited": false }); });
            }
        }
    }

    *walkLeafes() {
        const stack: Array<TreeNode> = [this.#root];
        let node;
        while (node = stack.pop()) {
            if (node.children.length) {
                stack.push(...node.children);
            } else {
                yield node;
            }
        }
    }

    getRoot() {
        return this.#root;
    }
}

function splitLogger(logger: string) {
    return logger.split(".");
}

/**
 * CSS rule writing algorithm:
 * 1.) Build logger tree / get all loggers (just use a hashmap, when a logger is actually inserted insert the parents)
 * 2.) for each logger write the following:
 *    
 *     for logger in loggers:
 *         css-selectors += "    .logfilter-hide-{logger}:not({",".join(".logfilter-show-{p}" for p in logger.parents)}) .log-{logger}"
 *         css-selectors += ".logfilter-hideweak-{logger}:not({",".join(".logfilter-show-{p}" for p in logger.parents)}) .log-{logger}"
 *         for parent in logger.parents:
 *             css-selectors += ".logfilter-hide-{parent}.logfilter-showweak-{logger}:not({",".join(".logfilter-show-{p}" for p in logger.parents if p != parent)}) .log-{logger}"
 */

function loggerNameFromNode(logger_node: TreeNode) {
    const logger_segments: Array<string> = [];

    let node = logger_node;
    while (node.parent !== undefined) {
        logger_segments.unshift(node.name);
        // TODO: sanatize node names: "-"" => "--" to avoid hacks where constructed logger names interfer with our class names
        node = node.parent;
    }

    const logger = logger_segments.join("-");
    return logger;
}

/**
 * Generate controls
 * 
 * 1) generate logger tree
 * 2) traverse the tree (depth first) and generate hide buttons which are level based
 */
class Log {
    #data: LogType;
    #table: HTMLTableElement;
    #table_body: HTMLTableSectionElement;
    #stylesheet: CSSStyleSheet;
    #logger_tree: Tree;

    constructor(table_container: HTMLElement, control_container: HTMLElement, log_data: LogType) {
        this.#data = log_data;
        [this.#table, this.#table_body] = this.createTable();
        table_container.appendChild(this.#table);

        this.#stylesheet = new CSSStyleSheet();
        document.adoptedStyleSheets.push(this.#stylesheet);

        this.#logger_tree = new Tree();

        for (const record of this.#data.records) {
            this.insertRow(record);
        }

        this.buildStylesheet();
        this.initializeFilters();

        control_container.appendChild(this.createControls());
    }

    initializeFilters() {
        // TODO: function to turn logger_node into logger name
        for (const logger_node of this.#logger_tree.walkDepthFirst()) {
            if (logger_node.parent === undefined) {
                break;
            }

            const logger = loggerNameFromNode(logger_node);

            for (const level of iterateEnum(LogLevel)) {
                this.#table_body.classList.add(`logfilter-show_weak-${level.toLowerCase()}-${logger}`);
            }
        }
    }

    buildStylesheet() {
        // TODO compare array<string> join vs string append with +=
        const css_selectors: Array<string> = [];

        for (const logger_node of this.#logger_tree.walkDepthFirst()) {
            if (logger_node.parent === undefined) {
                break;
            }

            const logger_segments: Array<string> = [];

            let node = logger_node;
            while (node.parent !== undefined) {
                logger_segments.unshift(node.name);
                // TODO: sanatize node names: "-"" => "--" to avoid hacks where constructed logger names interfer with our class names
                node = node.parent;
            }

            const logger = logger_segments.join("-");

            const logger_parents: Array<string> = [];

            for (let i = 1; i < logger_segments.length; ++i) {
                logger_parents.push(logger_segments.slice(0, i).join("-"));
            }

            for (let level of iterateEnum(LogLevel)) {
                level = level.toLowerCase();
                const log_scope = `.log-${logger}.loglevel-${level}`;

                const parent_show_selectors = logger_parents.map((parent) => { return `.logfilter-show-${level}-${parent}`; });
                const show_selectors_with_root = [`.logfilter-show-${level}`, ...parent_show_selectors];
                const negated_term = `:not(${show_selectors_with_root.join(", ")})`;

                css_selectors.push(`.logfilter-hide-${level}-${logger}${negated_term} ${log_scope}`);
                css_selectors.push(`.logfilter-hide_weak-${level}-${logger}${negated_term} ${log_scope}`);

                const negated_term2 = (parent_show_selectors.length) ? `:not(${parent_show_selectors.join(", ")})` : "";
                css_selectors.push(`.logfilter-hide-${level}.logfilter-show_weak-${level}-${logger}${negated_term2} ${log_scope}`);

                for (const parent of logger_parents) {
                    const cleaned_negated_term = `:not(${show_selectors_with_root.filter((selector) => { return selector != `.logfilter-show-${level}-${parent}`; }).join(", ")})`;
                    css_selectors.push(`.logfilter-hide-${level}-${parent}.logfilter-show_weak-${level}-${logger}${cleaned_negated_term} ${log_scope}`);
                }
            }
        }

        const css_rule = `${css_selectors.join(",\n")} { display: none; }`;
        console.log(css_rule);
        this.#stylesheet.replaceSync(css_rule);
    }

    cycleButton(event: MouseEvent) {
        const select = event.target as HTMLSelectElement;
        const previous_option = select.selectedOptions[0];
        const option_to_select = unwrap(select.options.item((select.options.selectedIndex + 1) % select.options.length));
        const label = select.labels[0];

        select.value = option_to_select.value;

        setText2(label, option_to_select.value);
        label.classList.remove(previous_option.className);
        label.classList.add(option_to_select.className);

        this.#table_body.classList.remove(previous_option.value);
        this.#table_body.classList.add(option_to_select.value);
    }

    changeButton(event: Event) {
        //console.log(`The event has resulted in option ${event.target.value} being selected`);

        //this.#table_body.classList.remove(previous_option.value);
        // TODO: store previous value as data, store level as data?
        const element = event.currentTarget as HTMLInputElement;
        const re = /logfilter-(show|hide)(_weak)?-/;
        const level = element.value.replace(re, "");
        this.#table_body.classList.remove(`logfilter-show_weak-${level}`, `logfilter-show-${level}`, `logfilter-hide_weak-${level}`, `logfilter-hide-${level}`);

        this.#table_body.classList.add(element.value);
    }

    makeButton(options: Array<SelectOption>): HTMLElement { //HTMLLabelElement {
        //const button = document.createElement("label");
        const select = document.createElement("ted-dropdown");

        for (const option_spec of options) {
            const option = document.createElement("option");
            option.innerText = option_spec.value;
            option.classList.add(...option_spec.class.split(" "));
            select.appendChild(option);
        }

        //select.value = options[0].value;

        // button.innerText = options[0].value;
        // button.classList.add("multibutton");

        // button.appendChild(select);
        select.addEventListener("change", this.changeButton.bind(this));
        //return button;
        return select;
    }

    createControls() {
        const button_bar = document.createElement("div");
        this.createControlTreeRecursive(button_bar, this.#logger_tree.getRoot());
        return button_bar;
    }

    createControlsButtonBar(logger: string) {
        // let button = document.createElement("div")
        // button.innerHTML = "click me!"
        // button.addEventListener("click", event => { addHiddenClass("loglevel-critical"); })
        // return button
        const button_bar = document.createElement("div");

        //for (let node=this.#logger_tree)
        for (let level of iterateEnum(LogLevel)) {
            level = level.toLowerCase();
            const button = this.makeButton(
                [
                    { "label": "show &#xf44b", "value": `logfilter-show-${level}${logger}`, "class": "logfilter-select-show" },
                    { "label": "show (weak)", "value": `logfilter-show_weak-${level}${logger}`, "class": "logfilter-select-show_weak" },
                    { "label": "hide (weak)", "value": `logfilter-hide_weak-${level}${logger}`, "class": "logfilter-select-hide_weak" },
                    { "label": "hide", "value": `logfilter-hide-${level}${logger}`, "class": "logfilter-select-hide" },
                ]
            );

            button_bar.appendChild(button);
        }

        return button_bar;
    }

    createControlTreeRecursive(html_parent: HTMLElement, node: TreeNode) {
        const container = document.createElement("div");
        container.innerText = node.name;

        const logger_name = loggerNameFromNode(node);

        container.appendChild(this.createControlsButtonBar(logger_name != "" ? `-${logger_name}` : ""));

        for (const child of node.children) {
            this.createControlTreeRecursive(container, child);
        }

        html_parent.appendChild(container);
    }

    createTable(): [HTMLTableElement, HTMLTableSectionElement] {
        const table = document.createElement("table");
        table.classList.add("logview");

        const tableHead = document.createElement("thead");
        tableHead.innerHTML = "<tr><th>logger</th><th>level</th><th>message</th></tr>";
        table.appendChild(tableHead);

        const tableBody = document.createElement("tbody");
        table.appendChild(tableBody);

        //TODO: remove:
        //tableBody.classList.add("logfilter-show_weak-warn-A", "logfilter-hide_weak-warn-A-B", "logfilter-show_weak-warn-A-B-C", "logfilter-show-warn-A-X")

        return [table, tableBody];
    }

    #loggername_to_class(logger_name: string) {
        return "log-" + logger_name.replaceAll(".", "-");
    }

    insertRow(record: LogRecord) {
        const level_category = LogLevel[toLevelCategory(record.level)];

        const row = document.createElement("tr");

        row.classList.add(
            `loglevel-${level_category.toLowerCase()}`,
            this.#loggername_to_class(record.logger)
        );
        row.insertCell().innerText = record.logger + "-" + this.#loggername_to_class(record.logger);
        row.insertCell().innerHTML = `<p>${level_category}</p>`;
        row.insertCell().innerText = record.message;

        this.#table_body.appendChild(row);

        return this.#logger_tree.insertPath(splitLogger(record.logger));
    }
}

function unwrap<T>(item: T | null | undefined, message?: string): T | never {
    if (item === undefined || item === null) {
        throw new Error(message ?? "Item undefined or null");
    }

    return item;
}

function setText2(node: HTMLElement, text: string) { // TODO: remove (is a duplicate function also present in dropdonwbutton)
    const text_nodes = [...node.childNodes].filter((childNode) => {
        return (childNode.nodeType === Node.TEXT_NODE);
    });

    text_nodes.forEach((text_node: ChildNode) => { text_node.textContent = ""; });
    text_nodes[0].textContent = text;
}

const logNode = document.getElementById("logview");
if (logNode == null) {
    console.log("Error: failed to locate log node.");
} else {
    const controlNode = document.getElementById("controls");
    if (controlNode == null) {
        console.log("Error: failed to locate log node.");
    } else {
        const y = new Log(logNode,
            controlNode,
            {
                records: [
                    { message: "Hello", level: 0, logger: "A" },
                    { message: "Godbye", level: 9, logger: "A.B" },
                    { message: "Godbye", level: 10, logger: "A.X" },
                    { message: "Well then", level: 55, logger: "A.B.C" },
                    { message: "Hello", level: 22, logger: "A" },
                    { message: "Godbye", level: 29, logger: "A.B" },
                    { message: "Godbye", level: 20, logger: "A.X" },
                    { message: "Well then", level: 25, logger: "A.B.C" },
                    { message: "Hello", level: 30, logger: "A" },
                    { message: "Godbye", level: 39, logger: "A.B" },
                    { message: "Godbye", level: 30, logger: "A.X" },
                    { message: "Well then", level: 35, logger: "A.B.C" },
                ]
            }
        );
    }
}