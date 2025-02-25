import React from "react";
import { Row, Col, Statistic } from "antd";
import { ServerInfo, BucketInfo } from "reduct-js";
import humanizeDuration from "humanize-duration";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import { bigintToNumber } from "../../Helpers/NumberUtils";

interface UsageStatisticsProps {
  info: ServerInfo;
  buckets: BucketInfo[];
}

const UsageStatistics: React.FC<UsageStatisticsProps> = ({ info, buckets }) => (
  <Row gutter={16}>
    <Col span={8}>
      <Statistic
        title="Usage"
        value={prettierBytes(bigintToNumber(info.usage))}
      />
    </Col>
    <Col span={8}>
      <Statistic title="Buckets" value={buckets.length} />
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
