type ReportCallback = (metric: {
  name: string;
  value: number;
  rating: string;
  delta: number;
  id: string;
  entries: PerformanceEntry[];
  navigationType: string;
}) => void;

const reportWebVitals = (onPerfEntry?: ReportCallback) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import("web-vitals").then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onINP(onPerfEntry);
      onFCP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
