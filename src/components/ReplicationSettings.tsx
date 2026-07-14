import React from 'react';
import { Select } from 'antd';

const ReplicationSettings = () => {
  const [compression, setCompression] = React.useState('none');

  return (
    <div>
      <Select
        value={compression}
        onChange={(value) => setCompression(value)}
      >
        <Select.Option value="none">None</Select.Option>
        <Select.Option value="zstd">Zstd</Select.Option>
        <Select.Option value="gzip">Gzip</Select.Option>
      </Select>
    </div>
  );
};