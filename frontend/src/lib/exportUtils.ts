/**
 * VELTRIX SCADA Dashboard — Export Utilities
 * -------------------------------------------
 * Comprehensive export module supporting PDF, Excel, CSV, and screenshot
 * exports of machine telemetry, anomalies, recommendations, and AI
 * prediction data. Also persists report metadata to the `reports`
 * Supabase table.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

import { supabase } from './supabase';
import type {
  ExportData,
  ExportType,
  Machine,
  SensorReading,
  Anomaly,
  Recommendation,
  AIPrediction,
} from '../types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Dark-theme palette used throughout the PDF reports. */
const COLORS = {
  bg: [11, 15, 26] as [number, number, number],
  panel: [17, 24, 39] as [number, number, number],
  text: [229, 231, 235] as [number, number, number],
  muted: [156, 163, 175] as [number, number, number],
  accent: [59, 130, 246] as [number, number, number],
  border: [55, 65, 81] as [number, number, number],
};

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */

/** Returns the current UTC date as `YYYY-MM-DD`. */
export const timestamp = (): string => new Date().toISOString().slice(0, 10);

/**
 * Sanitizes a free-form string into a safe filename component.
 * Spaces and any character that is not alphanumeric, dash, or dot
 * is collapsed to a single underscore.
 */
