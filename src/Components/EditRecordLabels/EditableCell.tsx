import React, { useState, useEffect } from "react";
import { Input } from "antd";

interface EditableCellProps {
  title: any;
  editable: boolean;
  children: React.ReactNode;
  dataIndex: string;
  record: any;
  handleSave?: (record: any) => void;
  [key: string]: any;
}

const EditableCell: React.FC<EditableCellProps> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  ...restProps
}) => {
  const [value, setValue] = useState(record?.[dataIndex] ?? "");

  useEffect(() => {
    setValue(record?.[dataIndex] ?? "");
  }, [record?.[dataIndex]]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (handleSave) {
      handleSave({ ...record, [dataIndex]: newValue });
    }
  };

  if (editable) {
    return (
      <td {...restProps}>
        <Input
          value={value}
          onChange={handleChange}
          placeholder={dataIndex === "key" ? "Enter key" : "Enter value"}
          className="editInput"
          variant="borderless"
        />
      </td>
    );
  }

  return <td {...restProps}>{children}</td>;
};

export default EditableCell;
