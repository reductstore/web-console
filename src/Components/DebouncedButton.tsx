import React, { useRef, useState } from "react";
import { Button } from "antd";
import { ButtonProps } from "antd/es/button";

interface DebouncedButtonProps extends Omit<ButtonProps, "onClick"> {
  onClick: () => void;
  debounceMs?: number;
}

export default function DebouncedButton({
  onClick,
  debounceMs = 300,
  disabled,
  ...buttonProps
}: DebouncedButtonProps) {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const handleClick = () => {
    if (isDebouncing) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    onClick();

    setIsDebouncing(true);
    debounceTimeoutRef.current = setTimeout(() => {
      setIsDebouncing(false);
    }, debounceMs);
  };

  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Button
      {...buttonProps}
      disabled={disabled || isDebouncing}
      onClick={handleClick}
    />
  );
}