export const sanitizeFilename = (name: string): string =>
  name
    .trim()
    .replace(/[^a-zA-Z0-9.\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'export';

/**
 * Triggers a browser download for the given blob by creating a
 * temporary anchor element and clicking it. The anchor is removed
 * immediately after the click.
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke on the next tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/* ------------------------------------------------------------------ */
/*  PDF helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Builds a properly-typed options object for `jspdf-autotable`.
 *
 * The color arrays MUST be typed as `[number, number, number]` tuples
 * (not `number[]`) so the autotable typings accept them. Centralizing
 * the options here keeps every table visually consistent.
 */
const autoTableOpts = (head: string[][], body: string[][], fontSize: number = 9) => ({
  theme: 'striped' as const,
  headStyles: {
    fillColor: COLORS.panel,
    textColor: COLORS.muted,
  },
  bodyStyles: {
    textColor: COLORS.text,
    fillColor: COLORS.bg,
  },
  alternateRowStyles: {
    fillColor: COLORS.panel,
  },
  styles: {
    fontSize,
    cellPadding: 3,
    lineColor: COLORS.border,
    lineWidth: 0.1,
  },
  head,
  body,
});

/** Paints a full-page dark background onto the jsPDF document. */
const paintBackground = (doc: jsPDF): void => {
  const { width, height } = doc.internal.pageSize;
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, width, height, 'F');
};

/** Draws the VELTRIX header block and returns the Y cursor below it. */
const drawHeader = (doc: jsPDF, machine: Machine, exportDate: string): number => {
  const { width } = doc.internal.pageSize;
  let y = 16;

  // Accent bar
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 0, width, 4, 'F');

  // Logo / brand text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.text);
  doc.text('VELTRIX', 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text('SCADA Diagnostic Report', 14, y + 6);

  // Right-aligned machine name + date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.text);
  doc.text(machine.name, width - 14, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Exported: ${exportDate}`, width - 14, y + 6, { align: 'right' });

  // Divider
  y += 12;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(14, y, width - 14, y);

  return y + 8;
};

/** Draws a section heading and returns the Y cursor below it. */
const drawSectionTitle = (doc: jsPDF, title: string, y: number): number => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.accent);
  doc.text(title, 14, y);
  // Underline accent
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.4);
  doc.line(14, y + 2, 14 + doc.getTextWidth(title), y + 2);
  return y + 6;
};

/** Draws the machine info block as a key/value table. */
const drawMachineInfo = (doc: jsPDF, data: ExportData, y: number): number => {
  const { machine, limits } = data;
  const rows: string[][] = [
    ['Name', machine.name],
    ['Location', machine.location || '—'],
    ['Description', machine.description || '—'],
    ['Status', machine.status.toUpperCase()],
    ['Vibration Limits (RMS)', `${limits.rmsMin} – ${limits.rmsMax}`],
    ['Temperature Limits (°C)', `${limits.tempMin} – ${limits.tempMax}`],
    ['Current Limits (A)', `${limits.currentMin} – ${limits.currentMax}`],
  ];

  autoTable(doc, autoTableOpts([['Field', 'Value']], rows, 9));

  // autoTable advances the cursor internally; read final Y.
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  return finalY + 10;
};

/** Formats a sensor reading timestamp into a readable string. */
const fmtTime = (ts: number): string => new Date(ts).toLocaleString();

/** Builds the sensor-readings table rows. */
const readingsRows = (readings: SensorReading[]): string[][] =>
  readings.map((r) => [
    fmtTime(r.timestamp),
    r.vibration.toFixed(3),
    `${r.temperature.toFixed(1)} °C`,
    `${r.current.toFixed(2)} A`,
    `${r.rpm.toFixed(0)}`,
    `${r.frequency.toFixed(2)} Hz`,
  ]);

/** Builds the anomalies table rows. */
const anomalyRows = (anomalies: Anomaly[]): string[][] =>
  anomalies.map((a) => [
    a.type,
    a.severity.toUpperCase(),
    a.message,
    a.value.toFixed(2),
    a.threshold.toFixed(2),
  ]);

/** Builds the recommendations table rows. */
const recommendationRows = (recs: Recommendation[]): string[][] =>
  recs.map((r) => [
    r.priority.toUpperCase(),
    r.action,
    r.component,
    r.eta,
    r.description,
  ]);

/** Draws the AI prediction summary block. */
const drawAIPrediction = (doc: jsPDF, ai: AIPrediction | null, y: number): number => {
  if (!ai) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text('No AI prediction data available for this report.', 14, y);
    return y + 8;
  }

  const rows: string[][] = [
    ['Bearing Wear', `${(ai.bearingWear * 100).toFixed(1)} %`],
    ['Overheat Risk', `${(ai.overheatRisk * 100).toFixed(1)} %`],
    ['Failure Risk', `${(ai.failureRisk * 100).toFixed(1)} %`],
    ['Remaining Useful Life', `${ai.rulHours.toFixed(0)} h`],
    ['Confidence', `${(ai.confidence * 100).toFixed(1)} %`],
    ['Trend', ai.trend],
    ['Last Updated', fmtTime(ai.lastUpdate)],
  ];

  autoTable(doc, autoTableOpts([['Metric', 'Value']], rows, 9));
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  return finalY + 10;
};

/** Draws a footer with page numbers on every page. */
const drawFooters = (doc: jsPDF): void => {
  const { width, height } = doc.internal.pageSize;
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `VELTRIX SCADA  •  Page ${i} of ${pages}  •  Generated ${timestamp()}`,
      width / 2,
      height - 8,
      { align: 'center' },
    );
  }
};

/* ------------------------------------------------------------------ */
/*  Export: PDF                                                        */
/* ------------------------------------------------------------------ */

/**
 * Builds a professional A4 PDF report containing the machine info,
 * sensor readings, anomalies, recommendations, and AI prediction
 * summary. Uses a dark theme throughout.
 */
export const exportPDF = async (data: ExportData): Promise<Blob> => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const { width, height } = doc.internal.pageSize;
  const usableHeight = height - 20; // leave room for footer

  paintBackground(doc);

  let y = drawHeader(doc, data.machine, data.exportedAt || timestamp());

  // --- Machine Info -------------------------------------------------
  y = drawSectionTitle(doc, 'Machine Information', y);
  y = drawMachineInfo(doc, data, y);

  // Helper to start a new page when running out of space.
  const ensureSpace = (needed: number) => {
    if (y + needed > usableHeight) {
      doc.addPage();
      paintBackground(doc);
      y = 20;
    }
  };

  // --- Sensor Readings ---------------------------------------------
  ensureSpace(40);
  y = drawSectionTitle(doc, 'Sensor Readings', y);
  autoTable(doc, autoTableOpts(
    [['Timestamp', 'Vibration', 'Temperature', 'Current', 'RPM', 'Frequency']],
    readingsRows(data.readings),
  ));
  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;

  // --- Anomalies ----------------------------------------------------
  ensureSpace(40);
  y = drawSectionTitle(doc, 'Anomalies', y);
  if (data.anomalies.length > 0) {
    autoTable(doc, autoTableOpts(
      [['Type', 'Severity', 'Message', 'Value', 'Threshold']],
      anomalyRows(data.anomalies),
    ));
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text('No anomalies detected during the reporting period.', 14, y);
    y += 12;
  }

  // --- Recommendations ---------------------------------------------
  ensureSpace(40);
  y = drawSectionTitle(doc, 'Recommendations', y);
  if (data.recommendations.length > 0) {
    autoTable(doc, autoTableOpts(
      [['Priority', 'Action', 'Component', 'ETA', 'Description']],
      recommendationRows(data.recommendations),
    ));
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text('No recommendations at this time.', 14, y);
    y += 12;
  }

  // --- AI Prediction ------------------------------------------------
  ensureSpace(50);
  y = drawSectionTitle(doc, 'AI Prediction Summary', y);
  y = drawAIPrediction(doc, data.aiPrediction, y);

  drawFooters(doc);

  return doc.output('blob');
};

/* ------------------------------------------------------------------ */
/*  Export: Excel                                                     */
/* ------------------------------------------------------------------ */

/** Converts an array of records into an array-of-arrays with a header row. */
const toAOA = <T extends Record<string, unknown>>(
  headers: (keyof T)[],
  rows: T[],
): (string | number)[][] => [
  headers as string[],
  ...rows.map((r) => headers.map((h) => r[h] as string | number)),
];

/**
 * Builds a multi-sheet Excel workbook:
 *   - Readings
 *   - Anomalies
 *   - Recommendations
 *   - AI Prediction
 */
export const exportExcel = async (data: ExportData): Promise<Blob> => {
  const workbook = XLSX.utils.book_new();

  // --- Sheet 1: Readings --------------------------------------------
  const readingsAOA: (string | number)[][] = [
    ['Timestamp', 'Vibration (RMS)', 'Temperature (°C)', 'Current (A)', 'RPM', 'Frequency (Hz)'],
    ...data.readings.map((r) => [
      new Date(r.timestamp).toISOString(),
      Number(r.vibration.toFixed(3)),
      Number(r.temperature.toFixed(1)),
      Number(r.current.toFixed(2)),
      Number(r.rpm.toFixed(0)),
      Number(r.frequency.toFixed(2)),
    ]),
  ];
  const wsReadings = XLSX.utils.aoa_to_sheet(readingsAOA);
  XLSX.utils.book_append_sheet(workbook, wsReadings, 'Readings');

  // --- Sheet 2: Anomalies -------------------------------------------
  const anomaliesAOA: (string | number)[][] = [
    ['Type', 'Severity', 'Message', 'Value', 'Threshold', 'Timestamp', 'Machine'],
    ...data.anomalies.map((a) => [
      a.type,
      a.severity,
      a.message,
      Number(a.value.toFixed(2)),
      Number(a.threshold.toFixed(2)),
      new Date(a.timestamp).toISOString(),
      a.machineName,
    ]),
  ];
  const wsAnomalies = XLSX.utils.aoa_to_sheet(anomaliesAOA);
  XLSX.utils.book_append_sheet(workbook, wsAnomalies, 'Anomalies');

  // --- Sheet 3: Recommendations -------------------------------------
  const recsAOA: (string | number)[][] = [
    ['Priority', 'Action', 'Component', 'ETA', 'Description'],
    ...data.recommendations.map((r) => [
      r.priority,
      r.action,
      r.component,
      r.eta,
      r.description,
    ]),
  ];
  const wsRecs = XLSX.utils.aoa_to_sheet(recsAOA);
  XLSX.utils.book_append_sheet(workbook, wsRecs, 'Recommendations');

  // --- Sheet 4: AI Prediction --------------------------------------
  const ai = data.aiPrediction;
  const aiAOA: (string | number)[][] = [
    ['Metric', 'Value'],
    ['Bearing Wear (%)', ai ? Number((ai.bearingWear * 100).toFixed(1)) : 'N/A'],
    ['Overheat Risk (%)', ai ? Number((ai.overheatRisk * 100).toFixed(1)) : 'N/A'],
    ['Failure Risk (%)', ai ? Number((ai.failureRisk * 100).toFixed(1)) : 'N/A'],
    ['Remaining Useful Life (h)', ai ? Number(ai.rulHours.toFixed(0)) : 'N/A'],
    ['Confidence (%)', ai ? Number((ai.confidence * 100).toFixed(1)) : 'N/A'],
    ['Trend', ai ? ai.trend : 'N/A'],
    ['Last Updated', ai ? new Date(ai.lastUpdate).toISOString() : 'N/A'],
  ];
  const wsAI = XLSX.utils.aoa_to_sheet(aiAOA);
  XLSX.utils.book_append_sheet(workbook, wsAI, 'AI Prediction');

  // Write to an ArrayBuffer, then wrap in a Blob.
  const arrBuffer: ArrayBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  return new Blob([arrBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

/* ------------------------------------------------------------------ */
/*  Export: CSV                                                       */
/* ------------------------------------------------------------------ */

/** Escapes a single CSV field per RFC 4180. */
const csvEscape = (value: string | number): string => {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

/**
 * Converts the sensor readings array into a CSV blob.
 */
export const exportCSV = async (data: ExportData): Promise<Blob> => {
  const header = [
    'timestamp',
    'vibration',
    'temperature',
    'current',
    'rpm',
    'frequency',
  ];
  const lines: string[] = [header.join(',')];

  for (const r of data.readings) {
    lines.push(
      [
        new Date(r.timestamp).toISOString(),
        r.vibration.toFixed(3),
        r.temperature.toFixed(1),
        r.current.toFixed(2),
        r.rpm.toFixed(0),
        r.frequency.toFixed(2),
      ]
        .map(csvEscape)
        .join(','),
    );
  }

  // Prepend BOM so Excel detects UTF-8.
  const csv = `\uFEFF${lines.join('\r\n')}`;
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
};

/* ------------------------------------------------------------------ */
/*  Export: Screenshot                                                */
/* ------------------------------------------------------------------ */

/**
 * Captures the given DOM element as a PNG blob using html2canvas
 * at 2x device pixel ratio for crisp output.
 */
export const exportScreenshot = async (element: HTMLElement): Promise<Blob> => {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#0b0f1a',
    logging: false,
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate screenshot blob.'));
      },
      'image/png',
      1.0,
    );
  });
};

/* ------------------------------------------------------------------ */
/*  Export: Machine Report (PDF alias)                                */
/* ------------------------------------------------------------------ */

/**
 * Produces a full machine diagnostic report. Currently delegates to
 * `exportPDF` but is kept as a distinct entry point so callers can
 * request a "machine report" without coupling to the PDF format.
 */
export const exportMachineReport = async (data: ExportData): Promise<Blob> =>
  exportPDF(data);

/* ------------------------------------------------------------------ */
/*  Export: AI Report (focused PDF)                                   */
/* ------------------------------------------------------------------ */

/**
 * Builds a compact PDF focused exclusively on the AI prediction data,
 * including the machine context and a detailed risk breakdown.
 */
export const exportAIReport = async (data: ExportData): Promise<Blob> => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const { width, height } = doc.internal.pageSize;
  const usableHeight = height - 20;

  paintBackground(doc);

  let y = drawHeader(doc, data.machine, data.exportedAt || timestamp());

  // Sub-title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.accent);
  doc.text('AI Prediction Report', 14, y);
  y += 10;

  // Machine context
  y = drawSectionTitle(doc, 'Machine Context', y);
  const ctxRows: string[][] = [
    ['Name', data.machine.name],
    ['Location', data.machine.location || '—'],
    ['Status', data.machine.status.toUpperCase()],
    ['Exported By', data.exportedBy || '—'],
    ['Exported At', data.exportedAt || timestamp()],
  ];
  autoTable(doc, autoTableOpts([['Field', 'Value']], ctxRows, 9));
  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;

  // AI prediction detail
  y = drawSectionTitle(doc, 'Prediction Summary', y);
  y = drawAIPrediction(doc, data.aiPrediction, y);

  // Risk breakdown table
  if (data.aiPrediction) {
    if (y + 40 > usableHeight) {
      doc.addPage();
      paintBackground(doc);
      y = 20;
    }
    y = drawSectionTitle(doc, 'Risk Breakdown', y);
    const riskRows: string[][] = [
      ['Bearing Wear', `${(data.aiPrediction.bearingWear * 100).toFixed(1)} %`,
        data.aiPrediction.bearingWear > 0.7 ? 'High' : data.aiPrediction.bearingWear > 0.4 ? 'Medium' : 'Low'],
      ['Overheat Risk', `${(data.aiPrediction.overheatRisk * 100).toFixed(1)} %`,
        data.aiPrediction.overheatRisk > 0.7 ? 'High' : data.aiPrediction.overheatRisk > 0.4 ? 'Medium' : 'Low'],
      ['Failure Risk', `${(data.aiPrediction.failureRisk * 100).toFixed(1)} %`,
        data.aiPrediction.failureRisk > 0.7 ? 'High' : data.aiPrediction.failureRisk > 0.4 ? 'Medium' : 'Low'],
    ];
    autoTable(doc, autoTableOpts([['Metric', 'Value', 'Level']], riskRows, 9));
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
  }

  drawFooters(doc);

  return doc.output('blob');
};

/* ------------------------------------------------------------------ */
/*  Report persistence (Supabase)                                     */
/* ------------------------------------------------------------------ */

/**
 * Inserts a report record into the `reports` Supabase table.
 * Returns `true` on success, `false` on failure.
 */
export const saveReportRecord = async (params: {
  machineId: string;
  machineName: string;
  exportType: ExportType;
  fileName: string;
  fileSize: number;
  createdBy: string;
}): Promise<boolean> => {
  const { machineId, machineName, exportType, fileName, fileSize, createdBy } = params;

  const reportName = `${machineName}_${exportType.toUpperCase()}_${timestamp()}`;

  const { error } = await supabase.from('reports').insert({
    report_name: reportName,
    machine_id: machineId,
    export_type: exportType,
    created_by: createdBy,
    file_path: fileName,
    file_size: fileSize,
    metadata: {
      machineName,
      exportType,
      generatedAt: new Date().toISOString(),
    },
  });

  if (error) {
    console.error('[exportUtils] Failed to save report record:', error.message);
    return false;
  }

  return true;
};

/**
 * Deletes a report record from the `reports` Supabase table by id.
 * Returns `true` on success, `false` on failure.
 */
export const deleteReportRecord = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('reports').delete().eq('id', id);

  if (error) {
    console.error('[exportUtils] Failed to delete report record:', error.message);
    return false;
  }

  return true;
};
