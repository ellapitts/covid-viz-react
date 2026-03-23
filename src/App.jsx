import { useEffect, useState, useRef } from "react";
import Plotly from "plotly.js-dist-min";

const COLORS = [
  "#4ea8ff",
  "#f97316",
  "#22d3ee",
  "#a78bfa",
  "#34d399",
  "#fb7185",
  "#fbbf24",
  "#60a5fa",
  "#e879f9",
  "#4ade80",
];

const COUNTRIES = [
  { label: "United States", api: "USA" },
  { label: "United Kingdom", api: "UK" },
  { label: "Germany", api: "Germany" },
  { label: "Brazil", api: "Brazil" },
  { label: "Canada", api: "Canada" },
  { label: "Mexico", api: "Mexico" },
  { label: "Ireland", api: "Ireland" },
  { label: "China", api: "China" },
  { label: "Russia", api: "Russia" },
  { label: "Australia", api: "Australia" },
];

const LAYOUT = (yLabel) => ({
  paper_bgcolor: "transparent",
  plot_bgcolor: "#111",
  font: { color: "#aaa" },
  xaxis: { gridcolor: "#2a2a2a", zerolinecolor: "#333" },
  yaxis: { title: yLabel, gridcolor: "#2a2a2a", zerolinecolor: "#333" },
  legend: { bgcolor: "transparent", font: { color: "#aaa" } },
  margin: { t: 30, r: 20, b: 60, l: 60 },
  hovermode: "closest",
  autosize: true,
});

const CONFIG = { responsive: true, displayModeBar: false };

function PlotlyChart({ traces, yLabel, height = 400 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !traces.length) return;
    Plotly.newPlot(ref.current, traces, LAYOUT(yLabel), CONFIG);
    return () => Plotly.purge(ref.current);
  }, [traces, yLabel]);
  return <div ref={ref} style={{ width: "100%", height }} />;
}

export default function App() {
  const [lineTraces, setLineTraces] = useState([]);
  const [barTrace, setBarTrace] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch historical cases for each country in parallel
        const historical = await Promise.all(
          COUNTRIES.map((c) =>
            fetch(
              `https://disease.sh/v3/covid-19/historical/${c.api}?lastdays=all`,
            ).then((r) => r.json()),
          ),
        );

        const lines = historical.map((res, i) => {
          const timeline = res.timeline?.cases ?? {};
          const dates = Object.keys(timeline);
          // Convert cumulative to daily new cases
          const daily = dates.map((d, j) =>
            j === 0 ? 0 : Math.max(0, timeline[d] - timeline[dates[j - 1]]),
          );
          return {
            type: "scatter",
            mode: "lines",
            name: COUNTRIES[i].label,
            x: dates,
            y: daily,
            line: { color: COLORS[i % COLORS.length], width: 2 },
          };
        });

        // Fetch totals for bar chart
        const totals = await fetch(
          `https://disease.sh/v3/covid-19/countries?countries=${COUNTRIES.map((c) => c.api).join(",")}`,
        ).then((r) => r.json());

        const sorted = totals
          .map((c) => ({
            label:
              COUNTRIES.find(
                (x) => x.api === c.countryInfo?.iso2 || x.label === c.country,
              )?.label ?? c.country,
            deathsPerMillion: c.deathsPerOneMillion ?? 0,
          }))
          .sort((a, b) => b.deathsPerMillion - a.deathsPerMillion);

        setBarTrace([
          {
            type: "bar",
            x: sorted.map((d) => d.label),
            y: sorted.map((d) => d.deathsPerMillion),
            marker: { color: sorted.map((_, i) => COLORS[i % COLORS.length]) },
          },
        ]);

        setLineTraces(lines);
        setLoading(false);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (error)
    return (
      <div style={styles.center}>
        <p style={{ color: "#f87171" }}>⚠️ {error}</p>
      </div>
    );

  if (loading)
    return (
      <div style={styles.center}>
        <p>Loading live data…</p>
        <p style={{ color: "#555", fontSize: "0.85rem", marginTop: 8 }}>
          Fetching from disease.sh API
        </p>
      </div>
    );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>🦠 COVID-19 Global Dashboard</h1>
        <p style={styles.subtitle}>
          Live data from{" "}
          <a
            href="https://disease.sh"
            style={styles.link}
            target="_blank"
            rel="noreferrer"
          >
            disease.sh
          </a>
          &nbsp;·&nbsp; 10 countries compared
        </p>
      </header>

      <div style={styles.grid}>
        <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
          <h2 style={styles.cardTitle}>Daily New Cases</h2>
          <p style={styles.hint}>
            Click legend to toggle · drag to zoom · double-click to reset
          </p>
          <PlotlyChart traces={lineTraces} yLabel="New Cases" />
        </div>

        <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
          <h2 style={styles.cardTitle}>Total Deaths per Million</h2>
          <p style={styles.hint}>Sorted by highest deaths per million</p>
          <PlotlyChart
            traces={barTrace}
            yLabel="Deaths per Million"
            height={380}
          />
        </div>
      </div>

      <footer style={styles.footer}>
        Built with React + Plotly.js · Data from disease.sh
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f0f0f",
    color: "#e0e0e0",
    fontFamily: "Inter, sans-serif",
    padding: "0 0 40px",
  },
  header: { padding: "40px 40px 20px", borderBottom: "1px solid #222" },
  title: { fontSize: "2rem", margin: 0, fontWeight: 700 },
  subtitle: { margin: "8px 0 0", color: "#888", fontSize: "0.95rem" },
  link: { color: "#4ea8ff", textDecoration: "none" },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    padding: "32px 40px",
  },
  card: {
    background: "#1a1a1a",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #2a2a2a",
  },
  cardTitle: { fontSize: "1.1rem", margin: "0 0 6px", fontWeight: 600 },
  hint: { fontSize: "0.8rem", color: "#666", margin: "0 0 16px" },
  footer: {
    textAlign: "center",
    color: "#444",
    fontSize: "0.85rem",
    paddingTop: "20px",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#0f0f0f",
    color: "#888",
    fontSize: "1.2rem",
  },
};
