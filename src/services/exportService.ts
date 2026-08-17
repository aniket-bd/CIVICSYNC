import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Project } from '../types/project';
import { formatINR, formatDate } from '../utils/formatters';

export class ExportService {
  /**
   * Export projects to CSV format
   */
  public static exportToCSV(projects: Project[], filename = 'CivicSync_Projects_Export.csv') {
    const data = projects.map(p => ({
      'Tender Number': p.tenderNumber,
      'Project Name': p.name,
      'Type': p.type,
      'Status': p.status,
      'Budget (INR)': p.budget,
      'Potential Saving (INR)': p.potentialSaving,
      'Depth (m)': p.depthMeters ?? 'N/A',
      'Length (m)': p.lengthMeters ?? 'N/A',
      'Start Date': p.startDate,
      'Expected End Date': p.expectedCompletionDate,
      'Contractor': p.contractor,
      'Department': p.department,
      'Location': p.locationName,
      'Managed By': p.managedBy,
      'Source': p.source,
      'Confidence': p.confidence,
      'Last Updated': p.lastUpdated
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export projects to XLSX Excel format
   */
  public static exportToExcel(projects: Project[], filename = 'CivicSync_Projects_Export.xlsx') {
    const rows = projects.map(p => ({
      'Tender Number': p.tenderNumber,
      'Project Name': p.name,
      'Type': p.type,
      'Status': p.status,
      'Budget (₹)': p.budget,
      'Potential Saving (₹)': p.potentialSaving,
      'Depth (m)': p.depthMeters ?? 'N/A',
      'Length (m)': p.lengthMeters ?? 'N/A',
      'Start Date': p.startDate,
      'Expected End Date': p.expectedCompletionDate,
      'Contractor': p.contractor,
      'Department': p.department,
      'Location': p.locationName,
      'Ward': p.wardOrRegion,
      'Managed By': p.managedBy,
      'Source': p.source,
      'Data Confidence': p.confidence,
      'Last Updated': p.lastUpdated
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CivicSync Infrastructure');
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Export CivicSync Branded PDF Report
   */
  public static exportToPDF(projects: Project[], reportTitle = 'Municipal Infrastructure Projects Summary') {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // 1. Header with CivicSync Branding
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 297, 26, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('CIVICSYNC — MUNICIPAL INFRASTRUCTURE COORDINATION PLATFORM', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`Report: ${reportTitle}  |  Generated: ${new Date().toLocaleString('en-GB')}  |  Scope: Active Database (${projects.length} Records)`, 14, 20);

    // 2. Summary Metric Cards
    const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
    const totalSavings = projects.reduce((acc, p) => acc + p.potentialSaving, 0);
    const activeCount = projects.filter(p => p.status === 'Active').length;
    const delayedCount = projects.filter(p => p.status === 'Delayed').length;

    doc.setFillColor(241, 245, 249); // Slate 100
    doc.roundedRect(14, 30, 269, 16, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total Capital Value: ${formatINR(totalBudget)}`, 20, 40);
    doc.text(`Potential Coordination Savings: ${formatINR(totalSavings)}`, 95, 40);
    doc.text(`Active Projects: ${activeCount}`, 190, 40);
    doc.text(`Delayed / Conflict: ${delayedCount}`, 235, 40);

    // 3. Projects Table
    const tableData = projects.map(p => [
      p.tenderNumber,
      p.name.length > 35 ? p.name.slice(0, 32) + '...' : p.name,
      p.type,
      p.status,
      formatINR(p.budget),
      p.depthMeters ? `${p.depthMeters}m` : '-',
      formatDate(p.startDate),
      formatDate(p.expectedCompletionDate),
      p.contractor.length > 20 ? p.contractor.slice(0, 18) + '...' : p.contractor,
      p.managedBy
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Tender No.', 'Project Name', 'Type', 'Status', 'Budget', 'Depth', 'Start', 'Completion', 'Contractor', 'Managed']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    // 4. Mandatory Disclaimer (Master Prompt Requirement)
    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    const footerY = Math.min(195, Math.max(finalY + 10, 185));

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'DISCLAIMER: This document is generated by CivicSync Platform for infrastructure planning and inter-departmental spatial coordination.',
      14,
      footerY
    );
    doc.text(
      'It is NOT an official government gazette, tender award sanction, or statutory traffic order. Verify engineering values against source tender files.',
      14,
      footerY + 4
    );

    doc.save('CivicSync_Municipal_Projects_Report.pdf');
  }
}
