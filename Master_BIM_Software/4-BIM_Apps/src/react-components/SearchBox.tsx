import * as React from "react";

export interface SearchBoxProps {
    onChange: (value: string) => void;
    placeholder?: string;
}

export type Props = SearchBoxProps;

// Module 04 — Lesson 2.2: SearchBox with That Open Engine <bim-text-input> & native debounce
export function SearchBox(props: SearchBoxProps) {
    const handleInput = (e: any) => {
        const val = e.target?.value ?? "";
        props.onChange(val);
    };

    return (
        <div className="projects-search-box" style={{ minWidth: "280px" }}>
            <bim-text-input
                placeholder={props.placeholder || "Search projects by name, description, or role..."}
                debounce={200}
                oninput={handleInput}
            ></bim-text-input>
        </div>
    );
}

