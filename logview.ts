// TODO: we should specify a log json format...
type JSONValue =
    | string
    | number
    | boolean
    | { [x: string]: JSONValue }
    | Array<JSONValue>;

type LogType = {
    records: Array<LogRecord>;
};

type LogRecord = {
    message: string;
    level: number;
    logger: string;
};

enum LogLevel {
    NOTSET = 0,
    DEBUG = 10,
    INFO = 20,
    WARN = 30,
    ERROR = 40,
    CRITICAL = 50,
}

type SelectOption = {
    value: string;
    class: string;
};

function toLevelCategory(numeric_level: number): LogLevel {
    let level: LogLevel = LogLevel.NOTSET;

    Object.keys(LogLevel).every((key, index) => {
        const key_index = Number(key)

        // Once we reach the text keys we are done
        if (isNaN(key_index)) {
            return false;
        }

        if (key_index <= numeric_level) {
            level = key_index;
            return true;
        }

        return false;
    })

    return level;
}

function addHiddenClass(baseclass: string) {
    for (const element of document.getElementsByClassName(baseclass)) {
        element.classList.toggle("hide");
    }
}

class Log {
    #data: LogType
    #table: HTMLTableElement
    #table_body: HTMLTableSectionElement

    constructor(table_container: HTMLElement, control_container: HTMLElement, log_data: LogType) {
        this.#data = log_data;
        [this.#table, this.#table_body] = this.createTable()
        table_container.appendChild(this.#table)

        for (const record of this.#data.records) {
            this.insertRow(record);
        }

        control_container.appendChild(this.createControls())
    }

    makeButton(options: Array<SelectOption>): HTMLLabelElement {
        const button = document.createElement("label")
        const select = document.createElement("select")

        for (const option_spec of options) {
            const option = document.createElement("option")
            option.innerText = option_spec.value
            option.classList.add(option_spec.class)
            select.appendChild(option)
        }

        select.value = options[0].value

        return button
    }

    createControls() {
        let button = document.createElement("div")
        button.innerHTML = "click me!"
        button.addEventListener("click", event => { addHiddenClass("loglevel-critical"); })
        return button
    }

    createTable(): [HTMLTableElement, HTMLTableSectionElement] {
        let table = document.createElement('table')

        let tableHead = document.createElement('thead')
        tableHead.innerHTML = '<tr><th>Hello</th></tr>'
        table.appendChild(tableHead)

        let tableBody = document.createElement('tbody')
        table.appendChild(tableBody)

        return [table, tableBody]
    }

    #loggername_to_class(logger_name: string) {
        return "log-" + logger_name.replaceAll(".", "-")
    }

    insertRow(record: LogRecord) {
        let level_category = LogLevel[toLevelCategory(record.level)]

        let row = document.createElement('tr')

        row.classList.add(
            `loglevel-${level_category.toLowerCase()}`,
            this.#loggername_to_class(record.logger)
        )
        row.insertCell().innerText = record.logger + "-" + this.#loggername_to_class(record.logger)
        row.insertCell().innerText = level_category
        row.insertCell().innerText = record.message

        this.#table_body.appendChild(row)
    }
}

function unwrap<T>(item: T | null | undefined, message?: string): T | never {
    if (item === undefined || item === null) {
        throw new Error(message ?? "Item undefined or null")
    }

    return item
}

function setText(node: HTMLElement, text: string) {
    const text_nodes = [...node.childNodes].filter((childNode) => {
        return (childNode.nodeType === Node.TEXT_NODE)
    })

    text_nodes.forEach((text_node: ChildNode) => { text_node.textContent = "" });
    text_nodes[0].textContent = text;
}

function cycleButton(event: MouseEvent) {
    const select = event.target as HTMLSelectElement
    const previous_option = select.selectedOptions[0]
    const option_to_select = unwrap(select.options.item((select.options.selectedIndex + 1) % select.options.length))
    const label = select.labels[0]

    select.value = option_to_select.value

    setText(label, option_to_select.value)
    label.classList.remove(previous_option.className)
    label.classList.add(option_to_select.className)
}

let logNode = document.getElementById("logview")
if (logNode == null) {
    console.log("Error: failed to locate log node.")
} else {
    let controlNode = document.getElementById("controls")
    if (controlNode == null) {
        console.log("Error: failed to locate log node.")
    } else {
        new Log(logNode,
            controlNode,
            {
                records: [
                    { message: "Hello", level: 0, logger: "A" },
                    { message: "Godbye", level: 9, logger: "A.B" },
                    { message: "Godbye", level: 10, logger: "A.X" },
                    { message: "Well then", level: 55, logger: "A.B.C" },
                ]
            }
        );
    }
}

for (const element of document.getElementsByTagName('select')) {
    element.addEventListener("click", cycleButton)
}
