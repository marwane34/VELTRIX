import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { supabase } from './supabase';
import type { Machine, AIAnalysis, Alert } from '../types';
import type { VibrationPoint, FreqBar, TrendPoint } from '../hooks/useSimulatedData';
import type { ExportType } from '../types';

export interface ExportData {
  machine: Machine;
  aiAnalysis: AIAnalysis | null;
  alerts: Alert[];
  vibration: VibrationPoint[];
  freqBars: FreqBar[];
  tempTrend: TrendPoint[];
  currentTrend: TrendPoint[];
  healthTrend: TrendPoint[];
  temperature: number;
  currentVal: number;
  rmsX: number;
  rmsY: number;
  rpm: number;
  voltage: number;
  operator: string;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function dateDisplay(): string {
  return new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/* ---- SVG chart rendering for PDF ---- */

function renderVibrationChartSVG(data: VibrationPoint[], w: number, h: number): string {
  if (data.length < 2) return `<text x="${w / 2}" y="${h / 2}" fill="#64748b" font-size="10" text-anchor="middle">No data</text>`;
  const maxVal = Math.max(...data.map(d => Math.max(Math.abs(d.x), Math.abs(d.y))), 1);
  const scaleY = (h - 30) / (maxVal * 2);
  const midY = (h - 20) / 2 + 10;
  const stepX = (w - 40) / Math.max(data.length - 1, 1);
  let pathX = '', pathY = '';
  data.forEach((d, i) => {
    const x = 20 + i * stepX;
    if (i === 0) { pathX = `M${x},${midY - d.x * scaleY}`; pathY = `M${x},${midY - d.y * scaleY}`; }
    else { pathX += ` L${x},${midY - d.x * scaleY}`; pathY += ` L${x},${midY - d.y * scaleY}`; }
  });
  let grid = '';
  for (let i = 0; i <= 4; i++) { const y = 10 + (i * (h - 20) / 4); grid += `<line x1="20" y1="${y}" x2="${w - 20}" y2="${y}" stroke="#e0e0e0" stroke-width="0.5" stroke-dasharray="3,3"/>`; }
  return `${grid}<line x1="20" y1="${midY}" x2="${w - 20}" y2="${midY}" stroke="#ccc" stroke-width="0.5"/><path d="${pathX}" fill="none" stroke="#2563eb" stroke-width="1.5"/><path d="${pathY}" fill="none" stroke="#0891b2" stroke-width="1.5"/>`;
}

function renderFreqChartSVG(data: FreqBar[], w: number, h: number): string {
  if (data.length === 0) return `<text x="${w / 2}" y="${h / 2}" fill="#64748b" font-size="10" text-anchor="middle">No data</text>`;
  const maxAmp = Math.max(...data.map(d => d.amp), 0.01);
  const barW = (w - 40) / data.length;
  let bars = '';
  data.forEach((d, i) => {
    const barH = (d.amp / maxAmp) * (h - 30);
    bars += `<rect x="${20 + i * barW}" y="${h - 15 - barH}" width="${Math.max(barW - 1, 1)}" height="${barH}" fill="#2563eb" opacity="0.8"/>`;
  });
  return bars;
}

function renderTrendChartSVG(data: TrendPoint[], w: number, h: number, color: string): string {
  if (data.length < 2) return `<text x="${w / 2}" y="${h / 2}" fill="#64748b" font-size="10" text-anchor="middle">No data</text>`;
  const vals = data.map(d => d.v);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const scaleY = (h - 30) / range;
  const stepX = (w - 40) / Math.max(data.length - 1, 1);
  let path = ''; let areaPath = '';
  data.forEach((d, i) => {
    const x = 20 + i * stepX;
    const y = h - 15 - (d.v - minV) * scaleY;
    if (i === 0) { path = `M${x},${y}`; areaPath = `M${x},${h - 15} L${x},${y}`; }
    else { path += ` L${x},${y}`; areaPath += ` L${x},${y}`; }
    if (i === data.length - 1) areaPath += ` L${x},${h - 15} Z`;
  });
  let grid = '';
  for (let i = 0; i <= 4; i++) { const y = 10 + (i * (h - 20) / 4); grid += `<line x1="20" y1="${y}" x2="${w - 20}" y2="${y}" stroke="#e0e0e0" stroke-width="0.5" stroke-dasharray="3,3"/>`; }
  const gradId = `grad_${color.replace('#', '')}`;
  return `${grid}<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0.02"/></linearGradient></defs><path d="${areaPath}" fill="url(#${gradId})"/><path d="${path}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
}

function svgToCanvas(svg: string, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w * 2; canvas.height = h * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  const img = new Image();
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#0d1117"/>${svg}</svg>`;
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  return canvas;
}

function svgToCanvasAsync(svg: string, w: number, h: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = w * 2; canvas.height = h * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);
    const img = new Image();
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#0d1117"/>${svg}</svg>`;
    img.onload = () => { ctx.drawImage(img, 0, 0, w, h); resolve(canvas); };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  });
}

