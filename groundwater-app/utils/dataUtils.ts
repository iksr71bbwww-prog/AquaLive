// utils/dataUtils.ts
export type RowRaw = {
  date: string | Date | null;
  lat: number | null;
  long: number | null;
  waterlevel: number | null;
};

export type TimePoint = {
  date: Date;
  waterlevel: number;
};

export type Well = {
  id: string;
  lat: number;
  long: number;
  timeseries: TimePoint[];
};

export type LinearRegression = {
  slope: number;     // units: waterlevel per year
  intercept: number;
} | null;

export type Severity = 'ok' | 'warning' | 'critical';

export type WellStats = {
  id: string;
  lat: number;
  long: number;
  timeseries: TimePoint[];
  lastMeasurement: TimePoint;
  linearRegression: LinearRegression;
  tenYearAvg: number | null;
  pctDrop: number | null;
  severity: Severity;
  forecast: TimePoint[]; // next N years
};

export function roundCoord(v: number, prec = 6) {
  return Number(v.toFixed(prec));
}

export function makeWellId(lat: number, lon: number, prec = 6) {
  return `${roundCoord(lat, prec)}_${roundCoord(lon, prec)}`;
}

export function groupRowsByWell(rows: RowRaw[]): Record<string, Well> {
  const wells: Record<string, Well> = {};
  rows.forEach(r => {
    if (!r.date || r.lat === null || r.long === null || r.waterlevel === null) return;
    const lat = Number(r.lat);
    const lon = Number(r.long);
    const id = makeWellId(lat, lon);
    if (!wells[id]) {
      wells[id] = { id, lat: roundCoord(lat), long: roundCoord(lon), timeseries: [] };
    }
    const d = new Date(r.date);
    if (isNaN(d.getTime())) return;
    wells[id].timeseries.push({ date: d, waterlevel: Number(r.waterlevel) });
  });

  // sort time series
  Object.values(wells).forEach(w => {
    w.timeseries.sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  return wells;
}

// convert date to decimal year (e.g., 2003.42)
export function dateToDecimalYear(d: Date) {
  const year = d.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  return year + (d.getTime() - start) / (end - start);
}

export function linearRegression(timeseries: TimePoint[]): LinearRegression {
  const n = timeseries.length;
  if (n < 2) return null;
  const xs = timeseries.map(p => dateToDecimalYear(p.date));
  const ys = timeseries.map(p => p.waterlevel);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) * (xs[i] - meanX);
  }
  if (den === 0) return { slope: 0, intercept: meanY };
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

export function classifySeverity(params: { slope: number | null; pctDrop: number | null }): Severity {
  const slope = params.slope ?? 0;
  const pctDrop = params.pctDrop;

  // Tune these thresholds for your domain
  if ((pctDrop !== null && pctDrop >= 20) || slope <= -0.5) return 'critical';
  if ((pctDrop !== null && pctDrop >= 10) || slope <= -0.1) return 'warning';
  return 'ok';
}

export function computeWellStats(well: Well, forecastYears = 5): WellStats | null {
  const ts = well.timeseries;
  if (!ts || ts.length === 0) return null;
  const last = ts[ts.length - 1];
  const lr = linearRegression(ts);
  const mostRecentYear = dateToDecimalYear(last.date);
  const cutoffYear = mostRecentYear - 10;
  const last10 = ts.filter(p => dateToDecimalYear(p.date) >= cutoffYear);
  const tenYearAvg = last10.length ? last10.reduce((s, p) => s + p.waterlevel, 0) / last10.length : null;

  let pctDrop: number | null = null;
  if (tenYearAvg !== null && tenYearAvg !== 0) {
    pctDrop = ((tenYearAvg - last.waterlevel) / tenYearAvg) * 100; // positive = drop
  }

  const severity = classifySeverity({ slope: lr ? lr.slope : null, pctDrop });

  // simple linear forecast using slope & intercept (if available)
  const forecast: TimePoint[] = [];
  if (lr) {
    for (let i = 1; i <= forecastYears; i++) {
      const futureYear = mostRecentYear + i;
      const y = lr.slope * futureYear + lr.intercept;
      const futureDate = new Date(last.date);
      futureDate.setFullYear(futureDate.getFullYear() + i);
      forecast.push({ date: futureDate, waterlevel: y });
    }
  }

  return {
    id: well.id,
    lat: well.lat,
    long: well.long,
    timeseries: ts,
    lastMeasurement: last,
    linearRegression: lr,
    tenYearAvg,
    pctDrop,
    severity,
    forecast,
  };
}
