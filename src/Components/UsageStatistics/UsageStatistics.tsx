import React from "react";
import { Row, Col, Statistic } from "antd";
import { ServerInfo } from "reduct-js";
import humanizeDuration from "humanize-duration";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import { bigintToNumber } from "../../Helpers/NumberUtils";

interface UsageStatisticsProps {
  info: ServerInfo;
}

const UsageStatistics: React.FC<UsageStatisticsProps> = ({ info }) => (
  <Row gutter={16}>
    <Col span={8}>
      <Statistic
        title="Usage"
        value={prettierBytes(bigintToNumber(info.usage))}
      />
    </Col>
    <Col span={8}>
      <Statistic title="Buckets" value={bigintToNumber(info.bucketCount)} />
    </Col>
    <Col span={8}>
      <Statistic
        title="Uptime"
        value={humanizeDuration(bigintToNumber(info.uptime) * 1000, {
          largest: 1,
        })}
      />
    </Col>
  </Row>
);

export default UsageStatistics;
