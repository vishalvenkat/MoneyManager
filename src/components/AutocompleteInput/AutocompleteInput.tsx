import React, { useState, useEffect, useRef } from 'react';
import './AutocompleteInput.css';

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  suggestions,
  placeholder,
  className = ''
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const userInput = e.target.value;
    onChange(userInput);

    const filtered = suggestions.filter(
      suggestion => suggestion.toLowerCase().includes(userInput.toLowerCase())
    );

    setFilteredSuggestions(filtered);
    setActiveSuggestionIndex(0);
    setShowSuggestions(true);
  };

  const handleClick = (suggestion: string) => {
    setFilteredSuggestions([]);
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (showSuggestions && filteredSuggestions.length > 0) {
        e.preventDefault();
        handleClick(filteredSuggestions[activeSuggestionIndex]);
      }
    } else if (e.key === 'ArrowUp') {
      if (showSuggestions) {
        e.preventDefault(); // Prevent cursor movement
        if (activeSuggestionIndex === 0) return;
        setActiveSuggestionIndex(activeSuggestionIndex - 1);
      }
    } else if (e.key === 'ArrowDown') {
      if (showSuggestions) {
        e.preventDefault(); // Prevent cursor movement
        if (activeSuggestionIndex === filteredSuggestions.length - 1) return;
        setActiveSuggestionIndex(activeSuggestionIndex + 1);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleFocus = () => {
    if (value.trim() === '') {
      // Show all top suggestions if empty, limit to 20 for performance
      setFilteredSuggestions(suggestions.slice(0, 20));
    } else {
      setFilteredSuggestions(
        suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
      );
    }
    setShowSuggestions(true);
  };

  return (
    <div className={`autocomplete-wrapper ${className}`} ref={wrapperRef}>
      <input
        type="text"
        className="form-input"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="autocomplete-suggestions">
          {filteredSuggestions.map((suggestion, index) => {
            let itemClass = "suggestion-item";
            if (index === activeSuggestionIndex) {
              itemClass += " suggestion-active";
            }
            return (
              <li
                className={itemClass}
                key={suggestion}
                onClick={() => handleClick(suggestion)}
              >
                {suggestion}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