/* ---- PDF Export ---- */

export async function exportPDF(data: ExportData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, pageH = 297, margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ---- Header: Logo + Title ----
  doc.setFillColor(13, 21, 37);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('VELTRIX', margin, 14);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Predictive Maintenance SCADA System', margin, 20);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Machine Report', pageW - margin, 14, { align: 'right' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(dateDisplay(), pageW - margin, 20, { align: 'right' });
  y = 34;

  // ---- Machine Info Section ----
  doc.setDrawColor(30, 45, 69); doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y); y += 5;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Machine Information', margin, y); y += 6;

  const infoRows: [string, string][] = [
    ['Machine Name', data.machine.name],
    ['Machine ID', data.machine.id],
    ['Operator', data.operator],
    ['Location', data.machine.location || 'N/A'],
    ['Description', data.machine.description || 'N/A'],
    ['Status', data.machine.status.toUpperCase()],
    ['Report Generated', dateDisplay()],
  ];
  autoTable(doc, {
    startY: y, head: [['Field', 'Value']],
    body: infoRows, theme: 'striped',
    headFillColor: [30, 45, 69], headTextColor: [255, 255, 255],
    headFontSize: 9, bodyFontSize: 9,
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ---- Sensor Readings Section ----
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Current Sensor Readings', margin, y); y += 4;

  const sensorRows: [string, string, string][] = [
    ['Temperature', `${data.temperature.toFixed(1)} °C`, data.temperature > data.machine.temp_max * 0.85 ? 'WARNING' : 'NORMAL'],
    ['Current', `${data.currentVal.toFixed(2)} A`, data.currentVal > data.machine.current_max * 0.85 ? 'WARNING' : 'NORMAL'],
    ['Voltage', `${data.voltage.toFixed(0)} V`, 'NORMAL'],
    ['RPM', `${data.rpm}`, 'NORMAL'],
    ['Vibration RMS X', `${data.rmsX.toFixed(3)} g`, data.rmsX > data.machine.rms_max * 0.8 ? 'WARNING' : 'NORMAL'],
    ['Vibration RMS Y', `${data.rmsY.toFixed(3)} g`, data.rmsY > data.machine.rms_max * 0.8 ? 'WARNING' : 'NORMAL'],
    ['Frequency', `${data.freqBars.length > 0 ? Math.max(...data.freqBars.map(f => f.freq)) : 0} Hz`, 'NORMAL'],
  ];
  autoTable(doc, {
    startY: y, head: [['Parameter', 'Value', 'Status']],
    body: sensorRows, theme: 'striped',
    headFillColor: [30, 45, 69], headTextColor: [255, 255, 255],
    headFontSize: 9, bodyFontSize: 9,
    margin: { left: margin, right: margin },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 2) {
        if (hookData.cell.text[0] === 'WARNING') { hookData.cell.styles.textColor = [220, 38, 38]; hookData.cell.styles.fontStyle = 'bold'; }
        else { hookData.cell.styles.textColor = [22, 163, 74]; }
      }
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ---- AI Prediction Section ----
  if (data.aiAnalysis) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('AI Prediction Analysis', margin, y); y += 4;
    const aiRows: [string, string][] = [
      ['Health Score', `${data.aiAnalysis.healthScore} / 100`],
      ['Bearing Wear', `${data.aiAnalysis.bearingWear} %`],
      ['Failure Probability', `${data.aiAnalysis.failureRisk} %`],
      ['Overheat Risk', `${data.aiAnalysis.overheatRisk} %`],
      ['Remaining Useful Life (RUL)', `${data.aiAnalysis.rulHours} hours`],
      ['AI Status', data.aiAnalysis.status.toUpperCase()],
    ];
    autoTable(doc, {
      startY: y, head: [['Metric', 'Value']],
      body: aiRows, theme: 'striped',
      headFillColor: [30, 45, 69], headTextColor: [255, 255, 255],
      headFontSize: 9, bodyFontSize: 9,
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    // Active Alerts
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Active Alerts', margin, y); y += 4;
    if (data.aiAnalysis.anomalies.length > 0) {
      autoTable(doc, {
        startY: y, head: [['#', 'Anomaly']],
        body: data.aiAnalysis.anomalies.map((a, i) => [String(i + 1), a]),
        theme: 'striped', headFillColor: [127, 29, 29], headTextColor: [255, 255, 255],
        headFontSize: 9, bodyFontSize: 9,
        margin: { left: margin, right: margin },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
    } else {
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.setTextColor(22, 163, 74);
      doc.text('No active anomalies detected.', margin, y); y += 6;
    }

    // Recommendations
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('AI Recommendations', margin, y); y += 5;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const recLines = doc.splitTextToSize(data.aiAnalysis.recommendation, contentW);
    doc.text(recLines, margin, y); y += recLines.length * 5 + 6;
  }

  // ---- Charts Section ----
  if (y > pageH - 100) { doc.addPage(); y = margin; }
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Charts', margin, y); y += 5;

  const chartW = contentW / 2 - 3;
  const chartH = 50;
  const charts: { title: string; svg: string }[] = [
    { title: 'Vibration Waveform', svg: renderVibrationChartSVG(data.vibration, chartW * 2, chartH * 2) },
    { title: 'Frequency Spectrum', svg: renderFreqChartSVG(data.freqBars, chartW * 2, chartH * 2) },
    { title: 'Temperature Trend', svg: renderTrendChartSVG(data.tempTrend, chartW * 2, chartH * 2, '#f97316') },
    { title: 'Current Trend', svg: renderTrendChartSVG(data.currentTrend, chartW * 2, chartH * 2, '#eab308') },
    { title: 'Health Score Trend', svg: renderTrendChartSVG(data.healthTrend, chartW * 2, chartH * 2, '#22c55e') },
  ];

  for (let i = 0; i < charts.length; i++) {
    if (i % 2 === 0 && i > 0) { y += chartH + 14; }
    if (y > pageH - chartH - 20) { doc.addPage(); y = margin; }
    const col = i % 2;
    const xChart = margin + col * (chartW + 6);
    const yChart = y + (Math.floor(i / 2) * (chartH + 14));
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(charts[i].title, xChart, yChart);
    const canvas = await svgToCanvasAsync(charts[i].svg, chartW * 2, chartH * 2);
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', xChart, yChart + 2, chartW, chartH);
  }
  y += chartH * 3 + 20;

  // ---- Page numbers + footer on all pages ----
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(30, 45, 69); doc.setLineWidth(0.3);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('VELTRIX Predictive Maintenance SCADA System', margin, pageH - 7);
    doc.text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 7, { align: 'right' });
  }

  return doc.output('blob');
}

/* ---- Excel Export ---- */

export async function exportExcel(data: ExportData): Promise<Blob> {
  const wb = XLSX.utils.book_new();

  // Machine Info sheet
  const machineInfo = [
    ['VELTRIX Predictive Maintenance SCADA System'],
    ['Machine Report — ' + dateDisplay()],
    [''],
    ['Field', 'Value'],
    ['Machine Name', data.machine.name],
    ['Machine ID', data.machine.id],
    ['Operator', data.operator],
    ['Location', data.machine.location || 'N/A'],
    ['Description', data.machine.description || 'N/A'],
    ['Status', data.machine.status.toUpperCase()],
    [''],
    ['Parameter', 'Value', 'Unit', 'Status'],
    ['Temperature', data.temperature.toFixed(1), '°C', data.temperature > data.machine.temp_max * 0.85 ? 'WARNING' : 'NORMAL'],
    ['Current', data.currentVal.toFixed(2), 'A', data.currentVal > data.machine.current_max * 0.85 ? 'WARNING' : 'NORMAL'],
    ['Voltage', data.voltage.toFixed(0), 'V', 'NORMAL'],
    ['RPM', data.rpm, '', 'NORMAL'],
    ['Vibration RMS X', data.rmsX.toFixed(3), 'g', data.rmsX > data.machine.rms_max * 0.8 ? 'WARNING' : 'NORMAL'],
    ['Vibration RMS Y', data.rmsY.toFixed(3), 'g', data.rmsY > data.machine.rms_max * 0.8 ? 'WARNING' : 'NORMAL'],
  ];
  if (data.aiAnalysis) {
    machineInfo.push([''], ['AI Prediction', '']);
    machineInfo.push(['Health Score', `${data.aiAnalysis.healthScore} / 100`]);
    machineInfo.push(['Bearing Wear', `${data.aiAnalysis.bearingWear} %`]);
    machineInfo.push(['Failure Probability', `${data.aiAnalysis.failureRisk} %`]);
    machineInfo.push(['Remaining Useful Life', `${data.aiAnalysis.rulHours} hours`]);
    machineInfo.push(['AI Recommendation', data.aiAnalysis.recommendation]);
  }
  const ws1 = XLSX.utils.aoa_to_sheet(machineInfo);
  ws1['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Machine Info');

  // Vibration Data sheet
  const vibData = [['Timestamp', 'X', 'Y']];
  data.vibration.slice(-100).forEach(v => vibData.push([String(v.t), v.x.toFixed(4), v.y.toFixed(4)]));
  const ws2 = XLSX.utils.aoa_to_sheet(vibData);
  ws2['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Vibration Data');

  // Frequency Data sheet
  const freqData = [['Frequency (Hz)', 'Amplitude']];
  data.freqBars.forEach(f => freqData.push([f.freq, f.amp.toFixed(4)]));
  const ws3 = XLSX.utils.aoa_to_sheet(freqData);
  ws3['!cols'] = [{ wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Frequency Spectrum');

  // Temperature Trend sheet
  const tempData = [['Sample', 'Temperature (°C)']];
  data.tempTrend.forEach(t => tempData.push([String(t.t), t.v.toFixed(2)]));
  const ws4 = XLSX.utils.aoa_to_sheet(tempData);
  ws4['!cols'] = [{ wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'Temperature Trend');

  // Current Trend sheet
  const currData = [['Sample', 'Current (A)']];
  data.currentTrend.forEach(t => currData.push([String(t.t), t.v.toFixed(2)]));
  const ws5 = XLSX.utils.aoa_to_sheet(currData);
  ws5['!cols'] = [{ wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws5, 'Current Trend');

  // Alerts sheet
  const alertData = [['Type', 'Severity', 'Message', 'Date', 'Read']];
  data.alerts.forEach(a => alertData.push([a.type, a.severity, a.message, new Date(a.created_at).toLocaleString(), a.is_read ? 'Yes' : 'No']));
  const ws6 = XLSX.utils.aoa_to_sheet(alertData);
  ws6['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws6, 'Alerts');

  // Health Trend sheet
  const healthData = [['Sample', 'Health Score']];
  data.healthTrend.forEach(t => healthData.push([String(t.t), t.v.toFixed(2)]));
  const ws7 = XLSX.utils.aoa_to_sheet(healthData);
  ws7['!cols'] = [{ wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws7, 'Health Trend');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/* ---- CSV Export ---- */

export async function exportCSV(data: ExportData): Promise<Blob> {
  const lines: string[] = [];
  lines.push('VELTRIX Predictive Maintenance — Raw Sensor Data Export');
  lines.push(`Machine,${data.machine.name}`);
  lines.push(`Machine ID,${data.machine.id}`);
  lines.push(`Operator,${data.operator}`);
  lines.push(`Export Time,${dateDisplay()}`);
  lines.push('');
  lines.push('Sample,Temperature (°C),Vibration RMS X (g),Vibration RMS Y (g),Current (A),RPM,Voltage (V),Health Score, Bearing Wear (%),Failure Risk (%)');
  const maxLen = Math.max(data.tempTrend.length, data.currentTrend.length, data.healthTrend.length, 1);
  for (let i = 0; i < maxLen; i++) {
    const t = data.tempTrend[i]?.v ?? '';
    const c = data.currentTrend[i]?.v ?? '';
    const h = data.healthTrend[i]?.v ?? '';
    lines.push(`${i},${t},${data.rmsX},${data.rmsY},${c},${data.rpm},${data.voltage},${h},${data.aiAnalysis?.bearingWear ?? ''},${data.aiAnalysis?.failureRisk ?? ''}`);
  }
  lines.push('');
  lines.push('Frequency Spectrum');
  lines.push('Frequency (Hz),Amplitude');
  data.freqBars.forEach(f => lines.push(`${f.freq},${f.amp}`));
  lines.push('');
  lines.push('Recent Alerts');
  lines.push('Type,Severity,Message,Date,Read');
  data.alerts.forEach(a => lines.push(`${a.type},${a.severity},"${a.message.replace(/"/g, '""')}",${new Date(a.created_at).toLocaleString()},${a.is_read ? 'Yes' : 'No'}`));
  return new Blob([lines.join('\n')], { type: 'text/csv' });
}

/* ---- Dashboard Screenshot ---- */

export async function exportScreenshot(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0b0f1a',
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true,
  });
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'));
}

/* ---- Machine Report (PDF, more detailed) ---- */

export async function exportMachineReport(data: ExportData): Promise<Blob> {
  return exportPDF(data);
}

/* ---- AI Prediction Report (PDF, AI-focused) ---- */

export async function exportAIReport(data: ExportData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, pageH = 297, margin = 15;
  let y = margin;

  doc.setFillColor(13, 21, 37);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('VELTRIX', margin, 14);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Predictive Maintenance SCADA System', margin, 20);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('AI Prediction Report', pageW - margin, 14, { align: 'right' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(dateDisplay(), pageW - margin, 20, { align: 'right' });
  y = 34;

  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Machine: ${data.machine.name}`, margin, y); y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`ID: ${data.machine.id}  |  Operator: ${data.operator}`, margin, y); y += 8;

  if (data.aiAnalysis) {
    const aiRows: [string, string][] = [
      ['Health Score', `${data.aiAnalysis.healthScore} / 100`],
      ['AI Status', data.aiAnalysis.status.toUpperCase()],
      ['Bearing Wear', `${data.aiAnalysis.bearingWear} %`],
      ['Overheat Risk', `${data.aiAnalysis.overheatRisk} %`],
      ['Failure Probability', `${data.aiAnalysis.failureRisk} %`],
      ['Remaining Useful Life (RUL)', `${data.aiAnalysis.rulHours} hours`],
    ];
    autoTable(doc, {
      startY: y, head: [['AI Metric', 'Value']],
      body: aiRows, theme: 'striped',
      headFillColor: [30, 45, 69], headTextColor: [255, 255, 255],
      headFontSize: 9, bodyFontSize: 9,
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    // Anomalies
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Detected Anomalies', margin, y); y += 4;
    if (data.aiAnalysis.anomalies.length > 0) {
      autoTable(doc, {
        startY: y, head: [['#', 'Anomaly Description']],
        body: data.aiAnalysis.anomalies.map((a, i) => [String(i + 1), a]),
        theme: 'striped', headFillColor: [127, 29, 29], headTextColor: [255, 255, 255],
        headFontSize: 9, bodyFontSize: 9,
        margin: { left: margin, right: margin },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    } else {
      doc.setFontSize(9); doc.setTextColor(22, 163, 74);
      doc.text('No anomalies detected.', margin, y); y += 6;
    }

    // Recommendations
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('AI Recommendations', margin, y); y += 5;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const recLines = doc.splitTextToSize(data.aiAnalysis.recommendation, pageW - margin * 2);
    doc.text(recLines, margin, y); y += recLines.length * 5 + 8;

    // Health trend chart
    if (y > pageH - 80) { doc.addPage(); y = margin; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Health Score Trend', margin, y); y += 3;
    const chartW = pageW - margin * 2, chartH = 60;
    const canvas = await svgToCanvasAsync(renderTrendChartSVG(data.healthTrend, chartW * 2, chartH * 2, '#22c55e'), chartW * 2, chartH * 2);
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, y, chartW, chartH);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(30, 45, 69); doc.setLineWidth(0.3);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('VELTRIX Predictive Maintenance SCADA System', margin, pageH - 7);
    doc.text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 7, { align: 'right' });
  }

  return doc.output('blob');
}

/* ---- Download helper ---- */

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---- Report DB persistence ---- */

export async function saveReportRecord(params: {
  reportName: string; machineId: string | null; exportType: ExportType;
  createdBy: string; filePath: string; fileSize: number; metadata?: Record<string, unknown>;
}): Promise<void> {
  await supabase.from('reports').insert({
    report_name: params.reportName, machine_id: params.machineId,
    export_type: params.exportType, created_by: params.createdBy,
    file_path: params.filePath, file_size: params.fileSize,
    metadata: params.metadata ?? {},
  });
}

export async function deleteReportRecord(id: string): Promise<void> {
  await supabase.from('reports').delete().eq('id', id);
}

export { timestamp, sanitizeFilename };
