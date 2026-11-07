import * as React from "react";

export interface SearchBoxProps {
    onChange: (value: string) => void;
    placeholder?: string;
}

export type Props = SearchBoxProps;

// Lesson 3.11: SearchBox React Component with onChange function prop
export function SearchBox(props: SearchBoxProps) {
    const [searchValue, setSearchValue] = React.useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchValue(value);
        props.onChange(value);
    };

    const handleClear = () => {
        setSearchValue("");
        props.onChange("");
    };

    return (
        <div className="search-input-pill projects-search-box">
            <span className="material-icons-round">search</span>
            <input
                type="text"
                placeholder={props.placeholder || "Search projects by name, description, or role..."}
                value={searchValue}
                onChange={handleInputChange}
            />
            {searchValue.trim().length > 0 && (
                <button
                    type="button"
                    className="btn-clear-search"
                    id="clear-search-btn"
                    title="Clear search text"
                    onClick={handleClear}
                >
                    <span className="material-icons-round">close</span>
                </button>
            )}
        </div>
    );
}

